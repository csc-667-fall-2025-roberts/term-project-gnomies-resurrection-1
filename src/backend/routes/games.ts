import express from "express";
import { Server } from "socket.io";

import { GAME_CREATE, GAME_LISTING, GLOBAL_ROOM } from "../../shared/keys";
import { Games } from "../db";
import { generateGameName } from "../lib/game-names";
import logger from "../lib/logger";
import { startGame } from "../services/game-service";
import { broadcastGameStarted, broadcastGameUpdate, broadcastJoin } from "../sockets/game-socket";

const router = express.Router();

router.get("/", async (request, response) => {
  const sessionId = request.session.id;
  const userId = request.session.user!.id;

  response.status(202).send();

  const allGames = await Games.list();
  const userGames = await Games.getByUser(userId);

  // Separate games into user's games and available games
  const userGameIds = new Set(userGames.map(g => g.id));
  const myGames = allGames.filter(g => userGameIds.has(g.id));
  const availableGames = allGames.filter(g => !userGameIds.has(g.id));

  const io = request.app.get("io") as Server;

  io.to(sessionId).emit(GAME_LISTING, { myGames, availableGames });
});

router.post("/", async (request, response) => {
  try {
    const { id } = request.session.user!;
    const max_players = parseInt(request.body.max_players) || 4; // Default to 4 if not provided
    const name = request.body.name?.trim() || generateGameName();

    const game = await Games.create(id, name, max_players);
    await Games.join(game.id, id);

    const io = request.app.get("io") as Server;
    io.to(GLOBAL_ROOM).emit(GAME_CREATE, { ...game, player_count: 1 });

    response.redirect(`/games/${game.id}`);
  } catch (error: any) {
    logger.error("Error creating game:", error);
    response.redirect("/lobby");
  }
});

router.get("/:id", async (request, response) => {
  const gameId = parseInt(request.params.id);
  const user = request.session.user!;

  try {
    const game = await Games.get(gameId);
    const players = await Games.getPlayersWithStats(gameId);

    response.render("games/game", {
      ...game,
      currentUserId: user.id,
      currentUsername: user.username,
      maxPlayers: game.max_players,
      players, // Real player data!
    });
  } catch (error: any) {
    logger.error(`Error loading game ${gameId}:`, error);
    response.redirect("/lobby");
  }
});

router.post("/:game_id/join", async (request, response) => {
  const { id } = request.session.user!;
  const { game_id } = request.params;
  const gameId = parseInt(game_id);

  try {
    await Games.join(gameId, id);

    // Get updated player count
    const playerIds = await Games.getPlayerIds(gameId);
    const playerCount = playerIds.length;

    const io = request.app.get("io") as Server;

    // Broadcast to players in the game that someone joined
    broadcastJoin(io, gameId);

    // Broadcast to lobby users that this game's player count changed
    broadcastGameUpdate(io, gameId, playerCount);

    response.redirect(`/games/${game_id}`);
  } catch (error: any) {
    logger.error(`Error joining game ${gameId}:`, error);
    response.redirect("/lobby");
  }
});

/**
 * Start a game
 * Only game owner can start, requires at least 2 players
 */
router.post("/:id/start", async (request, response) => {
  const gameId = parseInt(request.params.id);
  const userId = request.session.user!.id;

  try {
    // Verify user is game owner
    const game = await Games.get(gameId);
    if (game.created_by !== userId) {
      logger.warn(`User ${userId} tried to start game ${gameId} without being owner`);
      response.status(403).redirect(`/games/${gameId}`);
      return;
    }

    // Verify game is in lobby state
    if (game.state !== "lobby") {
      logger.warn(`Attempted to start game ${gameId} that is not in lobby state`);
      response.redirect(`/games/${gameId}`);
      return;
    }

    // Start the game via service layer
    const { firstPlayerId } = await startGame(gameId);

    // Broadcast to all players in the game room
    const io = request.app.get("io") as Server;
    broadcastGameStarted(io, gameId, firstPlayerId);

    response.redirect(`/games/${gameId}`);
  } catch (error: any) {
    logger.error(`Error starting game ${gameId}:`, error);
    response.redirect(`/games/${gameId}`);
  }
});

export default router;

