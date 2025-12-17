import { Game, GameState } from "../../../types/types";
import db from "../connection";
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
} from "./sql";

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

const create = async (user_id: number, name?: string, maxPlayers: number = 4) =>
  await db.one<Game>(CREATE_GAME, [user_id, name, maxPlayers]);

const join = async (game_id: number, user_id: number) =>
  await db.none(JOIN_GAME, [game_id, user_id]);

const leave = async (game_id: number, user_id: number) =>
  await db.none(LEAVE_GAME, [game_id, user_id]);

const list = async (state: GameState = GameState.LOBBY, limit: number = 50) =>
  await db.manyOrNone<Game>(LIST_GAMES, [state, limit]);

const getByUser = async (user_id: number) => await db.manyOrNone<Game>(GAMES_BY_USER, [user_id]);

const get = async (game_id: number) => await db.one<Game>(GAME_BY_ID, [game_id]);

const getPlayerIds = async (gameId: number): Promise<number[]> => {
  const rows = await db.manyOrNone<{ user_id: number }>(GET_PLAYER_IDS, [gameId]);
  return rows.map((r) => r.user_id);
};

// Get players with stats for game page display
const getPlayersWithStats = async (gameId: number): Promise<PlayerWithStats[]> => {
  return await db.manyOrNone<PlayerWithStats>(GET_PLAYERS_WITH_STATS, [gameId]);
};

// Turn management methods
const setCurrentTurn = async (gameId: number, userId: number) =>
  await db.one<Game>(SET_CURRENT_TURN, [gameId, userId]);

const getCurrentTurn = async (gameId: number): Promise<number | null> => {
  const result = await db.oneOrNone<{ current_turn_user_id: number }>(
    GET_CURRENT_TURN,
    [gameId]
  );
  return result?.current_turn_user_id ?? null;
};

const setPlayerPosition = async (gameId: number, userId: number, position: number) =>
  await db.none(SET_PLAYER_POSITION, [gameId, userId, position]);

const getPlayerPosition = async (gameId: number, userId: number): Promise<number | null> => {
  const result = await db.oneOrNone<{ position: number }>(
    GET_PLAYER_POSITION,
    [gameId, userId]
  );
  return result?.position ?? null;
};

const advanceTurn = async (gameId: number): Promise<number> => {
  const currentTurn = await getCurrentTurn(gameId);
  if (currentTurn === null) {
    throw new Error("No current turn set");
  }

  // Get current player's position
  const currentPosition = await getPlayerPosition(gameId, currentTurn);
  if (currentPosition === null) {
    throw new Error("Current turn player has no position");
  }

  // Try to get next player
  let nextPlayer = await db.oneOrNone<{ user_id: number }>(
    GET_NEXT_PLAYER,
    [gameId, currentPosition]
  );

  // If no next player, wrap to first
  if (nextPlayer === null) {
    nextPlayer = await db.one<{ user_id: number }>(GET_FIRST_PLAYER, [gameId]);
  }

  await setCurrentTurn(gameId, nextPlayer.user_id);
  return nextPlayer.user_id;
};

// Start game method
const start = async (gameId: number, firstPlayerId: number) =>
  await db.one<Game>(START_GAME, [gameId, firstPlayerId]);

// End game method - transitions to game-over state
const endGame = async (gameId: number) =>
  await db.one<Game>(END_GAME, [gameId]);

export {
  advanceTurn,
  create,
  endGame,
  get,
  getByUser,
  getCurrentTurn,
  getPlayerIds,
  getPlayerPosition,
  getPlayersWithStats,
  join,
  leave,
  list,
  setCurrentTurn,
  setPlayerPosition,
  start,
};
