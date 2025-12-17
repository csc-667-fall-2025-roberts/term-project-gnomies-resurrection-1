/**
 * Game Service Layer
 * 
 * Business logic for poker game operations.
 * Separates route handlers from database operations.
 */

import * as Games from "../db/games";
import logger from "../lib/logger";

/**
 * Start a poker game
 * - Validates minimum players (2)
 * - Assigns dealer and blind positions
 * - Sets initial turn
 * - Transitions state to pre-flop
 * 
 * @param gameId - The game to start
 * @returns Object with firstPlayerId (player who acts first)
 * @throws Error if less than 2 players
 */
export async function startGame(gameId: number): Promise<{ firstPlayerId: number }> {
    // Get players and validate
    const playerIds = await Games.getPlayerIds(gameId);

    if (playerIds.length < 2) {
        throw new Error("At least 2 players required to start poker game");
    }

    logger.info(`Starting game ${gameId} with ${playerIds.length} players`);

    // Assign positions (1-based indexing) - DO NOT SHUFFLE (poker needs dealer rotation)
    // In poker, positions are sequential for proper dealer button rotation
    for (let i = 0; i < playerIds.length; i++) {
        await Games.setPlayerPosition(gameId, playerIds[i], i + 1);
    }

    // In poker:
    // - Position 1 = Dealer (or small blind in heads-up)
    // - Position 2 = Small Blind (or big blind in heads-up)
    // - Position 3 = Big Blind
    // First to act is player after big blind (position 3+), or wrap to 1 if only 2 players
    // In heads-up (2 players), small blind acts first preflop
    const firstToAct = playerIds.length > 2 ? playerIds[2] : playerIds[0];

    // Start game and set turn (transitions state to 'pre-flop')
    await Games.start(gameId, firstToAct);

    logger.info(`Game ${gameId} started. First to act: user ${firstToAct}`);

    // TODO: Deal hole cards (2 per player)
    // TODO: Deduct blinds from small/big blind players
    // TODO: Add blinds to pot

    return { firstPlayerId: firstToAct };
}
