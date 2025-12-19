/**
 * Game Service Layer
 * 
 * Business logic for poker game operations.
 * Separates route handlers from database operations.
 */

import db from "../db/connection";
import * as Games from "../db/games";
import * as PlayerCards from "../db/player-cards";
import logger from "../lib/logger";

/**
 * Start a poker game (hand initialization)
 *
 * Responsibilities:
 * - Validates minimum player count (at least 2)
 * - Assigns deterministic table positions (no shuffle)
 * - Creates a shuffled deck for the game
 * - Deals two private hole cards to each player (round-robin)
 * - Determines the first player to act (pre-flop rules)
 * - Transitions game state from lobby to pre-flop
 *
 * Notes:
 * - All database mutations occur within a single transaction
 * - Blind deductions and community card dealing are handled in later phases
 *
 * @param gameId - The game to start
 * @returns Object containing firstPlayerId (player who acts first)
 * @throws Error if the game cannot be started (e.g. insufficient players)
 */
export async function startGame(gameId: number): Promise<{ firstPlayerId: number }> {
    return await db.tx(async (tx) => {
      // 1. Get players and validate
      const playerIds = await Games.getPlayerIds(gameId);
      if (playerIds.length < 2) {
        throw new Error("At least 2 players required to start poker game");
      }
  
      logger.info(`Starting game ${gameId} with ${playerIds.length} players`);
  
      // 2. Assign sequential positions (no shuffle)
      for (let i = 0; i < playerIds.length; i++) {
        await Games.setPlayerPosition(gameId, playerIds[i], i + 1);
      }
  
      // 3. Create shuffled deck (52 cards, randomized order)
      await PlayerCards.createDeck(gameId);
  
      // 4. Deal hole cards (round-robin, 2 passes)
      for (let pass = 0; pass < 2; pass++) {
        for (const playerId of playerIds) {
          const cards = await PlayerCards.getCardsFromDeck(gameId, 1);
          if (cards.length !== 1) {
            throw new Error("Deck exhausted while dealing hole cards");
          }
  
          await PlayerCards.dealCards([cards[0].id], playerId);
        }
      }
  
      // TODO (Phase 3): Deduct blinds from small/big blind
      // TODO (Phase 3): Add blinds to pot
  
      // 5. Determine first player to act
      // Position 3 for 3+ players, position 1 for heads-up
      const firstPlayerId =
        playerIds.length > 2 ? playerIds[2] : playerIds[0];
  
      // 6. Transition game to pre-flop and set turn
      await Games.start(gameId, firstPlayerId);
  
      logger.info(`Game ${gameId} started. First to act: user ${firstPlayerId}`);
  
      return { firstPlayerId };
    });
  }
