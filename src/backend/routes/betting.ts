/**
 * Betting Routes
 * 
 * API endpoints for poker betting actions.
 * All routes require authentication and validate player is in game.
 * 
 * - Client sends changes via HTTP POST (these routes)
 * - Server pushes updates via WebSockets (socket broadcasts after DB updates)
 * - Server is sole source of truth
 * 
 * Routes:
 * - POST /games/:id/fold
 * - POST /games/:id/check
 * - POST /games/:id/call
 * - POST /games/:id/raise
 * - POST /games/:id/all-in
 */

import { Router, Request, Response } from "express";
import { Server } from "socket.io";
import {
    BETTING_ACTION,
    FLOP_REVEALED,
    HAND_COMPLETE,
    RIVER_REVEALED,
    TURN_REVEALED,
    GAME_STATE,
} from "../../shared/keys";
import * as BettingService from "../services/betting-service";
import * as RoundService from "../services/round-service";
import * as Games from "../db/games";
import * as CommunityCards from "../db/community-cards";
import { runShowdown } from "../services/showdown-service";
import { requireGamePlayer } from "../middleware/gamePermissions";
import logger from "../lib/logger";

const router = Router();

async function broadcastFullState(io: Server, gameId: number) {
    const game = await Games.get(gameId);
    const players = await Games.getPlayersWithStats(gameId);
    const communityCards = await CommunityCards.getCommunityCards(gameId);
  
    io.to(`game-${gameId}`).emit(GAME_STATE, {
      ...game,
      players,
      community_cards: communityCards,
    });
  }
  

/**
 * Check if betting round is complete and advance to next round
 * This is called after every betting action
 */
async function checkAndAdvanceRound(io: Server | undefined, gameId: number): Promise<void> {
    if (io === undefined) {
        return;
    }

    // Debug logger
    const players = await Games.getPlayersWithStats(gameId);
    logger.info(
        JSON.stringify(
          players.map(p => ({
            user: p.user_id,
            bet: p.current_bet,
            acted: p.has_acted
          })),
          null,
          2
        )
      );  

    const isComplete = await RoundService.isBettingRoundComplete(gameId);
    if (!isComplete) {
        return;
    }

    logger.info(`[ROUND CHECK RESULT] isComplete=${isComplete}`);


    const game = await Games.get(gameId);
    const roomName = `game-${gameId}`;
    let dealResult;

    switch (game.state) {
        case "pre-flop":
            dealResult = await RoundService.dealFlop(gameId);
            io.to(roomName).emit(FLOP_REVEALED, dealResult);
            logger.info(`Game ${gameId}: Dealt flop`);
            await broadcastFullState(io, gameId);
            break;

        case "flop":
            dealResult = await RoundService.dealTurn(gameId);
            io.to(roomName).emit(TURN_REVEALED, dealResult);
            logger.info(`Game ${gameId}: Dealt turn`);
            await broadcastFullState(io, gameId);
            break;

        case "turn":
            dealResult = await RoundService.dealRiver(gameId);
            io.to(roomName).emit(RIVER_REVEALED, dealResult);
            logger.info(`Game ${gameId}: Dealt river`);
            await broadcastFullState(io, gameId);
            break;

        case "river":
            {
                const showdown = await runShowdown(gameId);
                io.to(roomName).emit(HAND_COMPLETE, { reason: "showdown", ...showdown });
                logger.info(`Game ${gameId}: Hand complete, showdown`);
                await broadcastFullState(io, gameId);
            }
            break;
    }
}

/**
 * POST /games/:id/fold
 * Player folds their hand
 */
router.post(
    "/:id/fold",
    requireGamePlayer,
    async (req: Request, res: Response) => {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user?.id;

        if (userId === undefined) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        try {
            const result = await BettingService.fold(gameId, userId);

            // Emit socket event to game room
            const io = req.app.get("io");
            if (io !== undefined) {
                io.to(`game-${gameId}`).emit(BETTING_ACTION, {
                    userId,
                    action: "fold",
                    nextPlayerId: result.nextPlayerId,
                });
            }

            // Check if betting round is complete and advance
            await checkAndAdvanceRound(io, gameId);

            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Fold failed";
            logger.error(`Fold error in game ${gameId}: ${message}`);
            res.status(400).json({ error: message });
        }
    }
);

/**
 * POST /games/:id/check
 * Player checks (passes without betting)
 */
router.post(
    "/:id/check",
    requireGamePlayer,
    async (req: Request, res: Response) => {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user?.id;

        if (userId === undefined) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        try {
            const result = await BettingService.check(gameId, userId);

            // Emit socket event to game room
            const io = req.app.get("io");
            if (io !== undefined) {
                io.to(`game-${gameId}`).emit(BETTING_ACTION, {
                    userId,
                    action: "check",
                    nextPlayerId: result.nextPlayerId,
                });
            }

            // Check if betting round is complete and advance
            await checkAndAdvanceRound(io, gameId);

            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Check failed";
            logger.error(`Check error in game ${gameId}: ${message}`);
            res.status(400).json({ error: message });
        }
    }
);

/**
 * POST /games/:id/call
 * Player calls (matches current bet)
 */
router.post(
    "/:id/call",
    requireGamePlayer,
    async (req: Request, res: Response) => {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user?.id;

        if (userId === undefined) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        try {
            const result = await BettingService.call(gameId, userId);

            // Emit socket event to game room
            const io = req.app.get("io");
            if (io !== undefined) {
                io.to(`game-${gameId}`).emit(BETTING_ACTION, {
                    userId,
                    action: "call",
                    amount: result.amount,
                    newPot: result.newPot,
                    newChips: result.newChips,
                    nextPlayerId: result.nextPlayerId,
                });
            }

            // Check if betting round is complete and advance
            await checkAndAdvanceRound(io, gameId);

            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Call failed";
            logger.error(`Call error in game ${gameId}: ${message}`);
            res.status(400).json({ error: message });
        }
    }
);

/**
 * POST /games/:id/raise
 * Player raises (increases bet)
 * Body: { amount: number } - The total amount to raise TO
 */
router.post(
    "/:id/raise",
    requireGamePlayer,
    async (req: Request, res: Response) => {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user?.id;
        const { amount } = req.body;

        if (userId === undefined) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        // Validate amount
        if (amount === undefined || typeof amount !== "number" || amount <= 0) {
            res.status(400).json({ error: "Invalid raise amount" });
            return;
        }

        try {
            const result = await BettingService.raise(gameId, userId, amount);

            // Emit socket event to game room
            const io = req.app.get("io");
            if (io !== undefined) {
                io.to(`game-${gameId}`).emit(BETTING_ACTION, {
                    userId,
                    action: "raise",
                    amount: result.amount,
                    newPot: result.newPot,
                    newChips: result.newChips,
                    nextPlayerId: result.nextPlayerId,
                });
            }

            // Check if betting round is complete and advance
            await checkAndAdvanceRound(io, gameId);

            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Raise failed";
            logger.error(`Raise error in game ${gameId}: ${message}`);
            res.status(400).json({ error: message });
        }
    }
);

/**
 * POST /games/:id/all-in
 * Player goes all-in (bets all remaining chips)
 */
router.post(
    "/:id/all-in",
    requireGamePlayer,
    async (req: Request, res: Response) => {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user?.id;

        if (userId === undefined) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        try {
            const result = await BettingService.allIn(gameId, userId);

            // Emit socket event to game room
            const io = req.app.get("io");
            if (io !== undefined) {
                io.to(`game-${gameId}`).emit(BETTING_ACTION, {
                    userId,
                    action: "all-in",
                    amount: result.amount,
                    newPot: result.newPot,
                    newChips: result.newChips,
                    nextPlayerId: result.nextPlayerId,
                });
            }

            // Check if betting round is complete and advance
            await checkAndAdvanceRound(io, gameId);

            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "All-in failed";
            logger.error(`All-in error in game ${gameId}: ${message}`);
            res.status(400).json({ error: message });
        }
    }
);

export default router;
