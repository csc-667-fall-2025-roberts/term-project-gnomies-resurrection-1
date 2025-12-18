/**
 * Development Menu for Poker Game Page
 * Provides UI controls and keyboard shortcuts for testing different game states
 *
 * ⚠️ DEV ONLY - Remove before production
 * 
 * Pattern: professor_sample_code/frontend/dev-menu.ts
 * Adapted for: Texas Hold'em Poker
 */

let isOpen = false;
let confettiCount = 0;

// Sample cards for testing
const SAMPLE_CARDS = [
    { rank: "A", suit: "S" }, { rank: "K", suit: "H" }, { rank: "Q", suit: "D" },
    { rank: "J", suit: "C" }, { rank: "10", suit: "S" }, { rank: "9", suit: "H" },
    { rank: "8", suit: "D" }, { rank: "7", suit: "C" }, { rank: "6", suit: "S" },
    { rank: "5", suit: "H" }, { rank: "4", suit: "D" }, { rank: "3", suit: "C" },
    { rank: "2", suit: "S" }
];

// Initialize dev menu
document.addEventListener("DOMContentLoaded", () => {
    createDevMenu();
    setupKeyboardShortcuts();
});

function createDevMenu() {
    const menu = document.createElement("div");
    menu.id = "dev-menu";
    menu.className = "dev-menu collapsed";

    menu.innerHTML = `
    <div class="dev-menu-header">
      <span>🃏 DEV MENU - POKER</span>
      <button id="dev-menu-toggle" class="dev-menu-toggle">▼</button>
    </div>
    <div class="dev-menu-content">
      <div class="dev-menu-section">
        <h4>Turn States</h4>
        <button data-action="turn-player">Your Turn</button>
        <button data-action="turn-next">Next Player Turn</button>
        <button data-action="turn-cycle">Cycle Turns</button>
        <button data-action="turn-none">Clear Turns</button>
      </div>

      <div class="dev-menu-section">
        <h4>Hand Stages</h4>
        <button data-action="stage-preflop">Pre-Flop</button>
        <button data-action="stage-flop">Deal Flop (3)</button>
        <button data-action="stage-turn">Deal Turn (+1)</button>
        <button data-action="stage-river">Deal River (+1)</button>
        <button data-action="stage-showdown">Showdown</button>
      </div>

      <div class="dev-menu-section">
        <h4>Cards</h4>
        <button data-action="deal-hole">Deal Hole Cards</button>
        <button data-action="clear-cards">Clear All Cards</button>
        <button data-action="anim-deal">Animate Deal</button>
        <button data-action="flip-cards">Flip Cards</button>
      </div>

      <div class="dev-menu-section">
        <h4>Betting</h4>
        <button data-action="set-pot-small">Pot: $50</button>
        <button data-action="set-pot-medium">Pot: $250</button>
        <button data-action="set-pot-large">Pot: $1000</button>
        <button data-action="random-bet">Random Player Bet</button>
      </div>

      <div class="dev-menu-section">
        <h4>Player Actions</h4>
        <button data-action="fold-random">Random Fold</button>
        <button data-action="enable-actions">Enable Buttons</button>
        <button data-action="disable-actions">Disable Buttons</button>
      </div>

      <div class="dev-menu-section">
        <h4>Celebrations</h4>
        <button data-action="winner">Show Winner 🎉</button>
        <button data-action="confetti">Confetti Burst 🎊</button>
      </div>

      <div class="dev-menu-section">
        <h4>Keyboard Shortcuts</h4>
        <div class="dev-menu-help">
          <kbd>\`</kbd> Toggle menu<br>
          <kbd>T</kbd> Cycle turn<br>
          <kbd>F</kbd> Deal flop<br>
          <kbd>R</kbd> Deal turn/river<br>
          <kbd>D</kbd> Deal hole cards<br>
          <kbd>P</kbd> Random pot<br>
          <kbd>C</kbd> Confetti<br>
          <kbd>W</kbd> Show winner
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(menu);

    // Toggle button handler - explicit null check
    const toggle = document.getElementById("dev-menu-toggle");
    if (toggle !== null) {
        toggle.addEventListener("click", toggleMenu);
    }

    // Action buttons
    menu.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const action = (e.target as HTMLElement).dataset.action;
            if (action !== undefined) {
                handleAction(action);
            }
        });
    });
}

function toggleMenu() {
    const menu = document.getElementById("dev-menu");
    const toggle = document.getElementById("dev-menu-toggle");

    // Explicit null checks
    if (menu === null || toggle === null) {
        return;
    }

    isOpen = !isOpen;
    menu.classList.toggle("collapsed");
    toggle.textContent = isOpen ? "▲" : "▼";
}

function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        // Ignore if typing in input - explicit check
        const isInputTarget = e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement;

        if (isInputTarget) {
            return;
        }

        switch (e.key) {
            case "`":
                toggleMenu();
                e.preventDefault();
                break;
            case "t":
            case "T":
                handleAction("turn-cycle");
                break;
            case "f":
            case "F":
                handleAction("stage-flop");
                break;
            case "r":
            case "R":
                // Deal turn if flop shown, else river
                const communityCards = document.querySelectorAll("#community-cards .playing-card");
                if (communityCards.length === 3) {
                    handleAction("stage-turn");
                } else if (communityCards.length === 4) {
                    handleAction("stage-river");
                }
                break;
            case "d":
            case "D":
                handleAction("deal-hole");
                break;
            case "p":
            case "P":
                handleAction("set-pot-medium");
                break;
            case "c":
            case "C":
                handleAction("confetti");
                break;
            case "w":
            case "W":
                handleAction("winner");
                break;
        }
    });
}

function handleAction(action: string) {
    console.log(`[DEV] Action: ${action}`);

    switch (action) {
        // Turn states
        case "turn-player":
            clearAllTurns();
            document.querySelector(".player-controls")?.classList.remove("disabled");
            // Find first seat with current user
            const firstSeat = document.querySelector(".player-seat:not(.player-seat--empty)");
            if (firstSeat !== null) {
                firstSeat.classList.add("active-turn");
            }
            break;

        case "turn-next":
            cycleTurn();
            break;

        case "turn-cycle":
            cycleTurn();
            break;

        case "turn-none":
            clearAllTurns();
            document.querySelector(".player-controls")?.classList.add("disabled");
            break;

        // Hand stages
        case "stage-preflop":
            clearCommunityCards();
            updateGameState("pre-flop");
            break;

        case "stage-flop":
            dealCommunityCards(3);
            updateGameState("flop");
            break;

        case "stage-turn":
            // Only add 1 card if flop already dealt
            const currentCards = document.querySelectorAll("#community-cards .playing-card");
            if (currentCards.length >= 3) {
                dealCommunityCards(1, false);
                updateGameState("turn");
            } else {
                console.log("[DEV] Deal flop first!");
            }
            break;

        case "stage-river":
            const cards = document.querySelectorAll("#community-cards .playing-card");
            if (cards.length >= 4) {
                dealCommunityCards(1, false);
                updateGameState("river");
            } else {
                console.log("[DEV] Deal turn first!");
            }
            break;

        case "stage-showdown":
            updateGameState("showdown");
            createConfetti();
            break;

        // Cards
        case "deal-hole":
            dealHoleCards();
            break;

        case "clear-cards":
            clearCommunityCards();
            clearHoleCards();
            break;

        case "anim-deal":
            animateDealing();
            break;

        case "flip-cards":
            flipAllCards();
            break;

        // Betting
        case "set-pot-small":
            updatePot(50);
            break;

        case "set-pot-medium":
            updatePot(250);
            break;

        case "set-pot-large":
            updatePot(1000);
            break;

        case "random-bet":
            randomPlayerBet();
            break;

        // Player actions
        case "fold-random":
            foldRandomPlayer();
            break;

        case "enable-actions":
            document.querySelectorAll(".action-btn").forEach((btn) => {
                (btn as HTMLButtonElement).disabled = false;
            });
            document.querySelector(".player-controls")?.classList.remove("disabled");
            break;

        case "disable-actions":
            document.querySelectorAll(".action-btn").forEach((btn) => {
                (btn as HTMLButtonElement).disabled = true;
            });
            document.querySelector(".player-controls")?.classList.add("disabled");
            break;

        // Celebrations
        case "winner":
            showWinner();
            break;

        case "confetti":
            createConfetti();
            break;
    }
}

// ==================== HELPER FUNCTIONS ====================

function clearAllTurns() {
    document.querySelectorAll(".active-turn").forEach((el) => el.classList.remove("active-turn"));
}

function cycleTurn() {
    const seats = document.querySelectorAll(".player-seat:not(.player-seat--empty)");
    if (seats.length === 0) {
        return;
    }

    const currentActive = document.querySelector(".player-seat.active-turn");
    clearAllTurns();

    let nextIndex = 0;
    if (currentActive !== null) {
        const currentIndex = Array.from(seats).indexOf(currentActive);
        nextIndex = (currentIndex + 1) % seats.length;
    }

    seats[nextIndex]?.classList.add("active-turn");
}

function dealCommunityCards(count: number, clear: boolean = true) {
    const container = document.getElementById("community-cards");
    if (container === null) {
        return;
    }

    if (clear) {
        container.innerHTML = "";
    }

    const existingCount = container.querySelectorAll(".playing-card").length;

    for (let i = 0; i < count; i++) {
        const card = SAMPLE_CARDS[(existingCount + i) % SAMPLE_CARDS.length];
        const cardEl = document.createElement("div");
        cardEl.className = `playing-card rank-${card.rank} suit-${card.suit}`;
        cardEl.style.animation = `dealCard 0.3s ease ${i * 0.1}s backwards`;
        container.appendChild(cardEl);
    }
}

function clearCommunityCards() {
    const container = document.getElementById("community-cards");
    if (container !== null) {
        container.innerHTML = "";
    }
}

function dealHoleCards() {
    const container = document.getElementById("player-hand");
    if (container === null) {
        return;
    }

    container.innerHTML = "";

    // Deal 2 hole cards
    const holeCards = [
        { rank: "A", suit: "S" },
        { rank: "K", suit: "S" }
    ];

    holeCards.forEach((card, i) => {
        const cardEl = document.createElement("div");
        cardEl.className = `playing-card rank-${card.rank} suit-${card.suit}`;
        cardEl.style.animation = `dealCard 0.3s ease ${i * 0.15}s backwards`;
        container.appendChild(cardEl);
    });
}

function clearHoleCards() {
    const container = document.getElementById("player-hand");
    if (container !== null) {
        container.innerHTML = "";
    }
}

function updatePot(amount: number) {
    const potEl = document.getElementById("pot-display");
    if (potEl !== null) {
        potEl.textContent = `Pot: $${amount}`;
        potEl.classList.add("pot-updated");
        setTimeout(() => potEl.classList.remove("pot-updated"), 500);
    }
}

function updateGameState(state: string) {
    const stateEl = document.getElementById("game-state");
    if (stateEl !== null) {
        stateEl.textContent = state;
        stateEl.className = `game-state-badge game-state--${state}`;
    }
}

function randomPlayerBet() {
    const seats = document.querySelectorAll(".player-seat:not(.player-seat--empty)");
    if (seats.length === 0) {
        return;
    }

    const randomSeat = seats[Math.floor(Math.random() * seats.length)] as HTMLElement;
    const betAmount = [25, 50, 100, 200][Math.floor(Math.random() * 4)];

    let betEl = randomSeat.querySelector(".current-bet") as HTMLElement;
    if (betEl === null) {
        betEl = document.createElement("div");
        betEl.className = "current-bet";
        const labelEl = randomSeat.querySelector(".player-seat__label");
        if (labelEl !== null) {
            labelEl.appendChild(betEl);
        }
    }
    betEl.textContent = `Bet: $${betAmount}`;
}

function foldRandomPlayer() {
    const seats = document.querySelectorAll(".player-seat:not(.player-seat--empty):not(.folded)");
    if (seats.length === 0) {
        return;
    }

    const randomSeat = seats[Math.floor(Math.random() * seats.length)];
    randomSeat.classList.add("folded");
    console.log(`[DEV] Player folded`);
}

function animateDealing() {
    const cards = document.querySelectorAll(".playing-card");
    cards.forEach((card, i) => {
        setTimeout(() => {
            card.classList.add("dealing");
            setTimeout(() => card.classList.remove("dealing"), 600);
        }, i * 100);
    });
}

function flipAllCards() {
    const cards = document.querySelectorAll(".playing-card");
    cards.forEach((card) => {
        card.classList.toggle("back");
    });
}

function showWinner() {
    const seats = document.querySelectorAll(".player-seat:not(.player-seat--empty):not(.folded)");
    if (seats.length === 0) {
        return;
    }

    const winner = seats[Math.floor(Math.random() * seats.length)];
    winner.classList.add("winner");

    // Create winner announcement
    const announcement = document.createElement("div");
    announcement.className = "winner-announcement";
    announcement.innerHTML = `
    <div class="winner-text">🎉 WINNER! 🎉</div>
    <div class="winning-hand">Full House - Aces over Kings</div>
  `;
    announcement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: #fbbf24;
    padding: 2rem 3rem;
    border-radius: 1rem;
    text-align: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;
    document.body.appendChild(announcement);

    createConfetti();

    setTimeout(() => {
        announcement.remove();
        winner.classList.remove("winner");
    }, 3000);
}

function createConfetti() {
    const colors = ["#fbbf24", "#dc2626", "#22c55e", "#3b82f6", "#8b5cf6"];
    const count = 50;

    for (let i = 0; i < count; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti";
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.animationDuration = `${2 + Math.random()}s`;

        document.body.appendChild(confetti);

        // Remove after animation
        setTimeout(() => confetti.remove(), 3000);
    }

    confettiCount++;
    console.log(`[DEV] Confetti burst #${confettiCount}! 🎉`);
}
