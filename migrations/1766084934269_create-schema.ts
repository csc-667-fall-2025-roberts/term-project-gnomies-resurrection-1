import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Game state strings
  pgm.createType("game_state", [
    "lobby",
    "pre-flop",
    "flop",
    "turn",
    "river",
    "game-over",
  ]);

  pgm.createType("player_role", [
    "dealer",
    "small_blind",
    "big_blind",
    "player",
  ]);

  pgm.createTable("users", {
    id: { type: "serial", primaryKey: true },
    username: { type: "varchar(100)", notNull: true, unique: true },
    email: { type: "varchar(255)", notNull: true, unique: true },
    password: { type: "varchar(60)", notNull: true },
    wins: { type: "integer", notNull: true, default: 0 },
    losses: { type: "integer", notNull: true, default: 0 },
    created_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createTable("session", {
    sid: { type: "varchar", primaryKey: true },
    sess: { type: "json", notNull: true },
    expire: { type: "timestamp(6)", notNull: true },
  });

  pgm.createIndex("session", "expire");

  pgm.createTable("games", {
    id: { type: "serial", primaryKey: true },

    name: {
      type: "varchar(100)",
      comment: "Optional display name for the game",
    },

    created_by: {
      type: "integer",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },

    max_players: { type: "integer", notNull: true },

    state: {
      type: "game_state",
      notNull: true,
      default: "lobby",
    },

    pot_money: { type: "integer", notNull: true, default: 0 },

    current_turn_user_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "SET NULL",
    },

    started_at: { type: "timestamp with time zone" },
    ended_at: { type: "timestamp with time zone" },

    winner_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "SET NULL",
    },

    created_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("games", "state");
  pgm.createIndex("games", "current_turn_user_id");

  pgm.createTable("game_players", {
    id: { type: "serial", primaryKey: true },

    game_id: {
      type: "integer",
      notNull: true,
      references: "games(id)",
      onDelete: "CASCADE",
    },

    user_id: {
      type: "integer",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },

    player_money: { type: "integer", notNull: true, default: 0 },
    bet_amount: { type: "integer", notNull: true, default: 0 },

    role: {
      type: "player_role",
      notNull: true,
      default: "player",
    },

    position: {
      type: "integer",
      comment: "Player position at table (1-based, used for turn order)",
    },

    joined_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("game_players", "unique_game_user", {
    unique: ["game_id", "user_id"],
  });

  pgm.createIndex("game_players", "game_id");
  pgm.createIndex("game_players", ["game_id", "position"]);

  pgm.createTable("cards", {
    id: "id",
    rank: { type: "varchar(2)", notNull: true },
    suit: { type: "varchar(1)", notNull: true },
    display_name: { type: "varchar(20)", notNull: true },
    sort_order: { type: "integer", notNull: true },
  });

  pgm.addConstraint("cards", "unique_rank_suit", {
    unique: ["rank", "suit"],
  });

  pgm.createIndex("cards", "rank");

  pgm.createTable("player_cards", {
    id: "id",

    game_id: {
      type: "integer",
      notNull: true,
      references: "games(id)",
      onDelete: "CASCADE",
    },

    card_id: {
      type: "integer",
      notNull: true,
      references: "cards(id)",
      onDelete: "CASCADE",
    },

    owner_player_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "CASCADE",
    },

    position: {
      type: "integer",
      comment: "Deck position or hand ordering",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },

    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.addConstraint("player_cards", "unique_game_card", {
    unique: ["game_id", "card_id"],
  });

  pgm.createIndex("player_cards", ["game_id"]);
  pgm.createIndex("player_cards", ["game_id", "owner_player_id"]);
  pgm.createIndex("player_cards", ["game_id", "owner_player_id", "position"]);

  pgm.createTable(
    "community_cards",
    {
      game_id: {
        type: "integer",
        notNull: true,
        references: "games(id)",
        onDelete: "CASCADE",
      },
      card_id: {
        type: "integer",
        notNull: true,
        references: "cards(id)",
        onDelete: "CASCADE",
      },
    },
    {
      constraints: {
        primaryKey: ["game_id", "card_id"],
      },
    }
  );

  pgm.createIndex("community_cards", "game_id");

  pgm.createTable("chat_messages", {
    id: { type: "serial", primaryKey: true },

    user_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "SET NULL",
    },

    game_id: {
      type: "integer",
      references: "games(id)",
      onDelete: "CASCADE",
    },

    message_text: { type: "text", notNull: true },

    created_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Seed card deck into database
  const suits = [
    { code: "H", name: "Hearts" },
    { code: "D", name: "Diamonds" },
    { code: "C", name: "Clubs" },
    { code: "S", name: "Spades" },
  ];

  const ranks = [
    { code: "A", name: "Ace" },
    { code: "2", name: "2" },
    { code: "3", name: "3" },
    { code: "4", name: "4" },
    { code: "5", name: "5" },
    { code: "6", name: "6" },
    { code: "7", name: "7" },
    { code: "8", name: "8" },
    { code: "9", name: "9" },
    { code: "10", name: "10" },
    { code: "J", name: "Jack" },
    { code: "Q", name: "Queen" },
    { code: "K", name: "King" },
  ];

  let sortOrder = 1;
  for (const suit of suits) {
    for (const rank of ranks) {
      pgm.sql(`
        INSERT INTO cards (rank, suit, display_name, sort_order)
        VALUES ('${rank.code}', '${suit.code}', '${rank.name} of ${suit.name}', ${sortOrder})
      `);
      sortOrder++;
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("chat_messages", { cascade: true });
  pgm.dropTable("community_cards", { cascade: true });
  pgm.dropTable("player_cards", { cascade: true });
  pgm.dropTable("cards", { cascade: true });
  pgm.dropTable("game_players", { cascade: true });
  pgm.dropTable("games", { cascade: true });
  pgm.dropTable("session", { cascade: true });
  pgm.dropTable("users", { cascade: true });

  pgm.dropType("player_role");
  pgm.dropType("game_state");
}
