import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { GLOBAL_ROOM } from "../../shared/keys";
import { User } from "../../types/types";
import { sessionMiddleware } from "../config/session";
import { Games } from "../db";
import logger from "../lib/logger";
import { gameRoom, initGameSocket } from "./game-socket";
import { sanitizeString } from "../utils/sanitize";

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
      // Sanitize chat message to prevent XSS
      const sanitizedMessage = sanitizeString(message);

      io.to(roomName).emit("game-chat-message", {
        username: session.user!.username,
        userId: session.user!.id,
        message: sanitizedMessage,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle player actions (fold, check, call, raise)
    socket.on("player:action", async (data: { gameId: number; action: string; amount?: number }) => {
      try {
        const game = await Games.get(data.gameId);

        // Validate it's the player's turn
        if (game.current_turn_user_id !== session.user!.id) {
          socket.emit("action:rejected", {
            action: data.action,
            reason: "Not your turn",
          });
          return;
        }

        // Validate game is in a betting state
        if (!["pre-flop", "flop", "turn", "river"].includes(game.state)) {
          socket.emit("action:rejected", {
            action: data.action,
            reason: "Game not in betting state",
          });
          return;
        }

        // Validate action type
        const validActions = ["fold", "check", "call", "raise", "all-in"];
        if (!validActions.includes(data.action)) {
          socket.emit("action:rejected", {
            action: data.action,
            reason: "Invalid action",
          });
          return;
        }

        // TODO (Phase 3): Process the action
        // - fold: set player as folded, advance turn
        // - check: advance turn (if no bet to call)
        // - call: deduct chips, add to pot, advance turn
        // - raise: validate amount, deduct chips, add to pot, advance turn
        // - all-in: move all chips to pot

        // For now, just confirm the action was received
        socket.emit("action:confirmed", { action: data.action });
        logger.info(`User ${session.user!.id} performed ${data.action} in game ${data.gameId}`);

        // Broadcast to all players in the game room that an action was taken
        const roomName = gameRoom(data.gameId);
        io.to(roomName).emit("player:actionTaken", {
          userId: session.user!.id,
          username: session.user!.username,
          action: data.action,
          amount: data.amount,
        });

      } catch (error) {
        logger.error(`Error processing action for user ${session.user!.id}:`, error);
        socket.emit("action:rejected", {
          action: data.action,
          reason: "Server error",
        });
      }
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
