/**
 * Round Progression Service
 *
 * Handles betting round completion and community card dealing.
 */

import db from "../db/connection";
import * as Games from "../db/games";
import * as PlayerCards from "../db/player-cards";
import * as CommunityCards from "../db/community-cards";
import type { DbClient } from "../db/games";
import logger from "../lib/logger";

// Check if betting round is complete
// All non folded players must have equal bets that are != 0
export async function isBettingRoundComplete(gameId: number): Promise<boolean> {
  const players = await Games.getPlayersWithStats(gameId);
  const active = players.filter(p => p.current_bet >= 0);

  if (active.length === 0) return true;

  // Everyone must have acted
  if (!active.every(p => p.has_acted)) return false;

  // Everyone must have matched the bet
  const maxBet = Math.max(...active.map(p => p.current_bet));
  return active.every(p => p.current_bet === maxBet);
  
}

// Reset all player bets to zero
async function resetBets(gameId: number): Promise<void> {
  await Games.resetBets(gameId);
}

// Deal  flop (3 community cards)
export async function dealFlop(gameId: number) {
  return dealCommunityCards(gameId, "pre-flop", "flop", 3);
}

// Deal turn (1 community card)
export async function dealTurn(gameId: number) {
  return dealCommunityCards(gameId, "flop", "turn", 1);
}

// Deal river (1 community card)
export async function dealRiver(gameId: number) {
  return dealCommunityCards(gameId, "turn", "river", 1);
}

// Interface for all dealing functions (dealFlop, dealTurn, dealRiver). This does the actual work of dealing community cards.
function dealCommunityCards(
  gameId: number,
  expectedState: string,
  nextState: string,
  count: number
) {
  return db.tx(async (t) => {
    const dbClient = t as DbClient;
    const game = await Games.get(gameId, dbClient);

    if (game.state !== expectedState) {
      throw new Error(
        `Invalid state transition: expected ${expectedState}, got ${game.state}`
      );
    }

    // Pull cards from deck (includes both player_card id and card_id)
    const cards = await PlayerCards.getCardsFromDeck(gameId, count, dbClient);
    if (cards.length !== count) {
      throw new Error("Deck exhausted while dealing community cards");
    }

    // Bulk insert community cards using new module
    const cardIds = cards.map(c => c.card_id);
    await CommunityCards.addCommunityCards(gameId, cardIds, dbClient);

    // Advance game state
    await Games.updateGameState(gameId, nextState, dbClient);

    // Reset bets for new round 
    await Games.resetBets(gameId, dbClient);

    // Reset everyone "has_acted" attribute
    await Games.resetHasActed(gameId, dbClient);


    // Fetch full card details for socket payload
    const communityCards = await CommunityCards.getCommunityCards(gameId, dbClient);

    logger.info(
      `Game ${gameId}: advanced to ${nextState}, dealt ${count} card(s)`
    );

    return {
      state: nextState,
      community_cards: communityCards,
    };
  });
}
