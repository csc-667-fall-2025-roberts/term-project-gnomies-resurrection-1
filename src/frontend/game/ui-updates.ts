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

// Cache DOM elements at module level
const potElement = document.querySelector<HTMLElement>(".pot-amount");
const communityCardsContainer = document.querySelector<HTMLElement>(".community-cards");
const playerHandContainer = document.querySelector<HTMLElement>(".player-hand");
const cardTemplate = document.querySelector<HTMLTemplateElement>("#card-template");
const playerSeatsContainer = document.querySelector<HTMLElement>(".player-seats");
const handStageElement = document.querySelector<HTMLElement>(".hand-stage");
const actionButtonsContainer = document.querySelector<HTMLElement>(".action-buttons");

/**
 * Update pot display
 * @param amount - Current pot amount in chips
 */
export function updatePot(amount: number): void {
    // Explicit null check
    if (potElement !== null) {
        potElement.textContent = `$${amount}`;
    }
}

/**
 * Update community cards display (flop, turn, river)
 * @param cards - Array of community cards to display
 */
export function updateCommunityCards(cards: Card[]): void {
    // Explicit null check
    if (communityCardsContainer === null || cardTemplate === null) {
        return;
    }

    // Clear existing cards
    communityCardsContainer.innerHTML = "";

    // Clone template for each card
    cards.forEach((card) => {
        const cardEl = cardTemplate.content.cloneNode(true) as DocumentFragment;
        const div = cardEl.querySelector(".playing-card") as HTMLElement;

        // Explicit null check
        if (div !== null) {
            div.classList.add(`suit-${card.suit}`, `rank-${card.rank}`);
            div.dataset.rank = card.rank;
            div.dataset.suit = card.suit;
            communityCardsContainer.appendChild(cardEl);
        }
    });
}

/**
 * Update player's hand cards
 * @param cards - Array of cards in player's hand
 */
export function updatePlayerHand(cards: Card[]): void {
    //  Explicit null check
    if (playerHandContainer === null || cardTemplate === null) {
        return;
    }

    // Clear existing hand
    playerHandContainer.innerHTML = "";

    // Clone template for each card
    cards.forEach((card) => {
        const cardEl = cardTemplate.content.cloneNode(true) as DocumentFragment;
        const div = cardEl.querySelector(".playing-card") as HTMLElement;

        //  Explicit null check
        if (div !== null) {
            div.classList.add(`suit-${card.suit}`, `rank-${card.rank}`);
            div.dataset.rank = card.rank;
            div.dataset.suit = card.suit;
            playerHandContainer.appendChild(cardEl);
        }
    });
}

/**
 * Update player seats display
 * @param players - Array of all players in the game
 */
export function updatePlayerSeats(players: Player[]): void {
    // Explicit null check
    if (playerSeatsContainer === null) {
        return;
    }

    // Clear existing seats
    playerSeatsContainer.innerHTML = "";

    // Create seat for each player
    players.forEach((player) => {
        const seatDiv = document.createElement("div");
        seatDiv.classList.add("player-seat");
        seatDiv.dataset.userId = String(player.user_id);
        seatDiv.dataset.position = String(player.position);

        // Add dealer indicator
        if (player.is_dealer) {
            seatDiv.classList.add("dealer");
        }

        // Add folded state
        if (player.is_folded) {
            seatDiv.classList.add("folded");
        }

        // Set seat content
        seatDiv.innerHTML = `
      <div class="player-name">${player.username}</div>
      <div class="player-chips">$${player.chip_count}</div>
      <div class="player-bet">Bet: $${player.current_bet}</div>
    `;

        playerSeatsContainer.appendChild(seatDiv);
    });
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
    // Explicit null check
    if (handStageElement !== null) {
        handStageElement.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
        handStageElement.dataset.stage = stage;
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
    // Explicit null check
    if (actionButtonsContainer === null) {
        return;
    }

    // Get button elements
    const checkBtn = actionButtonsContainer.querySelector<HTMLButtonElement>(".btn-check");
    const callBtn = actionButtonsContainer.querySelector<HTMLButtonElement>(".btn-call");
    const raiseBtn = actionButtonsContainer.querySelector<HTMLButtonElement>(".btn-raise");

    // Update check button
    if (checkBtn !== null) {
        checkBtn.disabled = !canCheck;
    }

    // Update call button
    if (callBtn !== null) {
        callBtn.disabled = !canCall;
        callBtn.textContent = `Call $${callAmount}`;
    }

    // Update raise button
    if (raiseBtn !== null) {
        raiseBtn.textContent = `Raise (min $${minRaise})`;
    }
}
