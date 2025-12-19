/**
 * Game Service Layer
 * 
 * Business logic for poker game operations.
 * Separates route handlers from database operations.
 */

import db from "../db/connection";
import * as Games from "../db/games";
import * as PlayerCards from "../db/player-cards";
import type { DbClient } from "../db/games";
import logger from "../lib/logger";

/**
 * Start a poker game (hand initialization)
 *
 * Responsibilities:
 * - Validates minimum player count (at least 2)
 * - Assigns deterministic table positions (no shuffle)
 * - Assigns dealer, small blind, big blind roles
 * - Deducts blinds from small/big blind players
 * - Adds blinds to pot
 * - Creates a shuffled deck for the game
 * - Deals two private hole cards to each player (round-robin)
 * - Determines the first player to act (pre-flop rules)
 * - Transitions game state from lobby to pre-flop
 *
 * Notes:
 * - All database mutations occur within a single transaction
 *
 * @param gameId - The game to start
 * @returns Object containing firstPlayerId (player who acts first)
 * @throws Error if the game cannot be started (e.g. insufficient players)
 */
export async function startGame(gameId: number): Promise<{ firstPlayerId: number }> {
    const SMALL_BLIND = 10;
    const BIG_BLIND = 20;

    return await db.tx(async (tx) => {
        const dbClient = tx as DbClient;

        // 1. Get players and validate
        const playerIds = await Games.getPlayerIds(gameId, dbClient);
        if (playerIds.length < 2) {
            throw new Error("At least 2 players required to start poker game");
        }

        logger.info(`Starting game ${gameId} with ${playerIds.length} players`);

        // 2. Assign sequential positions (no shuffle)
        for (let i = 0; i < playerIds.length; i++) {
            await Games.setPlayerPosition(gameId, playerIds[i], i + 1, dbClient);
        }

        // 3. Assign roles based on player count
        // Heads-up (2 players): position 1 = dealer+small blind, position 2 = big blind
        // 3+ players: position 1 = dealer, position 2 = small blind, position 3 = big blind
        const dealerIndex = 0;
        let smallBlindIndex: number;
        let bigBlindIndex: number;

        if (playerIds.length === 2) {
            smallBlindIndex = 0;
            bigBlindIndex = 1;
        } else {
            smallBlindIndex = 1;
            bigBlindIndex = 2;
        }

        // Set dealer role
        await Games.setPlayerRole(gameId, playerIds[dealerIndex], "dealer", dbClient);

        // Set small blind role and deduct chips
        if (smallBlindIndex === dealerIndex) {
            await Games.setPlayerRole(gameId, playerIds[smallBlindIndex], "dealer", dbClient);
        } else {
            await Games.setPlayerRole(gameId, playerIds[smallBlindIndex], "small_blind", dbClient);
        }
        await Games.deductChips(gameId, playerIds[smallBlindIndex], SMALL_BLIND, dbClient);
        await Games.updatePlayerBet(gameId, playerIds[smallBlindIndex], SMALL_BLIND, dbClient);

        // Set big blind role and deduct chips
        await Games.setPlayerRole(gameId, playerIds[bigBlindIndex], "big_blind", dbClient);
        await Games.deductChips(gameId, playerIds[bigBlindIndex], BIG_BLIND, dbClient);
        await Games.updatePlayerBet(gameId, playerIds[bigBlindIndex], BIG_BLIND, dbClient);

        // Set remaining players as regular players
        for (let i = 0; i < playerIds.length; i++) {
            if (i !== dealerIndex && i !== smallBlindIndex && i !== bigBlindIndex) {
                await Games.setPlayerRole(gameId, playerIds[i], "player", dbClient);
            }
        }

        // Add blinds to pot
        const totalBlinds = SMALL_BLIND + BIG_BLIND;
        await Games.addToPot(gameId, totalBlinds, dbClient);

        logger.info(`Game ${gameId}: Blinds posted (SB: ${SMALL_BLIND}, BB: ${BIG_BLIND})`);

        // 4. Create shuffled deck (52 cards, randomized order)
        await PlayerCards.createDeck(gameId, dbClient);

        // 5. Deal hole cards (round-robin, 2 passes)
        for (let pass = 0; pass < 2; pass++) {
            for (const playerId of playerIds) {
                const cards = await PlayerCards.getCardsFromDeck(gameId, 1, dbClient);
                if (cards.length !== 1) {
                    throw new Error("Deck exhausted while dealing hole cards");
                }

                await PlayerCards.dealCards([cards[0].id], playerId, dbClient);
            }
        }

        // 6. Determine first player to act (player after big blind)
        // In heads-up, small blind acts first pre-flop
        // In 3+ players, player after big blind acts first
        let firstToActIndex: number;
        if (playerIds.length === 2) {
            firstToActIndex = smallBlindIndex;
        } else {
            firstToActIndex = (bigBlindIndex + 1) % playerIds.length;
        }
        const firstPlayerId = playerIds[firstToActIndex];

        // 7. Transition game to pre-flop and set turn
        await Games.start(gameId, firstPlayerId, dbClient);

        logger.info(`Game ${gameId} started. First to act: user ${firstPlayerId}`);

        // After blinds are posted and bets are set
        await Games.resetHasActed(gameId, dbClient);

        return { firstPlayerId };
    });
}
