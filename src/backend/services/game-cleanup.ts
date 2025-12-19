import * as Games from "../db/games";
import logger from "../lib/logger";

 // 3 minutes
const CLEANUP_DELAY_MS = 3 * 60 * 1000;

const scheduled = new Set<number>();

export function scheduleGameCleanup(gameId: number) {
  if (scheduled.has(gameId)) {
    return;
  }

  scheduled.add(gameId);

  setTimeout(async () => {
    try {
      await Games.deleteGameCompletely(gameId);
      logger.info(`Game ${gameId} cleaned up after showdown`);
    } catch (err) {
      logger.error(`Failed to clean up game ${gameId}`, err);
    } finally {
      scheduled.delete(gameId);
    }
  }, CLEANUP_DELAY_MS);
}
