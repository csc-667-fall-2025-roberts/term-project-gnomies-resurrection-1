import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { GLOBAL_ROOM } from "../../shared/keys";
import { User } from "../../types/types";
import { sessionMiddleware } from "../config/session";
import { Games } from "../db";
import logger from "../lib/logger";
import { gameRoom, initGameSocket } from "./game-socket";

export const initSockets = (httpServer: HTTPServer) => {
  const io = new Server(httpServer);

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket) => {
    // @ts-expect-error session is attached by middleware
    const session = socket.request.session as { id: string; user?: User };

    // Guard against invalid/expired sessions
    if (!session.user) {
      socket.disconnect();
      return;
    }

    logger.info(`socket for user ${session.user.username} established`);

    socket.join(session.id);
    socket.join(GLOBAL_ROOM);

    // Auto-join game room if gameId provided in query params
    const gameId = socket.handshake.query.gameId as string;
    if (gameId) {
      initGameSocket(socket, parseInt(gameId), session.user.id).catch((error) => {
        logger.error(`Failed to join game room for user ${session.user!.id}:`, error);
      });
    }

    // Handle game state request - return full game state to requesting client
    socket.on("game:requestState", async ({ gameId }: { gameId: string | number }) => {
      try {
        const parsedGameId = typeof gameId === "string" ? parseInt(gameId) : gameId;
        const game = await Games.get(parsedGameId);
        const players = await Games.getPlayersWithStats(parsedGameId);

        socket.emit("game:state", {
          ...game,
          players,
          is_my_turn: game.current_turn_user_id === session.user!.id,
        });
      } catch (error) {
        logger.error(`Error fetching game state for game ${gameId}:`, error);
        socket.emit("error", { message: "Failed to fetch game state" });
      }
    });

    socket.on("leave-game-room", (gameId: number) => {
      const roomName = gameRoom(gameId);
      socket.leave(roomName);
      logger.info(`User ${session.user!.username} left game room: ${roomName}`);

      socket.to(roomName).emit("player-left", {
        username: session.user!.username,
        userId: session.user!.id,
      });
    });

    socket.on("game-chat-message", ({ gameId, message }: { gameId: number; message: string }) => {
      const roomName = gameRoom(gameId);
      io.to(roomName).emit("game-chat-message", {
        username: session.user!.username,
        userId: session.user!.id,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle socket disconnect - notify game rooms and remove from database
    socket.on("disconnect", async () => {
      logger.info(`socket for user ${session.user!.username} disconnected`);

      // If user was in a game room (from query params), handle leaving
      if (gameId) {
        const parsedGameId = parseInt(gameId);
        const roomName = gameRoom(parsedGameId);

        try {
          // Check if game is in lobby state - if so, remove player from database
          const game = await Games.get(parsedGameId);
          if (game.state === "lobby") {
            // Remove player from database
            await Games.leave(parsedGameId, session.user!.id);
            logger.info(`Removed user ${session.user!.username} from game ${parsedGameId} (lobby state)`);

            // Get updated player count for lobby broadcast
            const playerIds = await Games.getPlayerIds(parsedGameId);

            // Broadcast to lobby that player count changed
            io.to(GLOBAL_ROOM).emit("games:updated", {
              gameId: parsedGameId,
              playerCount: playerIds.length
            });
          }
        } catch (error) {
          logger.error(`Error handling disconnect for user ${session.user!.id} from game ${parsedGameId}:`, error);
        }

        // Notify other players in the game room
        io.to(roomName).emit("player-left", {
          username: session.user!.username,
          userId: session.user!.id,
        });
        logger.info(`Broadcast player-left to room ${roomName} for user ${session.user!.username}`);
      }
    });
  });

  return io;
};
