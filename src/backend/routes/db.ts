import express from "express";
import { Auth } from "../db";
import { requireGuest } from "../middleware";

const router = express.Router();

// example-usage.ts
import db from './db';

async function example() {
  // Test connection
  await db.testConnection();

  // Get all users
  const usersResult = await db.users.getAll();
  console.log('Users:', usersResult.rows);

  // Get games for a specific owner
  const gamesResult = await db.games.getByOwner(1);
  console.log('Games:', gamesResult.rows);

  // Get chat messages for a table
  const messagesResult = await db.chatMessages.getByTableId(1);
  console.log('Messages:', messagesResult.rows);

  // Complex query - get full table state
  const tableState = await db.getTableWithPlayersAndCards(1);
  console.log('Table state:', tableState);

  // Raw query example
  const rawResult = await db.query('SELECT COUNT(*) as user_count FROM users');
  console.log('User count:', rawResult.rows[0].user_count);
}

example().catch(console.error);

export default router;