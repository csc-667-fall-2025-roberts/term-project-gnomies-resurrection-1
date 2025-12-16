import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { GLOBAL_ROOM } from "../../shared/keys";
import { User } from "../../types/types";
import { sessionMiddleware } from "../config/session";
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

    socket.on("close", () => {
      logger.info(`socket for user ${session.user!.username} closed`);
    });
  });

  return io;
};
