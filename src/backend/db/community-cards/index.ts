/**
 * Community Cards Database Module
 *
 * Purpose: Wrapper functions for community card operations
 * Pattern: Professor's db/game-cards/index.ts
 */

import db from "../connection";
import {
    ADD_COMMUNITY_CARDS,
    CLEAR_COMMUNITY_CARDS,
    COUNT_COMMUNITY_CARDS,
    GET_COMMUNITY_CARDS,
} from "./sql";

type DbClient = Pick<typeof db, "none" | "one" | "manyOrNone">;

// Type for community card with details
export type CommunityCard = {
    card_id: number;
    rank: string;
    suit: string;
};

/**
 * Add multiple community cards to the table (bulk insert)
 * Used for flop (3 cards) and turn/river (1 card each)
 */
export const addCommunityCards = async (
    gameId: number,
    cardIds: number[],
    dbClient: DbClient = db
): Promise<void> => {
    await dbClient.none(ADD_COMMUNITY_CARDS, [gameId, cardIds]);
};

/**
 * Get all community cards for a game with rank and suit details
 * Returns cards in deal order (by card_id)
 */
export const getCommunityCards = async (
    gameId: number,
    dbClient: DbClient = db
): Promise<CommunityCard[]> => {
    return await dbClient.manyOrNone<CommunityCard>(GET_COMMUNITY_CARDS, [gameId]);
};

/**
 * Count current community cards (0, 3, 4, or 5)
 */
export const countCommunityCards = async (gameId: number, dbClient: DbClient = db): Promise<number> => {
    const result = await dbClient.one<{ count: string }>(COUNT_COMMUNITY_CARDS, [
        gameId,
    ]);
    return parseInt(result.count);
};

/**
 * Clear all community cards for a game (new hand reset)
 */
export const clearCommunityCards = async (gameId: number, dbClient: DbClient = db): Promise<void> => {
    await dbClient.none(CLEAR_COMMUNITY_CARDS, [gameId]);
};
