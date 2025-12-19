/**
 * Poker Game Page Entry Point
 * 
 * Purpose: Coordinates socket connection and game modules
 */

import socketIo from "socket.io-client";
import type { GameStateUpdate, BettingAction } from "./game/types";
import {
    updatePot,
    updateCommunityCards,
    updatePlayerHand,
    updatePlayerSeats,
    updateTurnIndicator,
    updateHandStage,
    updateAvailableActions,
    startTurnTimer,
    clearTurnTimer
} from "./game/ui-updates";
import {
    initializePlayerActions,
    updateActionButtons,
    showActionFeedback,
    resetActionState
} from "./game/player-actions";

// Get game ID from server-rendered data attribute
const gameId = document.body.dataset.gameId || "";

// const for non-reassigned variables
const socket = socketIo({ query: { gameId } });

/**
 * Show reconnecting overlay when disconnected
 */
function showReconnectingUI(): void {
    // Explicit null check - only create if doesn't exist
    if (document.getElementById("reconnecting-overlay") !== null) {
        return;
    }
    const overlay = document.createElement("div");
    overlay.id = "reconnecting-overlay";
    overlay.innerHTML = '<div class="reconnecting-message">Reconnecting...</div>';
    document.body.appendChild(overlay);
}

/**
 * Hide reconnecting overlay when connected
 */
function hideReconnectingUI(): void {
    const overlay = document.getElementById("reconnecting-overlay");
    if (overlay !== null) {
        overlay.remove();
    }
}

/**
 * Handle socket connection/reconnection
 * Re-request game state to sync after reconnect
 */
socket.on("connect", () => {
    console.log("Connected/Reconnected to game server");
    socket.emit("game:requestState", { gameId });
    hideReconnectingUI();
});

/**
 * Handle socket disconnection
 * Show visual feedback to user
 */
socket.on("disconnect", () => {
    console.log("Disconnected from game server");
    showReconnectingUI();
    clearTurnTimer();
});

/**
 * Handle player joined event
 * Request fresh game state to update player list without page reload
 */
socket.on("player-joined", (data: any) => {
    console.log("Player joined:", data);
    // Request fresh state from server (like chat - no page reload!)
    socket.emit("game:requestState", { gameId });
});

/**
 * Handle player left event
 * Request fresh game state to update player list without page reload
 */
socket.on("player-left", (data: any) => {
    console.log("Player left:", data);
    // Request fresh state from server (like chat - no page reload!)
    socket.emit("game:requestState", { gameId });
});

/**
 * Handle game started event
 */
socket.on("game:started", (data: any) => {
    // TODO: Implement proper state update
    // Hide lobby overlay
    // Show game board
    // Deal initial cards
    console.log("Game started:", data);

    // Update game state
    updatePot(data.pot);
    updatePlayerSeats(data.players);
    updatePlayerHand(data.my_cards);
    updateHandStage(data.current_stage);
});

/**
 * Handle new hand dealt
 */
socket.on("hand:dealt", (data: any) => {
    // TODO: Implement hand dealt logic
    // Clear community cards
    // Update player hands
    // Reset betting round
    console.log("Hand dealt:", data);

    updatePlayerHand(data.my_cards);
    updateCommunityCards([]);
    updateHandStage("preflop");
    updatePot(data.pot);
});

/**
 * Handle flop cards revealed
 */
socket.on("flop:revealed", (data: any) => {
    console.log("Flop revealed:", data);
    updateCommunityCards(data.community_cards);
    updateHandStage("flop");
});

/**
 * Handle turn card revealed
 */
socket.on("turn:revealed", (data: any) => {
    console.log("Turn revealed:", data);
    updateCommunityCards(data.community_cards);
    updateHandStage("turn");
});

/**
 * Handle river card revealed
 */
socket.on("river:revealed", (data: any) => {
    console.log("River revealed:", data);
    updateCommunityCards(data.community_cards);
    updateHandStage("river");
});

/**
 * Handle betting action
 */
socket.on("betting:action", (data: any) => {
    // TODO: Update pot, player chips, current turn
    console.log("Betting action:", data);

    updatePot(data.new_pot);
    updatePlayerSeats(data.players);
    updateTurnIndicator(data.is_my_turn, data.current_turn_user_id);
});

/**
 * Handle turn changed
 * Starts/stops timer based on whose turn it is
 */
socket.on("turn:changed", (data: any) => {
    console.log("Turn changed:", data);

    updateTurnIndicator(data.is_my_turn, data.current_turn_user_id);
    updateAvailableActions(
        data.can_check,
        data.can_call,
        data.call_amount,
        data.min_raise
    );

    // Update action buttons with full state
    updateActionButtons(
        data.is_my_turn,
        data.can_check,
        data.can_call,
        data.call_amount,
        data.min_raise,
        data.max_raise || data.player_stack || 0
    );

    // Timer logic: start when it's my turn, clear when not
    if (data.is_my_turn) {
        startTurnTimer(() => {
            // Auto-fold on timeout
            console.log("Turn timeout - auto-folding");
            socket.emit("player:action", {
                gameId,
                action: "fold"
            });
        });
    } else {
        clearTurnTimer();
    }
});

/**
 * Handle game state update
 */
socket.on("game:state", (data: any) => {
    console.log("Game state update:", data);

    // Full state sync
    updatePot(data.pot);
    updateCommunityCards(data.community_cards);
    updatePlayerHand(data.my_cards);
    updatePlayerSeats(data.players);
    updateHandStage(data.current_stage);
    updateTurnIndicator(data.is_my_turn, data.current_turn_user_id);
    updateAvailableActions(
        data.can_check,
        data.can_call,
        data.call_amount,
        data.min_raise
    );
});

/**
 * Handle hand complete (showdown)
 */
socket.on("hand:complete", (data: any) => {
    // TODO: Show winner, hand results
    console.log("Hand complete:", data);
    updateHandStage("showdown");
});

/**
 * Handle game ended (lowercase - for internal events)
 */
socket.on("game:ended", (data: { winner?: { username: string } }) => {
    console.log("Game ended:", data);
    const winnerName = data.winner?.username || "Unknown";
    showGameOverModal(winnerName);
});

/**
 * Handle GAME_ENDED (uppercase - from HTTP route broadcast)
 */
socket.on("GAME_ENDED", (data: { gameId: number }) => {
    console.log("Game ended via route:", data);
    showGameOverModal("The game has been ended by the owner.");
});

/**
 * Show game over modal and redirect to lobby
 */
function showGameOverModal(message: string): void {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.id = "game-over-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
        background: white;
        padding: 32px 48px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    modal.innerHTML = `
        <h2 style="margin: 0 0 16px; font-size: 24px;">🎉 Game Over!</h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: #666;">${message}</p>
        <a href="/lobby" style="
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
        ">Return to Lobby</a>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

/**
 * Handle errors
 */
socket.on("error", (error: { message?: string }) => {
    console.error("Socket error:", error);
    const errorMessage = error.message || "Unknown error";
    alert(`Error: ${errorMessage}`);
});

/**
 * Handle action confirmed by server
 */
socket.on("action:confirmed", (data: any) => {
    console.log("Action confirmed:", data);
    showActionFeedback(data.action, true);
    resetActionState();
});

/**
 * Handle action rejected by server
 */
socket.on("action:rejected", (data: any) => {
    console.log("Action rejected:", data);
    showActionFeedback(data.action, false);
    resetActionState();
});

/**
 * Send player action to server
 * @param action - The betting action to take
 * @param amount - Optional amount for raise/bet
 */
function sendPlayerAction(action: BettingAction, amount?: number): void {
    console.log("Sending action:", action, amount);
    socket.emit("player:action", {
        gameId,
        action,
        amount: amount || 0
    });
}

/**
 * Initialize when DOM ready
 */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Game page initialized");

    // Initialize player actions with callback to send actions to server
    initializePlayerActions(sendPlayerAction);

    // Request initial game state
    socket.emit("game:requestState", { gameId });

    const chatInput = document.getElementById("game-chat-input") as HTMLInputElement;
    const chatMessages = document.getElementById("game-chat-messages");

    if (chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && chatInput.value.trim()) {
                socket.emit("game-chat-message", {
                    gameId,
                    message: chatInput.value.trim(),
                });
                chatInput.value = "";
            }
        });
    }

    socket.on("game-chat-message", ({ username, message }: { username: string; message: string }) => {
        if (chatMessages) {
            const messageDiv = document.createElement("div");
            messageDiv.className = "message";
            messageDiv.textContent = `${username}: ${message}`;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
});


socket.on("connect", () => {
    socket.emit("game:requestState", { gameId });
});

socket.on("game:state", (state) => {
    console.log("GAME STATE (client):", state);

    if (state.my_cards) {
        updatePlayerHand(state.my_cards);
    }
});
