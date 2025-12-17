/**
 * Game Permission Middleware
 * 
 * Basic checks to prevent unauthorized game actions.
 * Used for owner-only and player-only routes.
 */
import { Request, Response, NextFunction } from "express";
import * as Games from "../db/games";
import logger from "../lib/logger";

/**
 * Require user to be the game owner
 * Used for: start game, end game
 */
export async function requireGameOwner(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user!.id;

        const game = await Games.get(gameId);

        if (game.created_by !== userId) {
            logger.warn(`User ${userId} tried to perform owner action on game ${gameId}`);
            res.status(403).send("Only the game owner can perform this action");
            return;
        }

        next();
    } catch (error) {
        logger.error("Error in requireGameOwner middleware:", error);
        res.status(500).send("Server error");
    }
}

/**
 * Require user to be a player in the game
 * Used for: view game page
 */
export async function requireGamePlayer(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const gameId = parseInt(req.params.id);
        const userId = req.session.user!.id;

        const playerIds = await Games.getPlayerIds(gameId);

        if (!playerIds.includes(userId)) {
            logger.warn(`User ${userId} tried to view game ${gameId} without being a player`);
            res.status(403).send("You must be in the game to view it");
            return;
        }

        next();
    } catch (error) {
        logger.error("Error in requireGamePlayer middleware:", error);
        res.status(500).send("Server error");
    }
}
