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

/**
 * Update pot display
 * @param amount - Current pot amount in chips
 */
export function updatePot(amount: number): void {
    // Explicit null check
    if (potElement !== null) {
        potElement.textContent = `Pot: $${amount || 0}`;
    }
}

/**
 * Update community cards display (flop, turn, river)
 * @param cards - Array of community cards to display
 */
export function updateCommunityCards(cards: Card[]): void {
    // Explicit null check
    if (communityCardsContainer === null) {
        return;
    }

    // If no cards, clear the container
    if (!cards || cards.length === 0) {
        communityCardsContainer.innerHTML = "";
        return;
    }

    // Clear and rebuild
    communityCardsContainer.innerHTML = "";
    cards.forEach((card) => {
        const cardEl = document.createElement("div");
        cardEl.className = `playing-card suit-${card.suit} rank-${card.rank}`;
        cardEl.dataset.rank = card.rank;
        cardEl.dataset.suit = card.suit;
        cardEl.textContent = `${card.rank}${getSuitSymbol(card.suit)}`;
        communityCardsContainer.appendChild(cardEl);
    });
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
 * Update player's hand cards
 * @param cards - Array of cards in player's hand
 */
export function updatePlayerHand(cards: Card[]): void {
    // Explicit null check
    if (playerHandContainer === null) {
        return;
    }

    // If no cards, don't update
    if (!cards || cards.length === 0) {
        return;
    }

    // Clear and rebuild
    playerHandContainer.innerHTML = "";
    cards.forEach((card) => {
        const cardEl = document.createElement("div");
        cardEl.className = `playing-card playing-card--small suit-${card.suit} rank-${card.rank}`;
        cardEl.dataset.rank = card.rank;
        cardEl.dataset.suit = card.suit;
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

            // Update current bet
            let betEl = seatEl.querySelector<HTMLElement>(".current-bet");
            if (player.current_bet > 0) {
                if (betEl === null) {
                    betEl = document.createElement("div");
                    betEl.className = "current-bet";
                    const labelEl = seatEl.querySelector(".player-seat__label");
                    if (labelEl !== null) {
                        labelEl.appendChild(betEl);
                    }
                }
                betEl.textContent = `Bet: $${player.current_bet}`;
            } else if (betEl !== null) {
                betEl.remove();
            }
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
 * Highlight whose turn it is
 * @param isMyTurn - Whether it's the current user's turn
 * @param currentTurnUserId - User ID of whose turn it is
 */
export function updateTurnIndicator(isMyTurn: boolean, currentTurnUserId: number | null): void {
    // Clear all turn indicators
    document.querySelectorAll(".active-turn").forEach((el) => el.classList.remove("active-turn"));

    if (isMyTurn) {
        const playerArea = document.querySelector(".player-area");
        // Explicit null check
        if (playerArea !== null) {
            playerArea.classList.add("active-turn");
        }
    } else if (currentTurnUserId !== null) {
        const seat = document.querySelector(`.player-seat[data-user-id="${currentTurnUserId}"]`);
        // Explicit null check
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
