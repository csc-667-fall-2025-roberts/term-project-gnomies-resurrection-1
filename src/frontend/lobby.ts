/**
 * Lobby Entry Point
 * 
 * Purpose: Socket connection and game listing events for the lobby page
 */

import socketIo from "socket.io-client";
import * as EVENTS from "../shared/keys";
import type { Game } from "../types/types";
import { appendGame, loadGames, renderGames, updateGamePlayerCount } from "./lobby/load-games";

const socket = socketIo();

/**
 * Handle game listing from server
 * Supports both legacy format (Game[]) and new format ({ myGames, availableGames })
 */
socket.on(EVENTS.GAME_LISTING, (data: { myGames: Game[]; availableGames: Game[] } | Game[]) => {
  console.log("Game listing received:", data);
  renderGames(data);
});

/**
 * Handle new game creation
 */
socket.on(EVENTS.GAME_CREATE, (game: Game) => {
  console.log("New game created:", game);
  appendGame(game);
});

/**
 * Handle game update (player joined/left)
 * Refresh the game list to show updated player counts
 */
socket.on(EVENTS.GAME_UPDATE, (data: { gameId: number; playerCount: number }) => {
  console.log("Game updated:", data);
  // Update the specific game's player count or reload the full list
  updateGamePlayerCount(data.gameId, data.playerCount);
});

/**
 * Handle socket errors
 */
socket.on("connect_error", (error: Error) => {
  console.error("Socket connect error:", error);
});

/**
 * Handle socket disconnect
 */
socket.on("disconnect", (reason: string) => {
  console.log("Socket disconnected:", reason);
});

/**
 * Wait for socket connection before loading games
 */
socket.on("connect", () => {
  console.log("Socket connected, loading games...");
  loadGames();
});
