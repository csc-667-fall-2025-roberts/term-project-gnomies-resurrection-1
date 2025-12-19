/**
 * Betting Service
 * 
 * Business logic for poker betting actions.
 * Handles fold, check, call, raise, and all-in.
 * 
 * PRINCIPLES:
 * - Validates it's the player's turn before any action
 * - Updates chips, bets, and pot atomically
 * - Advances turn after each action
 * - Uses explicit comparisons (professor's requirement)
 */

import db from "../db/connection";
import * as Games from "../db/games";
import type { DbClient } from "../db/games";
import logger from "../lib/logger";

/**
 * Result of a betting action
 */
export interface BettingResult {
    success: boolean;
    action: string;
    amount?: number;
    newPot?: number;
    newChips?: number;
    nextPlayerId?: number;
    error?: string;
}

/**
 * Validate that it's the player's turn
 * @throws Error if not player's turn
 */
async function validateTurnWithDb(dbClient: DbClient, gameId: number, userId: number): Promise<void> {
    const currentTurn = await Games.getCurrentTurn(gameId, dbClient);

    if (currentTurn === null) {
        throw new Error("Game has not started");
    }

    if (currentTurn !== userId) {
        throw new Error("It's not your turn");
    }
}

export async function validateTurn(gameId: number, userId: number): Promise<void> {
    await validateTurnWithDb(db, gameId, userId);
}

/**
 * Get player's current chip count
 * @throws Error if player not found
 */
async function getPlayerChips(dbClient: DbClient, gameId: number, userId: number): Promise<number> {
    const players = await Games.getPlayersWithStats(gameId, dbClient);
    const player = players.find(p => p.user_id === userId);

    if (player === undefined) {
        throw new Error("Player not found in game");
    }

    return player.chip_count;
}

/**
 * Player folds - sets bet_amount to -1 to mark as folded
 */
export async function fold(gameId: number, userId: number): Promise<BettingResult> {
    return await db.tx(async (tx) => {
        const dbClient = tx as DbClient;

        // Validate turn
        await validateTurnWithDb(dbClient, gameId, userId);

        // Mark player as folded (bet_amount = -1)
        await Games.updatePlayerBet(gameId, userId, -1, dbClient);

        // Advance to next player
        const nextPlayerId = await Games.advanceTurn(gameId, dbClient);

        logger.info(`Player ${userId} folded in game ${gameId}`);

        return {
            success: true,
            action: "fold",
            nextPlayerId,
        };
    });
}

/**
 * Player checks - only valid if no bet to call
 */
export async function check(gameId: number, userId: number): Promise<BettingResult> {
    return await db.tx(async (tx) => {
        const dbClient = tx as DbClient;

        // Validate turn
        await validateTurnWithDb(dbClient, gameId, userId);

        // Get current highest bet
        const currentBet = await Games.getCurrentBet(gameId, dbClient);
        const playerBet = await Games.getPlayerBet(gameId, userId, dbClient);

        // Can only check if player's bet matches current bet
        if (currentBet > playerBet) {
            throw new Error(`Cannot check - must call $${currentBet - playerBet}`);
        }

        // Advance to next player
        const nextPlayerId = await Games.advanceTurn(gameId, dbClient);

        logger.info(`Player ${userId} checked in game ${gameId}`);

        return {
            success: true,
            action: "check",
            nextPlayerId,
        };
    });
}

/**
 * Player calls - matches the current bet
 */
export async function call(gameId: number, userId: number): Promise<BettingResult> {
    return await db.tx(async (tx) => {
        const dbClient = tx as DbClient;

        // Validate turn
        await validateTurnWithDb(dbClient, gameId, userId);

        // Get current highest bet and player's current bet
        const currentBet = await Games.getCurrentBet(gameId, dbClient);
        const playerBet = await Games.getPlayerBet(gameId, userId, dbClient);

        // Calculate amount needed to call
        const callAmount = currentBet - playerBet;

        if (callAmount <= 0) {
            throw new Error("Nothing to call - use check instead");
        }

        // Validate player has enough chips
        const playerChips = await getPlayerChips(dbClient, gameId, userId);
        if (playerChips < callAmount) {
            throw new Error(`Not enough chips to call. Have $${playerChips}, need $${callAmount}. Use all-in instead.`);
        }

        // Deduct chips from player
        const newChips = await Games.deductChips(gameId, userId, callAmount, dbClient);

        // Update player's bet to match current bet
        await Games.updatePlayerBet(gameId, userId, currentBet, dbClient);

        // Add to pot
        const newPot = await Games.addToPot(gameId, callAmount, dbClient);

        // Advance to next player
        const nextPlayerId = await Games.advanceTurn(gameId, dbClient);

        logger.info(`Player ${userId} called $${callAmount} in game ${gameId}`);

        return {
            success: true,
            action: "call",
            amount: callAmount,
            newPot,
            newChips,
            nextPlayerId,
        };
    });
}

/**
 * Player raises - increases the bet above current bet
 * @param raiseToAmount - The total amount to raise TO (not raise BY)
 */
export async function raise(
    gameId: number,
    userId: number,
    raiseToAmount: number
): Promise<BettingResult> {
    return await db.tx(async (tx) => {
        const dbClient = tx as DbClient;

        // Validate turn
        await validateTurnWithDb(dbClient, gameId, userId);

        // Get current highest bet and player's current bet
        const currentBet = await Games.getCurrentBet(gameId, dbClient);
        const playerBet = await Games.getPlayerBet(gameId, userId, dbClient);

        // Validate raise amount (must be more than current bet)
        if (raiseToAmount <= currentBet) {
            throw new Error(`Raise must be more than current bet of $${currentBet}`);
        }

        // Calculate chips needed (difference from what player already bet)
        const chipsNeeded = raiseToAmount - playerBet;

        // Validate player has enough chips
        const playerChips = await getPlayerChips(dbClient, gameId, userId);
        if (playerChips < chipsNeeded) {
            throw new Error(`Not enough chips to raise. Have $${playerChips}, need $${chipsNeeded}. Use all-in instead.`);
        }

        // Deduct chips from player
        const newChips = await Games.deductChips(gameId, userId, chipsNeeded, dbClient);

        // Update player's bet
        await Games.updatePlayerBet(gameId, userId, raiseToAmount, dbClient);

        // Add to pot
        const newPot = await Games.addToPot(gameId, chipsNeeded, dbClient);

        // Advance to next player
        const nextPlayerId = await Games.advanceTurn(gameId, dbClient);

        const raiseBy = raiseToAmount - currentBet;
        logger.info(`Player ${userId} raised by $${raiseBy} to $${raiseToAmount} in game ${gameId}`);

        return {
            success: true,
            action: "raise",
            amount: raiseToAmount,
            newPot,
            newChips,
            nextPlayerId,
        };
    });
}

/**
 * Player goes all-in - bets all remaining chips
 */
export async function allIn(gameId: number, userId: number): Promise<BettingResult> {
    return await db.tx(async (tx) => {
        const dbClient = tx as DbClient;

        // Validate turn
        await validateTurnWithDb(dbClient, gameId, userId);

        // Get player's current chips and bet
        const players = await Games.getPlayersWithStats(gameId, dbClient);
        const player = players.find(p => p.user_id === userId);

        if (player === undefined) {
            throw new Error("Player not found in game");
        }

        const remainingChips = player.chip_count;
        const currentPlayerBet = player.current_bet;

        if (remainingChips <= 0) {
            throw new Error("No chips remaining to bet");
        }

        // Total bet will be current bet + all remaining chips
        const newBetAmount = currentPlayerBet + remainingChips;

        // Deduct all remaining chips
        const newChips = await Games.deductChips(gameId, userId, remainingChips, dbClient);

        // Update player's bet
        await Games.updatePlayerBet(gameId, userId, newBetAmount, dbClient);

        // Add to pot
        const newPot = await Games.addToPot(gameId, remainingChips, dbClient);

        // Advance to next player
        const nextPlayerId = await Games.advanceTurn(gameId, dbClient);

        logger.info(`Player ${userId} went all-in with $${remainingChips} in game ${gameId}`);

        return {
            success: true,
            action: "all-in",
            amount: remainingChips,
            newPot,
            newChips,
            nextPlayerId,
        };
    });
}

/**
 * Check if betting round is complete (all bets equal)
 */
export async function isBettingRoundComplete(gameId: number): Promise<boolean> {
    return await Games.areAllBetsEqual(gameId);
}
