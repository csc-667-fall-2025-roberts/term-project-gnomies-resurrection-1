import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { GLOBAL_ROOM } from "../../shared/keys";
import { User } from "../../types/types";
import { sessionMiddleware } from "../config/session";
import logger from "../lib/logger";

export const initSockets = (httpServer: HTTPServer) => {
  const io = new Server(httpServer);

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket) => {
    // @ts-ignore
    const session = socket.request.session as { id: string; user: User };

    logger.info(`socket for user ${session.user.username} established`);

    socket.join(session.id);
    socket.join(GLOBAL_ROOM);

    socket.on("join-game-room", (gameId: number) => {
      const roomName = `game-${gameId}`;
      socket.join(roomName);
      logger.info(`User ${session.user.username} joined game room: ${roomName}`);

      socket.to(roomName).emit("player-joined", {
        username: session.user.username,
        userId: session.user.id,
      });
    });

    socket.on("leave-game-room", (gameId: number) => {
      const roomName = `game-${gameId}`;
      socket.leave(roomName);
      logger.info(`User ${session.user.username} left game room: ${roomName}`);
      
      socket.to(roomName).emit("player-left", {
        username: session.user.username,
        userId: session.user.id,
      });
    });

    socket.on("game-chat-message", ({ gameId, message }: { gameId: number; message: string }) => {
      const roomName = `game-${gameId}`;
      io.to(roomName).emit("game-chat-message", {
        username: session.user.username,
        userId: session.user.id,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("close", () => {
      logger.info(`socket for user ${session.user.username} closed`);
    });
  });

  return io;
};
