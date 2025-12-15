/**
 * Betting Logic and Chip Management
 * 
 * Purpose: Poker-specific betting calculations and validation
 * 
 * PRINCIPLES:
 * - All functions are pure (no side effects)
 * - Explicit error messages for validation
 * - Handles edge cases (negative, zero, very large numbers)
 */

/**
 * Validation result for betting operations
 */
export interface ValidationResult {
    valid: boolean;
    message?: string;
}

/**
 * Pot odds calculation result
 */
export interface PotOddsResult {
    ratio: number;
    percentage: number;
    recommended: boolean;
}

/**
 * Calculate minimum valid raise amount
 * In Texas Hold'em, minimum raise must be at least the size of the previous raise
 * 
 * @param currentBet - Current bet to match
 * @param lastRaise - Amount of the previous raise
 * @returns Minimum valid raise amount
 */
export function calculateMinRaise(currentBet: number, lastRaise: number): number {
    // Minimum raise is the current bet plus at least the last raise amount
    const minRaise = currentBet + lastRaise;
    return minRaise;
}

/**
 * Calculate maximum raise amount (player's effective stack)
 * 
 * @param playerStack - Player's current chip count
 * @param currentBet - Amount player has already bet this round
 * @returns Maximum amount player can raise to
 */
export function calculateMaxRaise(playerStack: number, currentBet: number): number {
    // Max raise is player's entire stack (all-in)
    const maxRaise = playerStack + currentBet;
    return maxRaise;
}

/**
 * Calculate amount needed to call
 * 
 * @param currentBetToMatch - The current bet that must be matched
 * @param playerCurrentBet - Amount player has already bet this round
 * @returns Amount player needs to add to call
 */
export function calculateCallAmount(currentBetToMatch: number, playerCurrentBet: number): number {
    const callAmount = currentBetToMatch - playerCurrentBet;

    // Cannot be negative
    if (callAmount < 0) {
        return 0;
    }

    return callAmount;
}

/**
 * Validate raise amount against limits
 * 
 * @param amount - Amount player wants to raise to
 * @param minRaise - Minimum valid raise
 * @param maxRaise - Maximum valid raise (player's stack)
 * @returns Validation result with error message if invalid
 */
export function validateRaise(
    amount: number,
    minRaise: number,
    maxRaise: number
): ValidationResult {
    // Must be a valid number
    if (isNaN(amount)) {
        return { valid: false, message: "Please enter a valid number" };
    }

    // Must be positive
    if (amount <= 0) {
        return { valid: false, message: "Raise amount must be positive" };
    }

    // Must meet minimum
    if (amount < minRaise) {
        return { valid: false, message: `Minimum raise is $${formatChips(minRaise)}` };
    }

    // Cannot exceed maximum
    if (amount > maxRaise) {
        return { valid: false, message: `Maximum raise is $${formatChips(maxRaise)} (all-in)` };
    }

    return { valid: true };
}

/**
 * Validate bet amount (opening bet, no previous bet to match)
 * 
 * @param amount - Amount to bet
 * @param minBet - Minimum bet (usually big blind)
 * @param playerStack - Player's current chip count
 * @returns Validation result
 */
export function validateBet(
    amount: number,
    minBet: number,
    playerStack: number
): ValidationResult {
    if (isNaN(amount)) {
        return { valid: false, message: "Please enter a valid number" };
    }

    if (amount <= 0) {
        return { valid: false, message: "Bet amount must be positive" };
    }

    if (amount < minBet) {
        return { valid: false, message: `Minimum bet is $${formatChips(minBet)}` };
    }

    if (amount > playerStack) {
        return { valid: false, message: `Maximum bet is $${formatChips(playerStack)} (all-in)` };
    }

    return { valid: true };
}

/**
 * Format chip amount for display
 * Converts large numbers to K/M notation
 * 
 * @param amount - Chip amount to format
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatChips(amount: number): string {
    // Handle negative (shouldn't happen, but be safe)
    if (amount < 0) {
        return `-${formatChips(Math.abs(amount))}`;
    }

    // Millions
    if (amount >= 1000000) {
        const formatted = (amount / 1000000).toFixed(1);
        // Remove trailing .0
        if (formatted.endsWith(".0")) {
            return `${formatted.slice(0, -2)}M`;
        }
        return `${formatted}M`;
    }

    // Thousands
    if (amount >= 1000) {
        const formatted = (amount / 1000).toFixed(1);
        if (formatted.endsWith(".0")) {
            return `${formatted.slice(0, -2)}K`;
        }
        return `${formatted}K`;
    }

    // Small amounts - show as integer
    return `${Math.floor(amount)}`;
}

/**
 * Calculate pot odds for decision making
 * Pot odds = Call Amount / (Pot + Call Amount)
 * 
 * @param potSize - Current pot size
 * @param callAmount - Amount needed to call
 * @returns Pot odds as ratio and percentage
 */
export function calculatePotOdds(potSize: number, callAmount: number): PotOddsResult {
    // Avoid division by zero
    if (callAmount <= 0) {
        return {
            ratio: 0,
            percentage: 0,
            recommended: true // Free to see
        };
    }

    const totalPot = potSize + callAmount;
    const ratio = callAmount / totalPot;
    const percentage = ratio * 100;

    // Generally, if pot odds are better than 33%, it's a reasonable call
    // This is simplified - real poker uses hand equity calculations
    const recommended = percentage <= 33;

    return {
        ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        recommended
    };
}

/**
 * Calculate implied odds (potential winnings vs call cost)
 * 
 * @param potSize - Current pot size
 * @param callAmount - Amount to call
 * @param expectedWinnings - Estimated additional chips you can win if hitting your hand
 * @returns Implied odds percentage
 */
export function calculateImpliedOdds(
    potSize: number,
    callAmount: number,
    expectedWinnings: number
): number {
    if (callAmount <= 0) {
        return 0;
    }

    const totalPotential = potSize + callAmount + expectedWinnings;
    const impliedOdds = (callAmount / totalPotential) * 100;

    return Math.round(impliedOdds * 10) / 10;
}

/**
 * Determine if player can check (no bet to match)
 * 
 * @param currentBetToMatch - The current bet in play
 * @param playerCurrentBet - Amount player has already contributed
 * @returns True if player can check
 */
export function canCheck(currentBetToMatch: number, playerCurrentBet: number): boolean {
    return currentBetToMatch <= playerCurrentBet;
}

/**
 * Determine if player can call (has enough chips)
 * 
 * @param callAmount - Amount needed to call
 * @param playerStack - Player's remaining chips
 * @returns True if player can call (or go all-in to call)
 */
export function canCall(callAmount: number, playerStack: number): boolean {
    // Can always call if there's something to call (might be all-in)
    return callAmount > 0 && playerStack > 0;
}

/**
 * Determine if player can raise
 * 
 * @param playerStack - Player's remaining chips
 * @param callAmount - Amount needed to call first
 * @param minRaise - Minimum raise above call
 * @returns True if player has enough to make minimum raise
 */
export function canRaise(playerStack: number, callAmount: number, minRaise: number): boolean {
    // Player needs enough to call plus minimum raise amount
    return playerStack > callAmount && playerStack >= minRaise;
}

/**
 * Calculate side pot amount when player is all-in
 * 
 * @param allInAmount - The all-in player's total bet
 * @param otherPlayerBets - Array of other players' bet amounts
 * @returns Main pot and side pot amounts
 */
export function calculateSidePot(
    allInAmount: number,
    otherPlayerBets: number[]
): { mainPot: number; sidePot: number } {
    let mainPot = allInAmount;
    let sidePot = 0;

    otherPlayerBets.forEach((bet) => {
        if (bet <= allInAmount) {
            mainPot += bet;
        } else {
            mainPot += allInAmount;
            sidePot += bet - allInAmount;
        }
    });

    return { mainPot, sidePot };
}

/**
 * Format currency for display with $ symbol
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
    return `$${formatChips(amount)}`;
}

/**
 * Parse a bet string input to number
 * Handles common formats like "$100", "100", "1k", "1.5k"
 * 
 * @param input - String input from user
 * @returns Parsed number or NaN if invalid
 */
export function parseBetInput(input: string): number {
    // Remove whitespace and $ symbol
    const cleaned = input.trim().replace(/^\$/, "").toLowerCase();

    // Handle K suffix
    if (cleaned.endsWith("k")) {
        const num = parseFloat(cleaned.slice(0, -1));
        return isNaN(num) ? NaN : num * 1000;
    }

    // Handle M suffix
    if (cleaned.endsWith("m")) {
        const num = parseFloat(cleaned.slice(0, -1));
        return isNaN(num) ? NaN : num * 1000000;
    }

    // Standard number
    return parseFloat(cleaned);
}

/**
 * Calculate bet sizing suggestions (common presets)
 * 
 * @param potSize - Current pot size
 * @param minBet - Minimum bet allowed
 * @param maxBet - Maximum bet (player stack)
 * @returns Array of suggested bet amounts
 */
export function getBetSuggestions(
    potSize: number,
    minBet: number,
    maxBet: number
): number[] {
    const suggestions: number[] = [];

    // Half pot
    const halfPot = Math.floor(potSize / 2);
    if (halfPot >= minBet && halfPot <= maxBet) {
        suggestions.push(halfPot);
    }

    // 3/4 pot
    const threeQuarterPot = Math.floor(potSize * 0.75);
    if (threeQuarterPot >= minBet && threeQuarterPot <= maxBet) {
        suggestions.push(threeQuarterPot);
    }

    // Full pot
    if (potSize >= minBet && potSize <= maxBet) {
        suggestions.push(potSize);
    }

    // 1.5x pot (overbet)
    const oneAndHalfPot = Math.floor(potSize * 1.5);
    if (oneAndHalfPot >= minBet && oneAndHalfPot <= maxBet) {
        suggestions.push(oneAndHalfPot);
    }

    // All-in (always include if different from others)
    if (maxBet > 0 && !suggestions.includes(maxBet)) {
        suggestions.push(maxBet);
    }

    return suggestions;
}
