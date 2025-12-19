/**
 * DOM update functions for poker game state changes
 * 
 * Purpose: Pure functions that accept data and update DOM
 * 
 * PRINCIPLES:
 * - Functions are pure (no side effects beyond DOM)
 * - Cache elements at module level
 * - Use templates for repeated elements
 * - Keep focused - one responsibility each
 */

import type { Card, Player, HandStage } from "./types";

// Cache DOM elements at module level (using IDs that match game.ejs)
const potElement = document.getElementById("pot-display");
const communityCardsContainer = document.getElementById("community-cards");
const playerHandContainer = document.getElementById("player-hand");
const playerSeatsContainer = document.getElementById("seats");
const gameStateElement = document.getElementById("game-state");
const playerCountElement = document.getElementById("player-count");

// Track previous pot for delta calculation
let previousPotValue = 0;

/**
 * Update pot display with animation
 * @param amount - Current pot amount in chips
 */
export function updatePot(amount: number): void {
    // Explicit null check
    if (potElement === null) {
        return;
    }

    const currentAmount = amount || 0;
    const delta = currentAmount - previousPotValue;

    // Update the text content
    potElement.textContent = `Pot: $${currentAmount}`;

    // Add animation class for pot changes
    if (delta > 0) {
        // Pot increased - show pulse animation
        potElement.classList.remove("pot--pulse", "pot--decrease");
        // Force reflow to restart animation
        void potElement.offsetWidth;
        potElement.classList.add("pot--pulse");

        // Show delta tooltip briefly (large increases > 20%)
        const percentChange = previousPotValue > 0 ? (delta / previousPotValue) * 100 : 100;
        if (percentChange > 20 && delta > 10) {
            showPotDelta(delta);
        }
    } else if (delta < 0) {
        // Pot decreased (new hand or side pot) - subtle indication
        potElement.classList.remove("pot--pulse", "pot--decrease");
        void potElement.offsetWidth;
        potElement.classList.add("pot--decrease");
    }

    // Update previous value for next comparison
    previousPotValue = currentAmount;
}

/**
 * Show floating "+$X" delta near pot for large changes
 * @param delta - The amount added to pot
 */
function showPotDelta(delta: number): void {
    if (potElement === null) {
        return;
    }

    const host = potElement.parentElement ?? potElement;

    // Create floating delta element
    const deltaEl = document.createElement("span");
    deltaEl.className = "pot-delta";
    deltaEl.textContent = `+$${delta}`;
    deltaEl.style.position = "absolute";
    deltaEl.style.right = "-8px";
    deltaEl.style.top = "-8px";

    // Position near pot element
    host.style.position = host.style.position || "relative";
    host.appendChild(deltaEl);

    // Remove after animation completes (1s)
    setTimeout(() => {
        deltaEl.remove();
    }, 1000);
}


/**
 * Update community cards display (flop, turn, river)
 * 
 * Preserves existing cards and only animates newly dealt cards.
 * Edge cases handled:
 * - New hand: fewer cards than before → clear and rebuild
 * - Turn/River: adds 1 card → only new card animates
 * - Reconnect: full state sync → rebuild all (animation OK for reconnect)
 * - Duplicate event: same card count → no changes
 * 
 * @param cards - Array of community cards to display
 */
export function updateCommunityCards(cards: Card[]): void {
    // Explicit null check
    if (communityCardsContainer === null) {
        return;
    }

    // If no cards, clear the container (new hand or game reset)
    if (!cards || cards.length === 0) {
        communityCardsContainer.innerHTML = "";
        return;
    }

    // Count existing cards in the DOM
    const existingCards = communityCardsContainer.querySelectorAll<HTMLElement>(".playing-card");
    const existingCount = existingCards.length;
    const newCount = cards.length;

    // Edge case: Fewer cards than before means new hand started - clear and rebuild
    if (newCount < existingCount) {
        communityCardsContainer.innerHTML = "";
        // Fall through to add all cards as new
    }

    // Edge case: Same count - likely duplicate event, verify cards match
    if (newCount === existingCount && existingCount > 0) {
        // Check if first and last cards match (quick validation)
        const firstExisting = existingCards[0];
        const lastExisting = existingCards[existingCount - 1];
        const firstNew = cards[0];
        const lastNew = cards[newCount - 1];

        if (firstExisting.dataset.rank === firstNew.rank &&
            firstExisting.dataset.suit === firstNew.suit &&
            lastExisting.dataset.rank === lastNew.rank &&
            lastExisting.dataset.suit === lastNew.suit) {
            // Cards already match - no update needed
            return;
        }
    }

    // Get current count after potential clear
    const currentCount = communityCardsContainer.querySelectorAll(".playing-card").length;

    // Only add NEW cards (from currentCount to cards.length)
    for (let i = currentCount; i < newCount; i++) {
        const card = cards[i];
        const cardEl = document.createElement("div");

        // Base card classes
        cardEl.className = `playing-card suit-${card.suit} rank-${card.rank}`;

        // Data attributes for state tracking and debugging
        cardEl.dataset.rank = card.rank;
        cardEl.dataset.suit = card.suit;

        // Visible card face: rank + suit symbol
        cardEl.textContent = `${card.rank}${getSuitSymbol(card.suit)}`;

        // Staggered animation delay for newly dealt cards only
        // CSS has nth-child delays, but we add explicit delay for newly appended cards
        const animationDelay = (i - currentCount) * 0.15;
        cardEl.style.animationDelay = `${animationDelay}s`;

        communityCardsContainer.appendChild(cardEl);
    }
}

/**
 * Get suit symbol for display
 */
function getSuitSymbol(suit: string): string {
    const symbols: Record<string, string> = {
        H: "♥", D: "♦", C: "♣", S: "♠",
        hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠"
    };
    return symbols[suit] || suit;
}

/**
 * Update player's private hole cards
 * @param cards - Array of player's hole cards (rank + suit)
 */
export function updatePlayerHand(cards: { rank: string; suit: string }[]): void {
    // Graceful handling: missing container or invalid data
    if (!playerHandContainer || !Array.isArray(cards) || cards.length === 0) {
        return;
    }

    // Clear existing cards (idempotent update)
    playerHandContainer.innerHTML = "";

    cards.forEach((card) => {
        // Validate card shape defensively
        if (!card.rank || !card.suit) {
            return;
        }

        const cardEl = document.createElement("div");

        // Base card classes
        cardEl.classList.add("playing-card", "playing-card--hole");

        // Semantic CSS hooks
        cardEl.classList.add(`rank-${card.rank}`);
        cardEl.classList.add(`suit-${card.suit}`);

        // Data attributes for debugging / testing
        cardEl.dataset.rank = card.rank;
        cardEl.dataset.suit = card.suit;

        // Visible face value
        cardEl.textContent = `${card.rank}${getSuitSymbol(card.suit)}`;

        playerHandContainer.appendChild(cardEl);
    });
}


/**
 * Update player seats display
 * Dynamically adds/removes player seats as players join/leave
 * @param players - Array of all players in the game
 */
export function updatePlayerSeats(players: Player[]): void {
    // Explicit null check
    if (playerSeatsContainer === null || !players) {
        return;
    }

    const seatClasses = [
        "seat-pos-1", "seat-pos-3", "seat-pos-5", "seat-pos-7",
        "seat-pos-2", "seat-pos-4", "seat-pos-6", "seat-pos-8"
    ];

    // Get current player user_ids from the DOM
    const existingSeats = playerSeatsContainer.querySelectorAll<HTMLElement>("[data-user-id]");
    const existingUserIds = new Set<number>();
    existingSeats.forEach((seat) => {
        const userId = parseInt(seat.dataset.userId || "0");
        if (userId > 0) {
            existingUserIds.add(userId);
        }
    });

    // Get new player user_ids
    const newUserIds = new Set(players.map(p => p.user_id));

    // Update or create seats for each player
    players.forEach((player, index) => {
        let seatEl = playerSeatsContainer.querySelector<HTMLElement>(
            `[data-user-id="${player.user_id}"]`
        );

        if (seatEl === null) {
            // Player doesn't have a seat yet - create one
            const posIndex = player.position ? player.position - 1 : index;
            const posClass = seatClasses[posIndex] || `seat-pos-${index + 1}`;

            // Check if there's an empty seat we can replace
            const emptySeat = playerSeatsContainer.querySelector<HTMLElement>(
                `.player-seat--empty.${posClass}`
            );

            if (emptySeat !== null) {
                // Replace empty seat
                emptySeat.classList.remove("player-seat--empty");
                emptySeat.dataset.userId = String(player.user_id);
                emptySeat.innerHTML = `
                    <div class="player-seat__label">
                        <strong>${player.username}</strong>
                        <div class="player-seat__stack">$${player.chip_count}</div>
                    </div>
                `;
                seatEl = emptySeat;
            } else {
                // Create new seat element
                seatEl = document.createElement("div");
                seatEl.className = `player-seat ${posClass}`;
                seatEl.dataset.userId = String(player.user_id);
                seatEl.innerHTML = `
                    <div class="player-seat__label">
                        <strong>${player.username}</strong>
                        <div class="player-seat__stack">$${player.chip_count}</div>
                    </div>
                `;
                playerSeatsContainer.appendChild(seatEl);
            }
        } else {
            // Seat exists - update it
            const nameEl = seatEl.querySelector("strong");
            if (nameEl !== null) {
                nameEl.textContent = player.username;
            }

            const stackEl = seatEl.querySelector(".player-seat__stack");
            if (stackEl !== null) {
                stackEl.textContent = `$${player.chip_count}`;
            }

            updatePlayerBet(player.user_id, player.current_bet, player.chip_count);
        }
    });

    // Remove seats for players who left (convert back to empty seats)
    existingSeats.forEach((seat) => {
        const userId = parseInt(seat.dataset.userId || "0");
        if (userId > 0 && !newUserIds.has(userId)) {
            // Player left - convert to empty seat
            seat.classList.add("player-seat--empty");
            delete seat.dataset.userId;
            seat.innerHTML = `<div class="player-seat__label">Empty</div>`;
        }
    });

    // Update player count if element exists
    if (playerCountElement !== null) {
        playerCountElement.textContent = String(players.length);
    }
}

/**
 * Update a single player's bet display without refreshing all seats
 * This is more efficient for real-time betting updates
 * 
 * @param userId - User ID of the player to update
 * @param betAmount - Current bet amount (-1 = folded, 0 = no bet)
 * @param chipCount - Optional: player's remaining chips (for all-in detection)
 */
export function updatePlayerBet(
    userId: number,
    betAmount: number,
    chipCount?: number
): void {
    // Find the player's seat
    const seat = document.querySelector<HTMLElement>(
        `.player-seat[data-user-id="${userId}"]`
    );

    if (seat === null) {
        return;
    }

    const labelEl = seat.querySelector(".player-seat__label");
    if (labelEl === null) {
        return;
    }

    // Find or create bet element
    let betEl = seat.querySelector<HTMLElement>(".current-bet");

    // Handle special cases
    if (betAmount === -1) {
        // Player folded
        seat.classList.add("player-seat--folded");
        if (betEl !== null) {
            betEl.textContent = "FOLDED";
            betEl.classList.add("current-bet--folded");
        } else {
            betEl = document.createElement("div");
            betEl.className = "current-bet current-bet--folded";
            betEl.textContent = "FOLDED";
            labelEl.appendChild(betEl);
        }
        return;
    }

    // Remove folded state if not folded
    seat.classList.remove("player-seat--folded");

    if (betAmount === 0) {
        // No bet - remove bet display
        if (betEl !== null) {
            betEl.remove();
        }
        return;
    }

    // Has a bet - show it
    if (betEl === null) {
        betEl = document.createElement("div");
        betEl.className = "current-bet";
        labelEl.appendChild(betEl);
    }

    // Clear previous state classes
    betEl.classList.remove("current-bet--folded", "current-bet--all-in");

    // Check for all-in (player has bet but no remaining chips)
    const isAllIn = chipCount !== undefined && chipCount === 0;
    if (isAllIn) {
        betEl.textContent = `ALL-IN $${betAmount}`;
        betEl.classList.add("current-bet--all-in");
        seat.classList.add("player-seat--all-in");
    } else {
        betEl.textContent = `Bet: $${betAmount}`;
        seat.classList.remove("player-seat--all-in");
    }

    // Add brief highlight animation on update
    betEl.classList.remove("bet-updated");
    void betEl.offsetWidth; // Force reflow
    betEl.classList.add("bet-updated");
}

/**
 * Clear all player bet displays (for new round)
 */
export function clearAllBets(): void {
    document.querySelectorAll(".current-bet").forEach((el) => {
        // Keep folded status, just clear bet amount
        if (!el.classList.contains("current-bet--folded")) {
            el.remove();
        }
    });
}


/**
 * Highlight whose turn it is
 * @param isMyTurn - Whether it's the current user's turn
 * @param currentTurnUserId - User ID of whose turn it is
 */
export function updateTurnIndicator(isMyTurn: boolean, currentTurnUserId: number | null): void {
    // Clear existing turn highlights
    document.querySelectorAll(".active-turn").forEach((el) => {
        el.classList.remove("active-turn", "turn-fade-out");
    });

    if (isMyTurn) {
        const playerArea = document.querySelector(".player-area");
        if (playerArea !== null) {
            playerArea.classList.add("active-turn");
        }
        const playerControls = document.querySelector(".player-controls");
        if (playerControls !== null) {
            playerControls.classList.add("active-turn");
        }
    } else if (currentTurnUserId !== null) {
        const seat = document.querySelector(`.player-seat[data-user-id="${currentTurnUserId}"]`);
        if (seat !== null) {
            seat.classList.add("active-turn");
        }
    }

    // Enable/disable action buttons based on turn
    const playerControls = document.querySelector(".player-controls");
    if (playerControls !== null) {
        if (isMyTurn) {
            playerControls.classList.remove("disabled");
        } else {
            playerControls.classList.add("disabled");
        }
    }
}

/**
 * Alias for updateTurnIndicator for task D2 naming consistency
 * @param isMyTurn - Whether it's the current user's turn
 * @param currentTurnUserId - User ID of whose turn it is
 */
export const setActiveTurn = updateTurnIndicator;


/**
 * Update the current hand stage display
 * @param stage - Current stage of the hand
 */
export function updateHandStage(stage: HandStage): void {
    // Use game-state element to show current stage
    if (gameStateElement !== null && stage) {
        gameStateElement.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
    }
}

/**
 * Update available action buttons based on game state
 * @param canCheck - Whether player can check
 * @param canCall - Whether player can call
 * @param callAmount - Amount needed to call
 * @param minRaise - Minimum raise amount
 */
export function updateAvailableActions(
    canCheck: boolean,
    canCall: boolean,
    callAmount: number,
    minRaise: number
): void {
    // Get button elements from player-controls
    const playerControls = document.querySelector(".player-controls");
    if (playerControls === null) {
        return;
    }

    const checkBtn = playerControls.querySelector<HTMLButtonElement>(".btn-check");
    const callBtn = playerControls.querySelector<HTMLButtonElement>(".btn-call");
    const raiseBtn = playerControls.querySelector<HTMLButtonElement>(".btn-raise");

    // Update check button (if exists - we don't have a check button yet)
    if (checkBtn !== null) {
        checkBtn.disabled = !canCheck;
    }

    // Update call button
    if (callBtn !== null) {
        callBtn.disabled = !canCall;
        if (callAmount > 0) {
            callBtn.textContent = `Call $${callAmount}`;
        }
    }

    // Update raise button
    if (raiseBtn !== null && minRaise > 0) {
        raiseBtn.textContent = `Raise (min $${minRaise})`;
    }
}

// ==================== TURN TIMER ====================

const TURN_TIMEOUT_MS = 30000; // 30 seconds
let turnTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the turn countdown timer
 * @param onTimeout - Callback to execute when timer expires (auto-fold)
 */
export function startTurnTimer(onTimeout: () => void): void {
    // Clear any existing timer first
    clearTurnTimer();

    let remaining = TURN_TIMEOUT_MS;
    const timerEl = document.getElementById("turn-timer");
    const timerFill = document.getElementById("turn-timer-fill");
    const playerControls = document.querySelector(".player-controls");

    // Show timer element and add "your turn" indicator
    if (timerEl !== null) {
        timerEl.classList.add("turn-timer--active");
        timerEl.classList.remove("turn-timer--warning", "turn-timer--danger");
        timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;
    }

    if (timerFill !== null) {
        timerFill.style.width = "100%";
        timerFill.classList.remove("turn-timer-fill--warning", "turn-timer-fill--danger");
    }

    // Add "your turn" indicator to controls
    if (playerControls !== null) {
        playerControls.classList.add("your-turn");
        playerControls.classList.remove("disabled");
    }

    turnTimer = setInterval(() => {
        remaining -= 1000;

        // Update timer display
        if (timerEl !== null) {
            timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;

            // Update timer circle color based on time remaining
            if (remaining <= 5000) {
                timerEl.classList.remove("turn-timer--warning");
                timerEl.classList.add("turn-timer--danger");
            } else if (remaining <= 10000) {
                timerEl.classList.add("turn-timer--warning");
            }
        }

        // Update timer bar visual
        if (timerFill !== null) {
            const percentage = (remaining / TURN_TIMEOUT_MS) * 100;
            timerFill.style.width = `${percentage}%`;

            // Change color when low on time
            if (remaining <= 10000) {
                timerFill.classList.add("turn-timer-fill--warning");
            }
            if (remaining <= 5000) {
                timerFill.classList.remove("turn-timer-fill--warning");
                timerFill.classList.add("turn-timer-fill--danger");
            }
        }

        // Time's up
        if (remaining <= 0) {
            clearTurnTimer();
            onTimeout();
        }
    }, 1000);
}

/**
 * Clear the turn timer (when action taken or turn ends)
 */
export function clearTurnTimer(): void {
    if (turnTimer !== null) {
        clearInterval(turnTimer);
        turnTimer = null;
    }

    // Hide timer display and reset classes
    const timerEl = document.getElementById("turn-timer");
    const timerFill = document.getElementById("turn-timer-fill");
    const playerControls = document.querySelector(".player-controls");

    if (timerEl !== null) {
        timerEl.classList.remove("turn-timer--active", "turn-timer--warning", "turn-timer--danger");
    }

    if (timerFill !== null) {
        timerFill.style.width = "0%";
        timerFill.classList.remove("turn-timer-fill--warning", "turn-timer-fill--danger");
    }

    // Remove "your turn" indicator from controls
    if (playerControls !== null) {
        playerControls.classList.remove("your-turn");
    }
}
