import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add name column to games table (optional field for game name)
  pgm.addColumn("games", {
    name: {
      type: "varchar(100)",
      comment: "Optional display name for the game",
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("games", "name");
}
