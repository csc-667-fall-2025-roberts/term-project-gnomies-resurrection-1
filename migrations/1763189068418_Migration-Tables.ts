import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {

    pgm.createTable("users", {
        id: { type: "serial", primaryKey: true },
        username: { type: "varchar(100)", notNull: true, unique: true },
        email: { type: "varchar(255)", notNull: true, unique: true },
        password: { type: "varchar(255)", notNull: true },
        wins: { type: "integer", notNull: true, default: 0 },
        losses: { type: "integer", notNull: true, default: 0 },
        created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
    }, { ifNotExists: true });

    pgm.createTable("games", {
        id: { type: "serial", primaryKey: true },
        owner: { type: "integer", notNull: true, references: "users(id)", onDelete: "CASCADE" },
        max_players: { type: "integer", notNull: true },
        created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
    }, { ifNotExists: true });

    // game tables
    pgm.createTable("tables", {
        id: { type: "serial", primaryKey: true },
        game_id: { type: "integer", notNull: true, references: "games(id)", onDelete: "CASCADE" },
        pot_money: { type: "integer", notNull: true, default: 0 },
        state: { type: "varchar(50)" },
        created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
    }, { ifNotExists: true });

    pgm.createTable("cards", {
        id: { type: "serial", primaryKey: true },
        number: { type: "integer", notNull: true },
        suit: { type: "varchar(20)", notNull: true },
        color: { type: "varchar(20)" },
    }, { ifNotExists: true });

    pgm.createTable("table_players", {
        id: { type: "serial", primaryKey: true },
        user_id: { type: "integer", notNull: true, references: "users(id)", onDelete: "CASCADE" },
        username: { type: "varchar(100)", notNull: true },
        table_id: { type: "integer", notNull: true, references: "tables(id)", onDelete: "CASCADE" },
        player_money: { type: "integer", notNull: true, default: 0 },
        bet_amount: { type: "integer", notNull: true, default: 0 },
        role: { type: "varchar(50)" },
        joined_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
    }, { ifNotExists: true });

    pgm.createTable("player_cards", {
        player_id: { type: "integer", notNull: true, references: "table_players(id)", onDelete: "CASCADE" },
        card_id: { type: "integer", notNull: true, references: "cards(id)", onDelete: "CASCADE" },
    }, {
        ifNotExists: true,
        constraints: { primaryKey: ["player_id", "card_id"] }
    });

    pgm.createTable("community_cards", {
        table_id: { type: "integer", notNull: true, references: "tables(id)", onDelete: "CASCADE" },
        card_id: { type: "integer", notNull: true, references: "cards(id)", onDelete: "CASCADE" },
    }, {
        ifNotExists: true,
        constraints: { primaryKey: ["table_id", "card_id"] }
    });

    pgm.createTable("chat_messages", {
        id: { type: "serial", primaryKey: true },
        user_id: { type: "integer", references: "users(id)", onDelete: "SET NULL" },
        table_id: { type: "integer", references: "tables(id)", onDelete: "CASCADE" },
        message_text: { type: "text", notNull: true },
        created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
    }, { ifNotExists: true });

    // useful indexes
    pgm.createIndex("table_players", ["table_id"], { ifNotExists: true });
    pgm.createIndex("player_cards", ["player_id"], { ifNotExists: true });
    pgm.createIndex("community_cards", ["table_id"], { ifNotExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("chat_messages", { ifExists: true, cascade: true });
    pgm.dropTable("community_cards", { ifExists: true, cascade: true });
    pgm.dropTable("player_cards", { ifExists: true, cascade: true });
    pgm.dropTable("table_players", { ifExists: true, cascade: true });
    pgm.dropTable("cards", { ifExists: true, cascade: true });
    pgm.dropTable("tables", { ifExists: true, cascade: true });
    pgm.dropTable("games", { ifExists: true, cascade: true });
    pgm.dropTable("users", { ifExists: true, cascade: true });
}
