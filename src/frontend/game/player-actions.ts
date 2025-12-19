/**
 * Player Action Handlers for Poker
 * 
 * Purpose: Handle player betting interactions via HTTP POST
 * 
 * ARCHITECTURE:
 * - Client sends changes via HTTP POST (this file)
 * - Server pushes updates via WebSockets (game.ts listeners)
 * - Server is sole source of truth
 * 
 * All betting actions POST to /games/:id/:action routes.
 * Server handles DB updates and broadcasts socket events.
 */

import type { BettingAction } from "./types";
import { validateRaise, formatChips } from "./betting";
import { clearTurnTimer } from "./ui-updates";

// Get game ID from server-rendered data attribute
const gameId = document.body.dataset.gameId || "";

// Track current betting state
let currentAction: BettingAction | null = null;
let raiseAmount: number = 0;
let currentMinRaise: number = 0;
let currentMaxRaise: number = 0;

// Track action buttons
let foldBtn: HTMLButtonElement | null = null;
let checkBtn: HTMLButtonElement | null = null;
let callBtn: HTMLButtonElement | null = null;
let raiseBtn: HTMLButtonElement | null = null;
let raiseInput: HTMLInputElement | null = null;
let allInBtn: HTMLButtonElement | null = null;

/**
 * Initialize betting action buttons
 * No callback needed - handlers POST directly via fetch()
 */
export function initializePlayerActions(): void {

    foldBtn = document.querySelector<HTMLButtonElement>(".btn-fold");
    checkBtn = document.querySelector<HTMLButtonElement>(".btn-check");
    callBtn = document.querySelector<HTMLButtonElement>(".btn-call");
    raiseBtn = document.querySelector<HTMLButtonElement>(".btn-raise");
    raiseInput = document.querySelector<HTMLInputElement>(".raise-input");
    allInBtn = document.querySelector<HTMLButtonElement>(".btn-all-in");

    console.log("Initializing player actions", {
        foldBtn,
        checkBtn,
        callBtn,
        raiseBtn,
    });

    // Fold button
    if (foldBtn !== null) {
        foldBtn.addEventListener("click", handleFold);
    }

    // Check button
    if (checkBtn !== null) {
        checkBtn.addEventListener("click", handleCheck);
    }

    // Call button
    if (callBtn !== null) {
        callBtn.addEventListener("click", handleCall);
    }

    // Raise button
    if (raiseBtn !== null) {
        raiseBtn.addEventListener("click", handleRaise);
    }

    // All-in button
    if (allInBtn !== null) {
        allInBtn.addEventListener("click", handleAllIn);
    }

    // Raise input - validate on change
    if (raiseInput !== null) {
        raiseInput.addEventListener("input", validateRaiseInput);
    }
}

/**
 * Handle fold action via HTTP POST
 */
async function handleFold(): Promise<void> {
    currentAction = "fold";
    disableAllActions();

    try {
        const response = await fetch(`/games/${gameId}/fold`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Fold failed");
        }

        console.log("Fold action sent successfully");
    } catch (error) {
        console.error("Fold error:", error);
        enableAllActions();
    }
}

/**
 * Handle check action via HTTP POST
 */
async function handleCheck(): Promise<void> {
    currentAction = "check";
    disableAllActions();

    try {
        const response = await fetch(`/games/${gameId}/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Check failed");
        }

        console.log("Check action sent successfully");
    } catch (error) {
        console.error("Check error:", error);
        enableAllActions();
    }
}

/**
 * Handle call action via HTTP POST
 */
async function handleCall(): Promise<void> {
    currentAction = "call";
    disableAllActions();

    try {
        const response = await fetch(`/games/${gameId}/call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Call failed");
        }

        console.log("Call action sent successfully");
    } catch (error) {
        console.error("Call error:", error);
        enableAllActions();
    }
}

/**
 * Handle raise action via HTTP POST
 */
async function handleRaise(): Promise<void> {
    if (raiseInput === null) {
        return;
    }

    const amount = parseInt(raiseInput.value, 10);

    // Use betting module validation
    const validation = validateRaise(amount, currentMinRaise, currentMaxRaise);
    if (!validation.valid) {
        showRaiseError(validation.message || "Invalid raise amount");
        return;
    }

    currentAction = "raise";
    raiseAmount = amount;
    disableAllActions();

    try {
        const response = await fetch(`/games/${gameId}/raise`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Raise failed");
        }

        console.log("Raise action sent successfully");
    } catch (error) {
        console.error("Raise error:", error);
        enableAllActions();
    }
}

/**
 * Handle all-in action via HTTP POST
 */
async function handleAllIn(): Promise<void> {
    currentAction = "all-in";
    disableAllActions();

    try {
        const response = await fetch(`/games/${gameId}/all-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "All-in failed");
        }

        console.log("All-in action sent successfully");
    } catch (error) {
        console.error("All-in error:", error);
        enableAllActions();
    }
}

/**
 * Validate raise input as user types
 */
function validateRaiseInput(): void {
    if (raiseInput === null) {
        return;
    }

    const value = raiseInput.value;
    const amount = parseInt(value, 10);

    // Remove non-numeric characters
    if (value !== "" && isNaN(amount)) {
        raiseInput.value = value.replace(/[^0-9]/g, "");
    }

    // Ensure positive
    if (amount < 0) {
        raiseInput.value = "0";
    }
}

/**
 * Show error message for raise input
 * @param message - Error message to display
 */
function showRaiseError(message: string): void {
    if (raiseInput === null) {
        return;
    }

    // Add error class
    raiseInput.classList.add("input-error");

    // Find or create error message element
    let errorEl = raiseInput.parentElement?.querySelector(".raise-error");
    if (errorEl === null || errorEl === undefined) {
        errorEl = document.createElement("span");
        errorEl.className = "raise-error";
        raiseInput.parentElement?.appendChild(errorEl);
    }
    errorEl.textContent = message;

    // Remove error after 3 seconds
    setTimeout(() => {
        raiseInput.classList.remove("input-error");
        if (errorEl !== null) {
            errorEl.textContent = "";
        }
    }, 3000);
}

/**
 * Disable all action buttons
 */
function disableAllActions(): void {
    // Clear the turn timer when action is taken
    clearTurnTimer();

    const buttons = document.querySelectorAll<HTMLButtonElement>(".action-btn");
    buttons.forEach((btn) => {
        btn.disabled = true;
    });

    if (raiseInput !== null) {
        raiseInput.disabled = true;
    }
}

/**
 * Enable all action buttons
 */
function enableAllActions(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".action-btn");
    buttons.forEach((btn) => {
        btn.disabled = false;
    });

    if (raiseInput !== null) {
        raiseInput.disabled = false;
    }
}

/**
 * Update action buttons based on game state
 * @param isMyTurn - Whether it's the current user's turn
 * @param canCheck - Whether the player can check
 * @param canCall - Whether the player can call
 * @param callAmount - Amount needed to call
 * @param minRaise - Minimum raise amount
 * @param maxRaise - Maximum raise amount (player's stack)
 */
export function updateActionButtons(
    isMyTurn: boolean,
    canCheck: boolean,
    canCall: boolean,
    callAmount: number,
    minRaise: number,
    maxRaise: number
): void {
    // Store min/max for validation in handleRaise
    currentMinRaise = minRaise;
    currentMaxRaise = maxRaise;

    // Reset current action when turn changes
    if (isMyTurn) {
        currentAction = null;
        raiseAmount = 0;
    }

    // Fold button - always available on your turn
    if (foldBtn !== null) {
        foldBtn.disabled = !isMyTurn;
        if (isMyTurn) {
            foldBtn.classList.add("enabled");
        } else {
            foldBtn.classList.remove("enabled");
        }
    }

    // Check button
    if (checkBtn !== null) {
        checkBtn.disabled = !isMyTurn || !canCheck;
        if (canCheck && isMyTurn) {
            checkBtn.classList.add("enabled");
            checkBtn.style.display = "block";
        } else {
            checkBtn.classList.remove("enabled");
            // Hide check when call is available
            if (canCall) {
                checkBtn.style.display = "none";
            }
        }
    }

    // Call button
    if (callBtn !== null) {
        callBtn.disabled = !isMyTurn || !canCall;
        if (canCall && isMyTurn) {
            callBtn.classList.add("enabled");
            callBtn.textContent = `Call $${formatChips(callAmount)}`;
            callBtn.style.display = "block";
        } else {
            callBtn.classList.remove("enabled");
            // Hide call when check is available
            if (canCheck) {
                callBtn.style.display = "none";
            }
        }
    }

    // Raise button
    if (raiseBtn !== null) {
        raiseBtn.disabled = !isMyTurn;
        if (isMyTurn) {
            raiseBtn.classList.add("enabled");
            raiseBtn.textContent = `Raise (min $${formatChips(minRaise)})`;
        } else {
            raiseBtn.classList.remove("enabled");
        }
    }

    // Raise input
    if (raiseInput !== null) {
        raiseInput.disabled = !isMyTurn;
        raiseInput.min = String(minRaise);
        raiseInput.max = String(maxRaise);
        raiseInput.placeholder = `$${formatChips(minRaise)} - $${formatChips(maxRaise)}`;

        if (isMyTurn) {
            raiseInput.value = String(minRaise);
        }
    }

    // All-in button
    if (allInBtn !== null) {
        allInBtn.disabled = !isMyTurn;
        if (isMyTurn) {
            allInBtn.classList.add("enabled");
            allInBtn.textContent = `All-In ($${formatChips(maxRaise)})`;
        } else {
            allInBtn.classList.remove("enabled");
        }
    }
}

/**
 * Get the current action (for external modules)
 * @returns Current betting action or null
 */
export function getCurrentAction(): BettingAction | null {
    return currentAction;
}

/**
 * Get the current raise amount (for external modules)
 * @returns Current raise amount
 */
export function getRaiseAmount(): number {
    return raiseAmount;
}

/**
 * Reset action state (call after server confirms action)
 */
export function resetActionState(): void {
    currentAction = null;
    raiseAmount = 0;
}

/**
 * Show action confirmation feedback
 * @param action - The action that was confirmed
 * @param success - Whether the action was successful
 */
export function showActionFeedback(action: BettingAction, success: boolean): void {
    const actionBtns = document.querySelectorAll<HTMLButtonElement>(".action-btn");

    actionBtns.forEach((btn) => {
        // Find the button that matches the action
        const btnAction = btn.dataset.action;
        if (btnAction === action) {
            if (success) {
                btn.classList.add("action-confirmed");
            } else {
                btn.classList.add("action-failed");
            }

            // Remove feedback class after animation
            setTimeout(() => {
                btn.classList.remove("action-confirmed", "action-failed");
            }, 500);
        }
    });
}
