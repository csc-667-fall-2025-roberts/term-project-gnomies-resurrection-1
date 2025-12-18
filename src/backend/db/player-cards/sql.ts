// Create shuffled deck for a game
// One row per card, randomized position
export const CREATE_DECK = `
INSERT INTO player_cards (game_id, card_id, owner_player_id, position)
SELECT $1, id, NULL, ROW_NUMBER() OVER (ORDER BY RANDOM())
FROM cards
`;

// Fetch N undealt cards from the deck (top of deck)
export const GET_CARDS_FROM_DECK = `
SELECT id FROM player_cards
WHERE game_id = $1 AND owner_player_id IS NULL
ORDER BY position
LIMIT $2
`;

// Assign cards to a player (deal)
export const DEAL_CARDS = `
UPDATE player_cards
SET owner_player_id = $2,
    position = NULL
WHERE id = ANY($1)
`;

// Fetch a player's hole cards with rank and suit
export const GET_PLAYER_CARDS = `
SELECT
  pc.id,
  pc.card_id,
  c.rank,
  c.suit
FROM player_cards pc
JOIN cards c ON pc.card_id = c.id
WHERE pc.game_id = $1
  AND pc.owner_player_id = $2
ORDER BY c.sort_order
`;

// Count remaining undealt cards in the deck
export const COUNT_DECK_CARDS = `
SELECT COUNT(*) FROM player_cards
WHERE game_id = $1 AND owner_player_id IS NULL
`;
