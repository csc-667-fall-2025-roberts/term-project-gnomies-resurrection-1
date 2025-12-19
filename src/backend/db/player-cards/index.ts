import db from "../connection";
import {
  CREATE_DECK,
  DEAL_CARDS,
  GET_PLAYER_CARDS,
  GET_CARDS_FROM_DECK,
  COUNT_DECK_CARDS,
} from "./sql";

type DbClient = Pick<typeof db, "none" | "one" | "manyOrNone">;

// Create a shuffled deck for a game
export const createDeck = async (gameId: number, dbClient: DbClient = db) =>
  await dbClient.none(CREATE_DECK, [gameId]);

// Get N cards from the top of the deck
export const getCardsFromDeck = async (gameId: number, count: number, dbClient: DbClient = db) =>
  await dbClient.manyOrNone<{ id: number; card_id: number }>(GET_CARDS_FROM_DECK, [gameId, count]);

// Assign cards to a player
export const dealCards = async (cardIds: number[], playerId: number, dbClient: DbClient = db) =>
  await dbClient.none(DEAL_CARDS, [cardIds, playerId]);

// Fetch a player's hole cards
export const getPlayerCards = async (gameId: number, playerId: number, dbClient: DbClient = db) =>
  await dbClient.manyOrNone<{
    id: number;
    card_id: number;
    rank: string;
    suit: string;
  }>(GET_PLAYER_CARDS, [gameId, playerId]);

// Count remaining cards in deck
export const countDeckCards = async (gameId: number, dbClient: DbClient = db): Promise<number> => {
  const result = await dbClient.one<{ count: string }>(COUNT_DECK_CARDS, [gameId]);
  return parseInt(result.count);
};
