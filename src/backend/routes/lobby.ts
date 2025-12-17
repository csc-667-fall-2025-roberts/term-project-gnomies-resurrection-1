import express from "express";

const router = express.Router();

// Error message mapping for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  join_failed: "Failed to join game. Please try again.",
  game_full: "This game is full.",
  game_started: "This game has already started.",
};

router.get("/", (request, response) => {
  const { user } = request.session;
  const errorCode = request.query.error as string | undefined;

  // Get user-friendly error message from query param
  const error = errorCode !== undefined ? ERROR_MESSAGES[errorCode] || null : null;

  response.render("lobby/lobby", { user, error });
});

export default router;
