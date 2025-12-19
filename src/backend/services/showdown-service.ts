/**
 * Showdown Service
 *
 * Evaluates player hands at showdown, distributes the pot, and ends the game.
 */

import db from "../db/connection";
import * as CommunityCards from "../db/community-cards";
import * as Games from "../db/games";
import * as PlayerCards from "../db/player-cards";
import logger from "../lib/logger";
import { determineWinners, evaluateHand, type PlayerHand } from "./hand-evaluator";

export type ShowdownResult = {
  winners: number[];
  winningHand: string;
  potShare: number;
  payouts: Array<{ userId: number; amount: number }>;
};

function calculatePayouts(pot: number, winnerIds: number[]): Array<{ userId: number; amount: number }> {
  if (winnerIds.length === 0) {
    return [];
  }

  const baseShare = Math.floor(pot / winnerIds.length);
  const remainder = pot % winnerIds.length;

  return winnerIds.map((userId, index) => ({
    userId,
    amount: baseShare + (index < remainder ? 1 : 0),
  }));
}

export async function runShowdown(gameId: number): Promise<ShowdownResult> {
  return db.tx(async () => {
    const game = await Games.get(gameId);
    const communityCards = await CommunityCards.getCommunityCards(gameId);

    if (communityCards.length < 3) {
      throw new Error("Cannot run showdown without community cards on the table");
    }

    const players = await Games.getPlayersWithStats(gameId);
    const activePlayers = players.filter((p) => p.current_bet >= 0);

    if (activePlayers.length === 0) {
      throw new Error("No active players remaining for showdown");
    }

    const playerHands: PlayerHand[] = [];

    for (const player of activePlayers) {
      const holeCards = await PlayerCards.getPlayerCards(gameId, player.user_id);

      if (holeCards.length < 2) {
        throw new Error(`Player ${player.user_id} does not have 2 hole cards`);
      }

      const evaluated = evaluateHand(holeCards, communityCards);
      playerHands.push({ userId: player.user_id, hand: evaluated });
    }

    const { winnerIds, winningHands } = determineWinners(playerHands);
    const winningHandDescr = winningHands[0]?.description ?? "Unknown hand";

    const payouts = calculatePayouts(game.pot_money, winnerIds);
    for (const payout of payouts) {
      if (payout.amount > 0) {
        await Games.addChips(gameId, payout.userId, payout.amount);
      }
    }

    if (game.pot_money > 0) {
      await Games.addToPot(gameId, -game.pot_money);
    }

    await Games.endGame(gameId);

    logger.info(
      `Showdown complete for game ${gameId}. Winners: ${winnerIds.join(", ")}. Winning hand: ${winningHandDescr}.`
    );

    return {
      winners: winnerIds,
      winningHand: winningHandDescr,
      potShare: payouts[0]?.amount ?? 0,
      payouts,
    };
  });
}
