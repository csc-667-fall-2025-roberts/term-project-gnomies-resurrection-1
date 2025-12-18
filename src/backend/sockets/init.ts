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
import * as RoundService from "../services/round-service";




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


        socket.emit("game:state", {
          ...game,
          players,
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

    // Handle player actions (fold, check, call, raise)
    socket.on("player:action", async (data: { gameId: number; action: string; amount?: number }) => {
      try {
        const game = await Games.get(data.gameId);

        console.log("RECEIVED player action (before turn validation and state validations):", {
          user: session.user!.username,
          data,
        });

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

        // ==================== CHECK ====================
        if (data.action === "check") {
          const currentBet = await Games.getCurrentBet(data.gameId);
          const playerBet = await Games.getPlayerBet(
            data.gameId,
            session.user!.id
          );

          // Rule: can only check if there is no bet to call
          if (playerBet !== currentBet) {
            socket.emit("action:rejected", {
              action: "check",
              reason: "Cannot check when there is a bet to call",
            });
            return;
          }

          // Advance turn (no chips move)
          await Games.advanceTurn(data.gameId);

          // Broadcast action
          const roomName = gameRoom(data.gameId);
          io.to(roomName).emit("player:actionTaken", {
            userId: session.user!.id,
            username: session.user!.username,
            action: "check",
          });

          // Detect end of betting round
          if (await Games.areAllBetsEqual(data.gameId)) {
            console.log("Betting round complete (check)");

          // After advancing the turn
          const isComplete = await RoundService.isBettingRoundComplete(data.gameId);

          if (isComplete) {
            const updatedGame = await Games.get(data.gameId);

            let dealResult;

            switch (updatedGame.state) {
              case "pre-flop":
                dealResult = await RoundService.dealFlop(data.gameId);
                io.to(roomName).emit("flop:revealed", dealResult);
                break;

              case "flop":
                dealResult = await RoundService.dealTurn(data.gameId);
                io.to(roomName).emit("turn:revealed", dealResult);
                break;

              case "turn":
                dealResult = await RoundService.dealRiver(data.gameId);
                io.to(roomName).emit("river:revealed", dealResult);
                break;

              case "river":
                // call showdown later
                break;
            }
          }

          }

          return;
        }

                // ==================== OTHER ACTIONS (later) ====================
        // fold / call / raise / all in will go here in future phases

      } catch (error) {
        logger.error(
          `Error processing action for user ${session.user!.id}:`,
          error
        );
        socket.emit("action:rejected", {
          action: data.action,
          reason: "Server error",
        });
      }
    });

    // Handle socket disconnect - notify game rooms
    socket.on("disconnect", () => {
      logger.info(`socket for user ${session.user!.username} disconnected`);
    });
  });

  return io;
};
