/**
 * Hand Evaluator (in-repo, no external deps)
 *
 * Computes best 5-card poker hands from 7 cards and compares them.
 */

export type Card = { rank: string; suit: string };

type NormalizedCard = { rank: number; suit: string };

export enum HandCategory {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
}

export type EvaluatedHand = {
  category: HandCategory;
  ranks: number[]; // tie-breaker ranks, ordered descending
  name: string;
  description: string;
};

export type PlayerHand = {
  userId: number;
  hand: EvaluatedHand;
};

const RANK_VALUE: Record<string, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  T: 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

const RANK_NAME: Record<number, string> = {
  14: "Ace",
  13: "King",
  12: "Queen",
  11: "Jack",
  10: "Ten",
  9: "Nine",
  8: "Eight",
  7: "Seven",
  6: "Six",
  5: "Five",
  4: "Four",
  3: "Three",
  2: "Two",
};

const VALID_SUITS = ["h", "d", "c", "s"];

function normalizeCard(card: Card): NormalizedCard {
  const rank = RANK_VALUE[card.rank.toUpperCase()];
  if (rank === undefined) {
    throw new Error(`Unsupported card rank: ${card.rank}`);
  }

  const suit = card.suit.toLowerCase();
  if (!VALID_SUITS.includes(suit)) {
    throw new Error(`Unsupported card suit: ${card.suit}`);
  }

  return { rank, suit };
}

function getUniqueRanksDesc(cards: NormalizedCard[]): number[] {
  const seen = new Set<number>();
  const unique: number[] = [];
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  for (const card of sorted) {
    if (!seen.has(card.rank)) {
      seen.add(card.rank);
      unique.push(card.rank);
    }
  }

  return unique;
}

function findStraightHigh(uniqueRanksDesc: number[]): number | null {
  if (uniqueRanksDesc.length < 5) {
    return null;
  }

  const ranks = uniqueRanksDesc.includes(14)
    ? [...uniqueRanksDesc, 1] // wheel support
    : uniqueRanksDesc;

  let run = 1;
  let best: number | null = null;

  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i - 1] - 1 === ranks[i]) {
      run += 1;
    } else {
      run = 1;
    }

    if (run >= 5) {
      const high = ranks[i - 4];
      if (best === null || high > best) {
        best = high;
      }
    }
  }

  return best;
}

function straightRanks(high: number): number[] {
  // Wheel straight high=5 yields [5,4,3,2,1] (Ace low represented as 1)
  return [high, high - 1, high - 2, high - 3, high - 4].map((r) => (r === 1 ? 1 : r));
}

function compareRankLists(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left > right) {
      return 1;
    }
    if (left < right) {
      return -1;
    }
  }
  return 0;
}

function rankLabel(rank: number): string {
  return RANK_NAME[rank] ?? rank.toString();
}

function describe(category: HandCategory, ranks: number[]): { name: string; description: string } {
  switch (category) {
    case HandCategory.STRAIGHT_FLUSH: {
      const isRoyal = ranks[0] === 14 && ranks[4] === 10;
      const highName = rankLabel(ranks[0] === 1 ? 5 : ranks[0]);
      return isRoyal
        ? { name: "Royal Flush", description: "Royal Flush" }
        : { name: "Straight Flush", description: `Straight Flush, ${highName} high` };
    }
    case HandCategory.FOUR_OF_A_KIND:
      return {
        name: "Four of a Kind",
        description: `Four of a Kind, ${rankLabel(ranks[0])}s`,
      };
    case HandCategory.FULL_HOUSE:
      return {
        name: "Full House",
        description: `${rankLabel(ranks[0])}s full of ${rankLabel(ranks[1])}s`,
      };
    case HandCategory.FLUSH:
      return {
        name: "Flush",
        description: `Flush, ${rankLabel(ranks[0])} high`,
      };
    case HandCategory.STRAIGHT:
      return {
        name: "Straight",
        description: `Straight, ${rankLabel(ranks[0] === 1 ? 5 : ranks[0])} high`,
      };
    case HandCategory.THREE_OF_A_KIND:
      return {
        name: "Three of a Kind",
        description: `Three of a Kind, ${rankLabel(ranks[0])}s`,
      };
    case HandCategory.TWO_PAIR:
      return {
        name: "Two Pair",
        description: `${rankLabel(ranks[0])}s and ${rankLabel(ranks[1])}s`,
      };
    case HandCategory.ONE_PAIR:
      return {
        name: "One Pair",
        description: `Pair of ${rankLabel(ranks[0])}s`,
      };
    default:
      return {
        name: "High Card",
        description: `High Card, ${rankLabel(ranks[0])}`,
      };
  }
}

/**
 * Evaluate a player's hand using in-repo ranking logic.
 * Requires at least 5 total cards (2 hole + 3+ community).
 */
export function evaluateHand(holeCards: Card[], communityCards: Card[]): EvaluatedHand {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    throw new Error("At least 5 cards are required to evaluate a hand");
  }

  const cards = allCards.map(normalizeCard);
  const rankCounts = new Map<number, number>();
  const suitCounts = new Map<string, NormalizedCard[]>();

  for (const card of cards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
    const suitCards = suitCounts.get(card.suit) ?? [];
    suitCards.push(card);
    suitCounts.set(card.suit, suitCards);
  }

  const uniqueRanksDesc = getUniqueRanksDesc(cards);
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];

  for (const [rank, count] of rankCounts.entries()) {
    if (count === 4) {
      quads.push(rank);
    } else if (count === 3) {
      trips.push(rank);
    } else if (count === 2) {
      pairs.push(rank);
    }
  }

  quads.sort((a, b) => b - a);
  trips.sort((a, b) => b - a);
  pairs.sort((a, b) => b - a);

  const flushSuitCards = Array.from(suitCounts.values()).filter((cards) => cards.length >= 5);
  let bestFlushRanks: number[] | null = null;
  let straightFlushHigh: number | null = null;

  for (const suitedCards of flushSuitCards) {
    const sorted = [...suitedCards].sort((a, b) => b.rank - a.rank);
    const ranks = sorted.map((c) => c.rank);
    const topFive = ranks.slice(0, 5);

    if (!bestFlushRanks || compareRankLists(topFive, bestFlushRanks) > 0) {
      bestFlushRanks = topFive;
    }

    const sfHigh = findStraightHigh(getUniqueRanksDesc(sorted));
    if (sfHigh !== null && (straightFlushHigh === null || sfHigh > straightFlushHigh)) {
      straightFlushHigh = sfHigh;
    }
  }

  const straightHigh = findStraightHigh(uniqueRanksDesc);

  // Straight Flush
  if (straightFlushHigh !== null) {
    const ranks = straightRanks(straightFlushHigh);
    const desc = describe(HandCategory.STRAIGHT_FLUSH, ranks);
    return { category: HandCategory.STRAIGHT_FLUSH, ranks, ...desc };
  }

  // Four of a Kind
  if (quads.length > 0) {
    const kicker = uniqueRanksDesc.find((r) => r !== quads[0]) ?? 0;
    const ranks = [quads[0], kicker];
    const desc = describe(HandCategory.FOUR_OF_A_KIND, ranks);
    return { category: HandCategory.FOUR_OF_A_KIND, ranks, ...desc };
  }

  // Full House
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const tripRank = trips[0];
    const pairRank = pairs[0] ?? trips[1];
    const ranks = [tripRank, pairRank];
    const desc = describe(HandCategory.FULL_HOUSE, ranks);
    return { category: HandCategory.FULL_HOUSE, ranks, ...desc };
  }

  // Flush
  if (bestFlushRanks) {
    const ranks = bestFlushRanks;
    const desc = describe(HandCategory.FLUSH, ranks);
    return { category: HandCategory.FLUSH, ranks, ...desc };
  }

  // Straight
  if (straightHigh !== null) {
    const ranks = straightRanks(straightHigh);
    const desc = describe(HandCategory.STRAIGHT, ranks);
    return { category: HandCategory.STRAIGHT, ranks, ...desc };
  }

  // Three of a Kind
  if (trips.length > 0) {
    const kickers = uniqueRanksDesc.filter((r) => r !== trips[0]).slice(0, 2);
    const ranks = [trips[0], ...kickers];
    const desc = describe(HandCategory.THREE_OF_A_KIND, ranks);
    return { category: HandCategory.THREE_OF_A_KIND, ranks, ...desc };
  }

  // Two Pair
  if (pairs.length >= 2) {
    const kicker = uniqueRanksDesc.find((r) => r !== pairs[0] && r !== pairs[1]) ?? 0;
    const ranks = [pairs[0], pairs[1], kicker];
    const desc = describe(HandCategory.TWO_PAIR, ranks);
    return { category: HandCategory.TWO_PAIR, ranks, ...desc };
  }

  // One Pair
  if (pairs.length === 1) {
    const kickers = uniqueRanksDesc.filter((r) => r !== pairs[0]).slice(0, 3);
    const ranks = [pairs[0], ...kickers];
    const desc = describe(HandCategory.ONE_PAIR, ranks);
    return { category: HandCategory.ONE_PAIR, ranks, ...desc };
  }

  // High Card
  const highRanks = uniqueRanksDesc.slice(0, 5);
  const desc = describe(HandCategory.HIGH_CARD, highRanks);
  return { category: HandCategory.HIGH_CARD, ranks: highRanks, ...desc };
}

/**
 * Compare two evaluated hands.
 * Returns 1 when hand1 wins, -1 when hand2 wins, 0 for a tie.
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
  if (hand1.category > hand2.category) {
    return 1;
  }
  if (hand1.category < hand2.category) {
    return -1;
  }

  return compareRankLists(hand1.ranks, hand2.ranks);
}

/**
 * Determine winner(s) among evaluated player hands.
 * Returns winning user ids and the winning hand objects.
 */
export function determineWinners(playerHands: PlayerHand[]): {
  winnerIds: number[];
  winningHands: EvaluatedHand[];
} {
  if (playerHands.length === 0) {
    throw new Error("No player hands provided for showdown");
  }

  let best: EvaluatedHand | null = null;
  const winningHands: PlayerHand[] = [];

  for (const playerHand of playerHands) {
    if (best === null) {
      best = playerHand.hand;
      winningHands.push(playerHand);
      continue;
    }

    const result = compareHands(playerHand.hand, best);
    if (result > 0) {
      best = playerHand.hand;
      winningHands.length = 0;
      winningHands.push(playerHand);
    } else if (result === 0) {
      winningHands.push(playerHand);
    }
  }

  return {
    winnerIds: winningHands.map((p) => p.userId),
    winningHands: winningHands.map((p) => p.hand),
  };
}
