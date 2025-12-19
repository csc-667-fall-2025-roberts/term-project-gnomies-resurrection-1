/**
 * Community Cards SQL Queries
 *
 * Purpose: SQL queries for managing community cards (flop, turn, river)
 * Pattern: Professor's db/game-cards/sql.ts
 */

// Bulk insert community cards using unnest (efficient for flop's 3 cards)
export const ADD_COMMUNITY_CARDS = `
INSERT INTO community_cards (game_id, card_id)
SELECT $1, unnest($2::int[])
`;

// Fetch all community cards with rank and suit details
export const GET_COMMUNITY_CARDS = `
SELECT cc.card_id, c.rank, c.suit
FROM community_cards cc
JOIN cards c ON cc.card_id = c.id
JOIN player_cards pc ON pc.game_id = cc.game_id AND pc.card_id = cc.card_id
WHERE cc.game_id = $1
ORDER BY pc.position
`;

// Count revealed community cards
export const COUNT_COMMUNITY_CARDS = `
SELECT COUNT(*) FROM community_cards WHERE game_id = $1
`;

// Clear all community cards (for new hand reset)
export const CLEAR_COMMUNITY_CARDS = `
DELETE FROM community_cards WHERE game_id = $1
`;
