import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { GLOBAL_ROOM } from "../../shared/keys";
import { User } from "../../types/types";
import { sessionMiddleware } from "../config/session";
import { Games } from "../db";
import logger from "../lib/logger";
import { gameRoom, initGameSocket } from "./game-socket";
import { sanitizeString } from "../utils/sanitize";
import * as PlayerCards from "../db/player-cards";
import * as CommunityCards from "../db/community-cards";

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
        const myCards = await PlayerCards.getPlayerCards(parsedGameId, session.user!.id);
        const communityCards = await CommunityCards.getCommunityCards(parsedGameId);

        socket.emit("game:state", {
          ...game,
          players,
          community_cards: communityCards,
          is_my_turn: game.current_turn_user_id === session.user!.id,
          my_cards: myCards,
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

    // NOTE: Player betting actions (fold/check/call/raise/all-in) are handled
    // via HTTP POST routes in src/backend/routes/betting.ts
    // "Client sends changes via HTTP POST"
    // Socket listeners are for server→client broadcasts only.
    // The HTTP routes handle round advancement and emit socket events.

    // Handle socket disconnect - notify game rooms
    socket.on("disconnect", () => {
      logger.info(`socket for user ${session.user!.username} disconnected`);
    });
  });

  return io;
};
