/**
 * Betting Routes
 * 
 * API endpoints for poker betting actions.
 * All routes require authentication and validate player is in game.
 * 
 * Routes:
 * - POST /games/:id/fold
 * - POST /games/:id/check
 * - POST /games/:id/call
 * - POST /games/:id/raise
 * - POST /games/:id/all-in
 */

import { Router, Request, Response } from "express";
import * as BettingService from "../services/betting-service";
import { requireGamePlayer } from "../middleware/gamePermissions";
import logger from "../lib/logger";

const router = Router();

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
                io.to(`game-${gameId}`).emit("betting:action", {
                    userId,
                    action: "fold",
                    nextPlayerId: result.nextPlayerId,
                });
            }

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
                io.to(`game-${gameId}`).emit("betting:action", {
                    userId,
                    action: "check",
                    nextPlayerId: result.nextPlayerId,
                });
            }

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
                io.to(`game-${gameId}`).emit("betting:action", {
                    userId,
                    action: "call",
                    amount: result.amount,
                    newPot: result.newPot,
                    newChips: result.newChips,
                    nextPlayerId: result.nextPlayerId,
                });
            }

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
                io.to(`game-${gameId}`).emit("betting:action", {
                    userId,
                    action: "raise",
                    amount: result.amount,
                    newPot: result.newPot,
                    newChips: result.newChips,
                    nextPlayerId: result.nextPlayerId,
                });
            }

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
                io.to(`game-${gameId}`).emit("betting:action", {
                    userId,
                    action: "all-in",
                    amount: result.amount,
                    newPot: result.newPot,
                    newChips: result.newChips,
                    nextPlayerId: result.nextPlayerId,
                });
            }

            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "All-in failed";
            logger.error(`All-in error in game ${gameId}: ${message}`);
            res.status(400).json({ error: message });
        }
    }
);

export default router;
