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

import * as Games from "../db/games";
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
export async function validateTurn(gameId: number, userId: number): Promise<void> {
    const currentTurn = await Games.getCurrentTurn(gameId);

    if (currentTurn === null) {
        throw new Error("Game has not started");
    }

    if (currentTurn !== userId) {
        throw new Error("It's not your turn");
    }
}

/**
 * Player folds - sets bet_amount to -1 to mark as folded
 */
export async function fold(gameId: number, userId: number): Promise<BettingResult> {
    // Validate turn
    await validateTurn(gameId, userId);

    // Mark player as folded (bet_amount = -1)
    await Games.updatePlayerBet(gameId, userId, -1);

    // Advance to next player
    const nextPlayerId = await Games.advanceTurn(gameId);

    logger.info(`Player ${userId} folded in game ${gameId}`);

    return {
        success: true,
        action: "fold",
        nextPlayerId,
    };
}

/**
 * Player checks - only valid if no bet to call
 */
export async function check(gameId: number, userId: number): Promise<BettingResult> {
    // Validate turn
    await validateTurn(gameId, userId);

    // Get current highest bet
    const currentBet = await Games.getCurrentBet(gameId);
    const playerBet = await Games.getPlayerBet(gameId, userId);

    // Can only check if player's bet matches current bet
    if (currentBet > playerBet) {
        throw new Error(`Cannot check - must call $${currentBet - playerBet}`);
    }

    // Advance to next player
    const nextPlayerId = await Games.advanceTurn(gameId);

    logger.info(`Player ${userId} checked in game ${gameId}`);

    return {
        success: true,
        action: "check",
        nextPlayerId,
    };
}

/**
 * Player calls - matches the current bet
 */
export async function call(gameId: number, userId: number): Promise<BettingResult> {
    // Validate turn
    await validateTurn(gameId, userId);

    // Get current highest bet and player's current bet
    const currentBet = await Games.getCurrentBet(gameId);
    const playerBet = await Games.getPlayerBet(gameId, userId);

    // Calculate amount needed to call
    const callAmount = currentBet - playerBet;

    if (callAmount <= 0) {
        throw new Error("Nothing to call - use check instead");
    }

    // Deduct chips from player
    const newChips = await Games.deductChips(gameId, userId, callAmount);

    // Update player's bet to match current bet
    await Games.updatePlayerBet(gameId, userId, currentBet);

    // Add to pot
    const newPot = await Games.addToPot(gameId, callAmount);

    // Advance to next player
    const nextPlayerId = await Games.advanceTurn(gameId);

    logger.info(`Player ${userId} called $${callAmount} in game ${gameId}`);

    return {
        success: true,
        action: "call",
        amount: callAmount,
        newPot,
        newChips,
        nextPlayerId,
    };
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
    // Validate turn
    await validateTurn(gameId, userId);

    // Get current highest bet and player's current bet
    const currentBet = await Games.getCurrentBet(gameId);
    const playerBet = await Games.getPlayerBet(gameId, userId);

    // Validate raise amount (must be more than current bet)
    if (raiseToAmount <= currentBet) {
        throw new Error(`Raise must be more than current bet of $${currentBet}`);
    }

    // Calculate chips needed (difference from what player already bet)
    const chipsNeeded = raiseToAmount - playerBet;

    // Deduct chips from player
    const newChips = await Games.deductChips(gameId, userId, chipsNeeded);

    // Update player's bet
    await Games.updatePlayerBet(gameId, userId, raiseToAmount);

    // Add to pot
    const newPot = await Games.addToPot(gameId, chipsNeeded);

    // Advance to next player
    const nextPlayerId = await Games.advanceTurn(gameId);

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
}

/**
 * Player goes all-in - bets all remaining chips
 */
export async function allIn(gameId: number, userId: number): Promise<BettingResult> {
    // Validate turn
    await validateTurn(gameId, userId);

    // Get player's current chips and bet
    const players = await Games.getPlayersWithStats(gameId);
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
    const newChips = await Games.deductChips(gameId, userId, remainingChips);

    // Update player's bet
    await Games.updatePlayerBet(gameId, userId, newBetAmount);

    // Add to pot
    const newPot = await Games.addToPot(gameId, remainingChips);

    // Advance to next player
    const nextPlayerId = await Games.advanceTurn(gameId);

    logger.info(`Player ${userId} went all-in with $${remainingChips} in game ${gameId}`);

    return {
        success: true,
        action: "all-in",
        amount: remainingChips,
        newPot,
        newChips,
        nextPlayerId,
    };
}

/**
 * Check if betting round is complete (all bets equal)
 */
export async function isBettingRoundComplete(gameId: number): Promise<boolean> {
    return await Games.areAllBetsEqual(gameId);
}
