export interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

export interface SecureUser extends User {
  password: string;
}

export interface DbChatMessage {
  id: number;
  user_id: number;
  message_text: string;
  created_at: Date;
}

export interface ChatMessage extends DbChatMessage {
  username: string;
  email: string;
}

export enum GameState {
  LOBBY = "lobby",
  PRE_FLOP = "pre-flop",
  FLOP = "flop",
  TURN = "turn",
  RIVER = "river",
  GAME_OVER = "game-over",
}

export type Game = {
  id: number;
  name?: string;
  created_by: number;
  state: GameState;
  max_players: number;
  pot_money: number;
  current_turn_user_id: number | null;
  started_at: Date | null;
  ended_at: Date | null;
  winner_id: number | null;
  created_at: Date;
};
