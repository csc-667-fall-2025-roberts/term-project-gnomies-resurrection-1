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

        // Get room name for broadcasts
        const roomName = gameRoom(data.gameId);

        // ==================== FOLD ====================
        if (data.action === "fold") {
          // Mark player as folded (bet_amount = -1)
          await Games.updatePlayerBet(data.gameId, session.user!.id, -1);
          await Games.advanceTurn(data.gameId);

          socket.emit("action:confirmed", { action: "fold" });
          io.to(roomName).emit("player:actionTaken", {
            userId: session.user!.id,
            username: session.user!.username,
            action: "fold",
          });

          logger.info(`Player ${session.user!.id} folded in game ${data.gameId}`);
        }

        // ==================== CHECK ====================
        else if (data.action === "check") {
          const currentBet = await Games.getCurrentBet(data.gameId);
          const playerBet = await Games.getPlayerBet(data.gameId, session.user!.id);

          // Rule: can only check if there is no bet to call
          if (playerBet !== currentBet) {
            socket.emit("action:rejected", {
              action: "check",
              reason: "Cannot check when there is a bet to call",
            });
            return;
          }

          await Games.advanceTurn(data.gameId);

          socket.emit("action:confirmed", { action: "check" });
          io.to(roomName).emit("player:actionTaken", {
            userId: session.user!.id,
            username: session.user!.username,
            action: "check",
          });

          logger.info(`Player ${session.user!.id} checked in game ${data.gameId}`);
        }

        // ==================== CALL ====================
        else if (data.action === "call") {
          const currentBet = await Games.getCurrentBet(data.gameId);
          const playerBet = await Games.getPlayerBet(data.gameId, session.user!.id);
          const callAmount = currentBet - playerBet;

          if (callAmount <= 0) {
            socket.emit("action:rejected", {
              action: "call",
              reason: "Nothing to call - use check instead",
            });
            return;
          }

          // Get player stats to check chip count
          const players = await Games.getPlayersWithStats(data.gameId);
          const player = players.find(p => p.user_id === session.user!.id);
          if (player === undefined || player.chip_count < callAmount) {
            socket.emit("action:rejected", {
              action: "call",
              reason: "Not enough chips to call",
            });
            return;
          }

          // Deduct chips, update bet, add to pot
          await Games.deductChips(data.gameId, session.user!.id, callAmount);
          await Games.updatePlayerBet(data.gameId, session.user!.id, currentBet);
          const newPot = await Games.addToPot(data.gameId, callAmount);
          await Games.advanceTurn(data.gameId);

          socket.emit("action:confirmed", { action: "call", amount: callAmount });
          io.to(roomName).emit("player:actionTaken", {
            userId: session.user!.id,
            username: session.user!.username,
            action: "call",
            amount: callAmount,
            newPot,
          });

          logger.info(`Player ${session.user!.id} called $${callAmount} in game ${data.gameId}`);
        }

        // ==================== RAISE ====================
        else if (data.action === "raise") {
          const raiseToAmount = data.amount || 0;
          if (raiseToAmount <= 0) {
            socket.emit("action:rejected", {
              action: "raise",
              reason: "Invalid raise amount",
            });
            return;
          }

          const currentBet = await Games.getCurrentBet(data.gameId);
          const playerBet = await Games.getPlayerBet(data.gameId, session.user!.id);

          if (raiseToAmount <= currentBet) {
            socket.emit("action:rejected", {
              action: "raise",
              reason: `Raise must be more than current bet of $${currentBet}`,
            });
            return;
          }

          const chipsNeeded = raiseToAmount - playerBet;
          const players = await Games.getPlayersWithStats(data.gameId);
          const player = players.find(p => p.user_id === session.user!.id);
          if (player === undefined || player.chip_count < chipsNeeded) {
            socket.emit("action:rejected", {
              action: "raise",
              reason: "Not enough chips to raise",
            });
            return;
          }

          await Games.deductChips(data.gameId, session.user!.id, chipsNeeded);
          await Games.updatePlayerBet(data.gameId, session.user!.id, raiseToAmount);
          const newPot = await Games.addToPot(data.gameId, chipsNeeded);
          await Games.advanceTurn(data.gameId);

          socket.emit("action:confirmed", { action: "raise", amount: raiseToAmount });
          io.to(roomName).emit("player:actionTaken", {
            userId: session.user!.id,
            username: session.user!.username,
            action: "raise",
            amount: raiseToAmount,
            newPot,
          });

          logger.info(`Player ${session.user!.id} raised to $${raiseToAmount} in game ${data.gameId}`);
        }

        // ==================== ALL-IN ====================
        else if (data.action === "all-in") {
          const players = await Games.getPlayersWithStats(data.gameId);
          const player = players.find(p => p.user_id === session.user!.id);
          if (player === undefined) {
            socket.emit("action:rejected", {
              action: "all-in",
              reason: "Player not found",
            });
            return;
          }

          const remainingChips = player.chip_count;
          if (remainingChips <= 0) {
            socket.emit("action:rejected", {
              action: "all-in",
              reason: "No chips remaining",
            });
            return;
          }

          const newBetAmount = player.current_bet + remainingChips;
          await Games.deductChips(data.gameId, session.user!.id, remainingChips);
          await Games.updatePlayerBet(data.gameId, session.user!.id, newBetAmount);
          const newPot = await Games.addToPot(data.gameId, remainingChips);
          await Games.advanceTurn(data.gameId);

          socket.emit("action:confirmed", { action: "all-in", amount: remainingChips });
          io.to(roomName).emit("player:actionTaken", {
            userId: session.user!.id,
            username: session.user!.username,
            action: "all-in",
            amount: remainingChips,
            newPot,
          });

          logger.info(`Player ${session.user!.id} went all-in with $${remainingChips} in game ${data.gameId}`);
        }

        // ==================== ROUND ADVANCEMENT ====================
        // Check if betting round is complete after ANY action
        const isComplete = await RoundService.isBettingRoundComplete(data.gameId);
        if (isComplete) {
          console.log(`Betting round complete after ${data.action}`);
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
              // TODO: call showdown logic
              io.to(roomName).emit("hand:complete", { reason: "showdown" });
              break;
          }
        }

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
