# Project Setup Guide

This guide explains how to set up and run the project on a fresh machine.

## Prerequisites

- **Node.js** v20+ (tested with v25.2.1)
- **PostgreSQL** database server running
- **npm** package manager

## Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd term-project-gnomies-resurrection-1
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment

Create a `.env` file in the project root with the following variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
SESSION_SECRET=your-secret-key-here
PORT=3001
```

Replace:
- `username` - your PostgreSQL username
- `password` - your PostgreSQL password
- `your_database_name` - name of your database
- `your-secret-key-here` - a random secret string for sessions

## Step 4: Create Database (if needed)

If the database doesn't exist yet:

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE your_database_name;
\q
```

## Step 5: Run Database Migrations ⚠️ IMPORTANT

This step creates all the required tables. **You MUST run this before starting the app:**

```bash
npm run migrate:up
```

You should see output showing migrations being applied:
```
> Migrating files:
> - 1765750067765_create-baseline-migration
> - 1765881556981_add-turn-management
> - 1765884066423_add-game-name-column
...
Migrations complete!
```

## Step 6: Build the Project

```bash
npm run build
```

## Step 7: Start Development Server

```bash
npm run dev
```

This starts both the backend and frontend in development mode with hot reload.

The server will be available at: `http://localhost:3001` (or whatever PORT you set)

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (with hot reload) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run migrate:up` | Apply pending migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:create <name>` | Create a new migration |

---

## Troubleshooting

### Error: "column X does not exist"

This usually means migrations haven't been run. Fix:
```bash
npm run migrate:up
```

### Error: "relation X does not exist"

Same as above - run migrations:
```bash
npm run migrate:up
```

### Error: "ERR_HTTP_HEADERS_SENT"

This is a code bug where the server tries to send a response twice. Check for:
- Unbounded async errors in route handlers
- Missing `return` statements after `response.redirect()`

### Dev server shows old errors after fixing code

Stop the dev server (Ctrl+C) and restart:
```bash
npm run dev
```

### Database connection failed

Check your `.env` file:
- Is `DATABASE_URL` correct?
- Is PostgreSQL running?
- Does the database exist?

---

## Project Structure

```
├── src/
│   ├── backend/           # Express server
│   │   ├── db/            # Database queries
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # Socket.io handlers
│   │   └── views/         # EJS templates
│   ├── frontend/          # Client-side code
│   │   ├── game.ts        # Game page logic
│   │   ├── lobby.ts       # Lobby page logic
│   │   └── styles/        # CSS files
│   └── shared/            # Shared between front/back
├── migrations/            # Database migrations
├── .env                   # Environment variables (not in git)
└── package.json
```

---

## Testing the Start Game Feature

1. Open browser at `http://localhost:3001`
2. Register/login with User A
3. Create a new game
4. Open incognito/different browser
5. Register/login with User B
6. Join User A's game
7. In User A's browser, click "🎮 Start Game"
8. Both users should see the game start

---

**Last Updated:** 2025-12-17
