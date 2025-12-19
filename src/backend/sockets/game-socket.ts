/**
 * Game Socket Handlers
 * 
 * Manages game-specific socket rooms and broadcasts.
 * Rooms group connections by game for isolated real-time communication.
 */
import { Server, Socket } from "socket.io";
import * as Games from "../db/games";
import logger from "../lib/logger";
import { GAME_STARTED, GAME_UPDATE, GLOBAL_ROOM, PLAYER_JOINED } from "../../shared/keys";

/**
 * Generate room name for a game
 * @param gameId - The game ID
 * @returns Room name string (e.g., "game-123")
 */
export function gameRoom(gameId: number): string {
  return `game-${gameId}`;
}

/**
 * Initialize game socket connection
 * Verifies user is a player in the game before joining room
 * 
 * @param socket - Socket.io socket instance
 * @param gameId - The game to join
 * @param userId - The user's ID
 */
export async function initGameSocket(socket: Socket, gameId: number, userId: number): Promise<void> {
  const playerIds = await Games.getPlayerIds(gameId);

  if (!playerIds.includes(userId)) {
    logger.warn(`User ${userId} tried to join game ${gameId} socket without being a player`);
    return;
  }

  socket.join(gameRoom(gameId));
  logger.info(`User ${userId} joined game ${gameId} socket room`);

  // Notify other players in the game room
  socket.to(gameRoom(gameId)).emit(PLAYER_JOINED, {
    userId,
  });
}

/**
 * Broadcast player joined event to game room
 * This notifies players in the game that someone joined
 * 
 * @param io - Socket.io server instance
 * @param gameId - The game that was joined
 */
export function broadcastJoin(io: Server, gameId: number): void {
  io.to(gameRoom(gameId)).emit(PLAYER_JOINED, { gameId });
  logger.info(`Broadcast player:joined for game ${gameId}`);
}

/**
 * Broadcast game update to lobby (global room)
 * This notifies lobby users to refresh their game lists when player counts change
 * 
 * @param io - Socket.io server instance
 * @param gameId - The game that changed
 * @param playerCount - New player count
 */
export function broadcastGameUpdate(io: Server, gameId: number, playerCount: number): void {
  io.to(GLOBAL_ROOM).emit(GAME_UPDATE, { gameId, playerCount });
  logger.info(`Broadcast games:updated for game ${gameId}, player count: ${playerCount}`);
}

/**
 * Broadcast game started event to all players
 * 
 * @param io - Socket.io server instance
 * @param gameId - The game that started
 * @param firstPlayerId - The player who acts first
 */
export function broadcastGameStarted(
  io: Server,
  gameId: number,
  firstPlayerId: number
): void {
  io.to(gameRoom(gameId)).emit(GAME_STARTED, {
    firstPlayerId,
    gameId,
  });
  logger.info(`Broadcast game:started for game ${gameId}, first player: ${firstPlayerId}`);
}
