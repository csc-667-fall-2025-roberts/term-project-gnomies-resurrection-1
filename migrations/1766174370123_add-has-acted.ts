import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.addColumn("game_players", {
      has_acted: {
        type: "boolean",
        notNull: true,
        default: false,
      },
    });
  }
  
  export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropColumn("game_players", "has_acted");
  }
  
