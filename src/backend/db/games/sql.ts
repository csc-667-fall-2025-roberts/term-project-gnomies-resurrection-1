export const CREATE_GAME = `
INSERT INTO games (created_by, name, max_players)
VALUES ($1, $2, $3)
RETURNING *
`;

export const JOIN_GAME = `
INSERT INTO game_players (game_id, user_id, player_money)
VALUES ($1, $2, 1000)
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

export const GET_NEXT_PLAYER = `
  SELECT user_id FROM game_players
  WHERE game_id = $1 AND position > $2
  ORDER BY position ASC
  LIMIT 1
`;

export const GET_FIRST_PLAYER = `
  SELECT user_id FROM game_players
  WHERE game_id = $1
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
