export const GLOBAL_ROOM = "room:global";
export const CHAT_MESSAGE = "chat:message";
export const CHAT_LISTING = "chat:listing";

export const GAME_LISTING = "games:listing";
export const GAME_CREATE = "games:created";
export const GAME_UPDATE = "games:updated"; // NEW: Broadcast when a game's player count changes

export const JOIN_GAME_ROOM = "join-game-room";
export const LEAVE_GAME_ROOM = "leave-game-room";
export const GAME_CHAT_MESSAGE = "game-chat-message";
export const PLAYER_JOINED = "player-joined";
export const PLAYER_LEFT = "player-left";

// Game state events
export const GAME_STARTED = "game:started";

// Round progression events (community cards)
export const FLOP_REVEALED = "flop:revealed";
export const TURN_REVEALED = "turn:revealed";
export const RIVER_REVEALED = "river:revealed";

// Betting/player action events
export const PLAYER_ACTION = "player:action"; // Client → Server
export const PLAYER_ACTION_TAKEN = "player:actionTaken"; // Server → Clients (broadcast)
export const ACTION_CONFIRMED = "action:confirmed"; // Server → Client (targeting acting player)
export const ACTION_REJECTED = "action:rejected"; // Server → Client (targeting acting player)