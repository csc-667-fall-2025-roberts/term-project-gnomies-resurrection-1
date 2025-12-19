export const CREATE_GAME = `
INSERT INTO games (created_by, name, max_players)
VALUES ($1, $2, $3)
RETURNING *
`;

export const JOIN_GAME = `
INSERT INTO game_players (game_id, user_id, player_money)
VALUES ($1, $2, 1000)
`;

export const LEAVE_GAME = `
DELETE FROM game_players
WHERE game_id = $1 AND user_id = $2
`;

export const LIST_GAMES = `
SELECT 
  g.*,
  COUNT(gp.id) AS player_count,
  COALESCE(
    json_agg(
      json_build_object(
        'user_id', gp.user_id,
        'username', u.username,
        'email', u.email
      )
    ) FILTER (WHERE gp.id IS NOT NULL),
    '[]'
  ) AS players
FROM games g
LEFT JOIN game_players gp ON g.id=gp.game_id
LEFT JOIN users u ON u.id=gp.user_id
WHERE g.state=$1
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT $2
`;

export const GAMES_BY_USER = `
SELECT games.* FROM game_players, games
WHERE game_players.game_id=games.id AND user_id=$1
`;

export const GAME_BY_ID = `
  SELECT * FROM games WHERE id=$1
`;

export const GET_PLAYER_IDS = `
  SELECT user_id FROM game_players WHERE game_id = $1
`;

// Turn management queries
export const SET_CURRENT_TURN = `
  UPDATE games 
  SET current_turn_user_id = $2
  WHERE id = $1
  RETURNING *
`;

export const GET_CURRENT_TURN = `
  SELECT current_turn_user_id FROM games WHERE id = $1
`;

// Get next active (non-folded) player after current position
// Folded players have bet_amount = -1, so we skip them (bet_amount >= 0)
export const GET_NEXT_PLAYER = `
  SELECT user_id FROM game_players
  WHERE game_id = $1 
    AND position > $2 
    AND bet_amount >= 0
  ORDER BY position ASC
  LIMIT 1
`;

// Get first active (non-folded) player - for wrapping around
export const GET_FIRST_PLAYER = `
  SELECT user_id FROM game_players
  WHERE game_id = $1 
    AND bet_amount >= 0
  ORDER BY position ASC
  LIMIT 1
`;

export const GET_PLAYER_POSITION = `
  SELECT position FROM game_players
  WHERE game_id = $1 AND user_id = $2
`;

export const SET_PLAYER_POSITION = `
  UPDATE game_players
  SET position = $3
  WHERE game_id = $1 AND user_id = $2
`;

export const START_GAME = `
  UPDATE games 
  SET state = 'pre-flop', 
      current_turn_user_id = $2,
      started_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`;

// Player stats query for game page
export const GET_PLAYERS_WITH_STATS = `
  SELECT
    u.id as user_id,
    u.username,
    u.email,
    gp.position,
    gp.player_money as chip_count,
    gp.bet_amount as current_bet,
    gp.role
  FROM game_players gp
  JOIN users u ON gp.user_id = u.id
  WHERE gp.game_id = $1
  ORDER BY gp.position NULLS LAST, gp.joined_at ASC
`;

export const UPDATE_PLAYER_CHIPS = `
  UPDATE game_players
  SET player_money = player_money + $3
  WHERE game_id = $1 AND user_id = $2
  RETURNING player_money
`;

export const UPDATE_PLAYER_BET = `
  UPDATE game_players
  SET bet_amount = $3
  WHERE game_id = $1 AND user_id = $2
  RETURNING *
`;

export const UPDATE_POT = `
  UPDATE games
  SET pot_money = pot_money + $2
  WHERE id = $1
  RETURNING pot_money
`;

// find MAX bet amount for current round
export const GET_CURRENT_BET = `
  SELECT MAX(bet_amount) FROM game_players WHERE game_id = $1 AND bet_amount > 0
`;

export const GET_PLAYER_BET = `
  SELECT bet_amount FROM game_players WHERE game_id = $1 AND user_id = $2
`;

export const CHECK_ALL_BETS_EQUAL = `
  SELECT COUNT(*) FROM game_players WHERE game_id = $1 AND bet_amount = $2
`;

// set all bets to 0 for new round
export const RESET_BETS = `
  UPDATE game_players
  SET bet_amount = 0
  WHERE game_id = $1 AND bet_amount >= 0
  RETURNING *
`;

// End game query - transitions to game-over state
export const END_GAME = `
  UPDATE games 
  SET state = 'game-over'
  WHERE id = $1
  RETURNING *
`;

export const UPDATE_GAME_STATE = `
  UPDATE games
  SET state = $2
  WHERE id = $1
`;
