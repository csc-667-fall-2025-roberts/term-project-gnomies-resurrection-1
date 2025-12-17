/**
 * Load Games Module
 * 
 * Purpose: Fetch and render game listings for the lobby
 * Handles two separate lists: "Your Games" and "Available Games"
 */

import { Game } from "../../types/types";

// Cache DOM elements
const myGameListing = document.querySelector<HTMLDivElement>("#my-game-list");
const availableGameListing = document.querySelector<HTMLDivElement>("#available-game-list");
const gameItemTemplate = document.querySelector<HTMLTemplateElement>("#game-listing-template");

/**
 * Fetch games from server
 */
export const loadGames = (): void => {
  fetch("/games", { credentials: "include" });
};

/**
 * Create a game list item element
 * @param game - Game data
 * @param isMyGame - Whether this is the current user's game
 * @returns Document fragment with game item
 */
const createGameElement = (game: Game, isMyGame: boolean = false): DocumentFragment => {
  if (gameItemTemplate === null) {
    throw new Error("Game item template not found");
  }

  const gameItem = gameItemTemplate.content.cloneNode(true) as DocumentFragment;

  // Get the root element and add data-game-id for real-time updates
  const gameItemEl = gameItem.querySelector(".game-item") as HTMLElement | null;
  if (gameItemEl !== null) {
    gameItemEl.dataset.gameId = String(game.id);
  }

  // Set game name
  const nameEl = gameItem.querySelector(".game-name");
  if (nameEl !== null) {
    nameEl.textContent = game.name ?? `Game ${game.id}`;
  }

  // Set game state with data attribute for color coding
  const stateEl = gameItem.querySelector(".game-state") as HTMLElement | null;
  if (stateEl !== null) {
    stateEl.textContent = game.state;
    stateEl.dataset.state = game.state;
  }

  // Set player count in format "3/8 players"
  const playerCount = (game as any).player_count ?? 0;
  const playersEl = gameItem.querySelector(".max-players");
  if (playersEl !== null) {
    playersEl.textContent = `${playerCount}/${game.max_players} players`;
  }

  // Configure form method/action and button text based on game ownership
  const form = gameItem.querySelector("form");
  const button = gameItem.querySelector("button");

  if (form !== null && button !== null) {
    if (isMyGame) {
      form.method = "get";
      form.action = `/games/${game.id}`;
      button.textContent = "Rejoin";
    } else {
      form.method = "post";
      form.action = `/games/${game.id}/join`;
      button.textContent = "Join";
    }
  }

  return gameItem;
};

/**
 * Render games to both lists
 * @param data - Object containing myGames and availableGames arrays
 */
export const renderGames = (data: { myGames: Game[]; availableGames: Game[] } | Game[]): void => {
  // Handle both new format and legacy format
  let myGames: Game[] = [];
  let availableGames: Game[] = [];

  if (Array.isArray(data)) {
    // Legacy format: single array - treat all as available
    availableGames = data;
  } else {
    // New format: separate arrays
    myGames = data.myGames ?? [];
    availableGames = data.availableGames ?? [];
  }

  // Render user's games
  if (myGameListing !== null) {
    if (myGames.length === 0) {
      myGameListing.innerHTML = '<p class="empty-state">No games yet. Create one to get started!</p>';
    } else {
      myGameListing.replaceChildren(...myGames.map((g) => createGameElement(g, true)));
    }
  }

  // Render available games
  if (availableGameListing !== null) {
    if (availableGames.length === 0) {
      availableGameListing.innerHTML = '<p class="empty-state">No available games to join.</p>';
    } else {
      availableGameListing.replaceChildren(...availableGames.map((g) => createGameElement(g, false)));
    }
  }
};

/**
 * Append a newly created game to the available list
 * @param game - New game data
 */
export const appendGame = (game: Game): void => {
  if (availableGameListing !== null && gameItemTemplate !== null) {
    availableGameListing.appendChild(createGameElement(game, false));

    // Remove empty state message if it exists
    const emptyState = availableGameListing.querySelector(".empty-state");
    if (emptyState !== null) {
      emptyState.remove();
    }
  }
};

/**
 * Update a specific game's player count in the lobby display
 * @param gameId - The game ID to update
 * @param playerCount - The new player count
 */
export const updateGamePlayerCount = (gameId: number, playerCount: number): void => {
  // Find the game element in both lists
  const gameElements = document.querySelectorAll<HTMLElement>(`[data-game-id="${gameId}"]`);

  if (gameElements.length === 0) {
    // Game not found in current view, reload the full list
    loadGames();
    return;
  }

  gameElements.forEach((gameEl) => {
    const playersEl = gameEl.querySelector(".max-players");
    if (playersEl !== null) {
      // Get max players from the current text (e.g., "2/4 players" -> 4)
      const currentText = playersEl.textContent || "";
      const maxMatch = currentText.match(/\/(\d+)/);
      const maxPlayers = maxMatch ? maxMatch[1] : "4";
      playersEl.textContent = `${playerCount}/${maxPlayers} players`;
    }
  });
};
