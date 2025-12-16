import { Game, GameState } from "../../../types/types";
import db from "../connection";
import { CREATE_GAME, GAME_BY_ID, GAMES_BY_USER, GET_PLAYER_IDS, JOIN_GAME, LIST_GAMES } from "./sql";

const create = async (user_id: number, name?: string, maxPlayers: number = 4) =>
  await db.one<Game>(CREATE_GAME, [user_id, name, maxPlayers]);

const join = async (game_id: number, user_id: number) =>
  await db.none(JOIN_GAME, [game_id, user_id]);

const list = async (state: GameState = GameState.LOBBY, limit: number = 50) =>
  await db.manyOrNone<Game>(LIST_GAMES, [state, limit]);

const getByUser = async (user_id: number) => await db.manyOrNone<Game>(GAMES_BY_USER, [user_id]);

const get = async (game_id: number) => await db.one<Game>(GAME_BY_ID, [game_id]);

const getPlayerIds = async (gameId: number): Promise<number[]> => {
  const rows = await db.manyOrNone<{ user_id: number }>(GET_PLAYER_IDS, [gameId]);
  return rows.map((r) => r.user_id);
};

export { create, get, getByUser, getPlayerIds, join, list };
