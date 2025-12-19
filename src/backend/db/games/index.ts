import { Game, GameState } from "../../../types/types";
import db from "../connection";
import * as sql from "./sql";
import {
  CREATE_GAME,
  END_GAME,
  GAME_BY_ID,
  GAMES_BY_USER,
  GET_CURRENT_TURN,
  GET_FIRST_PLAYER,
  GET_NEXT_PLAYER,
  GET_PLAYER_IDS,
  GET_PLAYER_POSITION,
  GET_PLAYERS_WITH_STATS,
  JOIN_GAME,
  LEAVE_GAME,
  LIST_GAMES,
  SET_CURRENT_TURN,
  SET_PLAYER_POSITION,
  START_GAME,
  UPDATE_PLAYER_CHIPS,
  UPDATE_PLAYER_BET,
  UPDATE_POT,
  GET_CURRENT_BET,
  GET_PLAYER_BET,
  CHECK_ALL_BETS_EQUAL,
  RESET_BETS,
} from "./sql";

export type DbClient = Pick<typeof db, "none" | "one" | "oneOrNone" | "manyOrNone">;

// Type for player data with stats (used on game page)
export type PlayerWithStats = {
  user_id: number;
  username: string;
  email: string;
  position: number | null;
  chip_count: number;
  current_bet: number;
  role: string; // 'dealer', 'small_blind', 'big_blind', 'player'
};

export async function updateGameState(gameId: number, state: string, dbClient: DbClient = db) {
  await dbClient.none(sql.UPDATE_GAME_STATE, [gameId, state]);
}

const create = async (user_id: number, name?: string, maxPlayers: number = 4, dbClient: DbClient = db) =>
  await dbClient.one<Game>(CREATE_GAME, [user_id, name, maxPlayers]);

const join = async (game_id: number, user_id: number, dbClient: DbClient = db) =>
  await dbClient.none(JOIN_GAME, [game_id, user_id]);

const leave = async (game_id: number, user_id: number, dbClient: DbClient = db) =>
  await dbClient.none(LEAVE_GAME, [game_id, user_id]);

const list = async (state: GameState = GameState.LOBBY, limit: number = 50, dbClient: DbClient = db) =>
  await dbClient.manyOrNone<Game>(LIST_GAMES, [state, limit]);

const getByUser = async (user_id: number, dbClient: DbClient = db) =>
  await dbClient.manyOrNone<Game>(GAMES_BY_USER, [user_id]);

const get = async (game_id: number, dbClient: DbClient = db) =>
  await dbClient.one<Game>(GAME_BY_ID, [game_id]);

const getPlayerIds = async (gameId: number, dbClient: DbClient = db): Promise<number[]> => {
  const rows = await dbClient.manyOrNone<{ user_id: number }>(GET_PLAYER_IDS, [gameId]);
  return rows.map((r) => r.user_id);
};

// Get players with stats for game page display
const getPlayersWithStats = async (gameId: number, dbClient: DbClient = db): Promise<PlayerWithStats[]> => {
  return await dbClient.manyOrNone<PlayerWithStats>(GET_PLAYERS_WITH_STATS, [gameId]);
};

// Turn management methods
const setCurrentTurn = async (gameId: number, userId: number, dbClient: DbClient = db) =>
  await dbClient.one<Game>(SET_CURRENT_TURN, [gameId, userId]);

const getCurrentTurn = async (gameId: number, dbClient: DbClient = db): Promise<number | null> => {
  const result = await dbClient.oneOrNone<{ current_turn_user_id: number }>(
    GET_CURRENT_TURN,
    [gameId]
  );
  return result?.current_turn_user_id ?? null;
};

const setPlayerPosition = async (gameId: number, userId: number, position: number, dbClient: DbClient = db) =>
  await dbClient.none(SET_PLAYER_POSITION, [gameId, userId, position]);

const getPlayerPosition = async (gameId: number, userId: number, dbClient: DbClient = db): Promise<number | null> => {
  const result = await dbClient.oneOrNone<{ position: number }>(
    GET_PLAYER_POSITION,
    [gameId, userId]
  );
  return result?.position ?? null;
};

// Advance turn to next active (non-folded) player
// Skips folded players automatically via SQL (bet_amount >= 0)
const advanceTurn = async (gameId: number, dbClient: DbClient = db): Promise<number> => {
  const currentTurn = await getCurrentTurn(gameId, dbClient);
  if (currentTurn === null) {
    throw new Error("No current turn set");
  }

  // Get current player's position
  const currentPosition = await getPlayerPosition(gameId, currentTurn, dbClient);
  if (currentPosition === null) {
    throw new Error("Current turn player has no position");
  }

  // Try to get next active (non-folded) player
  let nextPlayer = await dbClient.oneOrNone<{ user_id: number }>(
    GET_NEXT_PLAYER,
    [gameId, currentPosition]
  );

  // If no next player found, wrap to first active player
  if (nextPlayer === null) {
    nextPlayer = await dbClient.oneOrNone<{ user_id: number }>(GET_FIRST_PLAYER, [gameId]);

    // If still no player found, everyone else has folded
    if (nextPlayer === null) {
      // Return current player as winner (they're the only one left)
      return currentTurn;
    }
  }

  await setCurrentTurn(gameId, nextPlayer.user_id, dbClient);
  return nextPlayer.user_id;
};

// Start game method
const start = async (gameId: number, firstPlayerId: number, dbClient: DbClient = db) =>
  await dbClient.one<Game>(START_GAME, [gameId, firstPlayerId]);

// End game method - transitions to game-over state
const endGame = async (gameId: number, dbClient: DbClient = db) =>
  await dbClient.one<Game>(END_GAME, [gameId]);

// ==================== BETTING FUNCTIONS ====================

// Deduct chips from a player (for betting/calling)
const deductChips = async (
  gameId: number,
  userId: number,
  amount: number,
  dbClient: DbClient = db
): Promise<number> => {
  const result = await dbClient.one<{ player_money: number }>(UPDATE_PLAYER_CHIPS, [
    gameId,
    userId,
    -amount,
  ]);
  return result.player_money;
};

// Add chips to a player (for winning pot)
const addChips = async (
  gameId: number,
  userId: number,
  amount: number,
  dbClient: DbClient = db
): Promise<number> => {
  const result = await dbClient.one<{ player_money: number }>(UPDATE_PLAYER_CHIPS, [
    gameId,
    userId,
    amount,
  ]);
  return result.player_money;
};

// Update a player's current bet amount
const updatePlayerBet = async (gameId: number, userId: number, amount: number, dbClient: DbClient = db) =>
  await dbClient.one(UPDATE_PLAYER_BET, [gameId, userId, amount]);

// Add chips to the pot
const addToPot = async (gameId: number, amount: number, dbClient: DbClient = db): Promise<number> => {
  const result = await dbClient.one<{ pot_money: number }>(UPDATE_POT, [gameId, amount]);
  return result.pot_money;
};

// Get the current highest bet in the round
const getCurrentBet = async (gameId: number, dbClient: DbClient = db): Promise<number> => {
  const result = await dbClient.oneOrNone<{ max: number }>(GET_CURRENT_BET, [gameId]);
  return result?.max ?? 0;
};

// Get a specific player's current bet
const getPlayerBet = async (gameId: number, userId: number, dbClient: DbClient = db): Promise<number> => {
  const result = await dbClient.oneOrNone<{ bet_amount: number }>(GET_PLAYER_BET, [gameId, userId]);
  return result?.bet_amount ?? 0;
};

// Check if all active players have equal bets (betting round complete)
// Active players are those with bet_amount >= 0 (not folded)
const areAllBetsEqual = async (gameId: number, dbClient: DbClient = db): Promise<boolean> => {
  // Count distinct bet amounts among active (non-folded) players
  const result = await dbClient.one<{ count: string }>(`
    SELECT COUNT(DISTINCT bet_amount) as count 
    FROM game_players 
    WHERE game_id = $1 AND bet_amount >= 0
  `, [gameId]);
  // If only 1 distinct bet amount, all bets are equal
  return parseInt(result.count) <= 1;
};

// Reset all player bets to 0 for a new betting round
const resetBets = async (gameId: number, dbClient: DbClient = db) =>
  await dbClient.none(RESET_BETS, [gameId]);

export {
  addChips,
  addToPot,
  advanceTurn,
  areAllBetsEqual,
  create,
  deductChips,
  endGame,
  get,
  getByUser,
  getCurrentBet,
  getCurrentTurn,
  getPlayerBet,
  getPlayerIds,
  getPlayerPosition,
  getPlayersWithStats,
  join,
  leave,
  list,
  resetBets,
  setCurrentTurn,
  setPlayerPosition,
  start,
  updatePlayerBet,
};
