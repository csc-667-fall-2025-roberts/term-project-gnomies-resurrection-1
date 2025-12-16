import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add turn management and game timing columns to games table
  pgm.addColumns("games", {
    current_turn_user_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "SET NULL",
    },
    started_at: {
      type: "timestamp with time zone",
    },
    ended_at: {
      type: "timestamp with time zone",
    },
    winner_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "SET NULL",
    },
  });

  // Add index on current_turn_user_id for quick lookups
  pgm.createIndex("games", "current_turn_user_id");

  // Add position column to game_players for turn ordering
  pgm.addColumn("game_players", {
    position: {
      type: "integer",
      comment: "Player position at table (1-based, used for turn order)",
    },
  });

  // Add index on game_players position for turn ordering queries
  pgm.createIndex("game_players", ["game_id", "position"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop indexes first
  pgm.dropIndex("game_players", ["game_id", "position"]);
  pgm.dropIndex("games", "current_turn_user_id");

  // Drop position column from game_players
  pgm.dropColumn("game_players", "position");

  // Drop columns from games table
  pgm.dropColumns("games", [
    "current_turn_user_id",
    "started_at",
    "ended_at",
    "winner_id",
  ]);
}
