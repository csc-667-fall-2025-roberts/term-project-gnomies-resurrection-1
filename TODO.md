# Phase 1 Complete ✅

**What We Built:**
- Fixed socket room joining (gameId query params, auto-join, permission checks)
- Fixed real-time player join/leave (event name mismatch, infinite reload loop, database sync)
- Added LEAVE_GAME to remove disconnected players from database
- Enhanced updatePlayerSeats() to dynamically add/remove seats without page reload
- Real player data sync (GET_PLAYERS_WITH_STATS, game:requestState handler)

**Result:** Players join/leave games in real-time with socket-based updates. No page reloads, database stays in sync.

---

## Professor's Coding Standards (CRITICAL)

From `classnote.md` - **These are graded strictly:**

### REQUIRED Code Patterns

```typescript
// CORRECT: Explicit comparisons
if (input !== null) {
  input.addEventListener("click", handleClick);
}

// WRONG: Implicit expressions (professor forbids)
input && input.addEventListener("click", handleClick);
```

```typescript
// CORRECT: const by default
const MAX_PLAYERS = 9;
const currentBet = 100;

// CORRECT: let only when reassigning
let playerTurn = 0;
playerTurn = 1;

// WRONG: Never use var
var gameState = {}; // DO NOT USE
```

```typescript
// CORRECT: ES Modules
import { Card } from "./types";
export function updatePot(amount: number) {}

// WRONG: CommonJS
const Card = require("./types"); // DO NOT USE
module.exports = {}; // DO NOT USE
```

```typescript
// CORRECT: async/await
const result = await db.query("SELECT * FROM games");

// LESS PREFERRED: Promise chains (avoid for complex logic)
db.query("SELECT * FROM games").then(result => {}).catch(err => {});
```

### FORBIDDEN Practices

1. **Tabs** - Use spaces only (2 or 4, be consistent)
2. **Commented code blocks** - Delete, don't comment out
3. **Debug console.log in final code** - Remove or use proper logging
4. **Implicit JS** - All comparisons must be explicit
5. **var keyword** - Use const/let only
6. **Client-side state** - Server is sole source of truth
7. **localStorage for game state** - Database only


# Phase 2: Critical Stability

**Goal:** Make game playable without breaking  
**Duration:** ~14 hours  
**Priority:** 🔴 CRITICAL

---

## Task 1: Max Players Validation
**Duration:** 1 hour  
**Status:** ⬜ TODO

### Current State (Verified)
```typescript
// routes/games.ts:77-78 - NO VALIDATION
await Games.join(gameId, id);
// Can join beyond max_players, can join twice
```

### Implementation
```typescript
// Add before Games.join():
const game = await Games.get(gameId);
const playerIds = await Games.getPlayerIds(gameId);

if (playerIds.length >= game.max_players) {
  return response.redirect("/lobby?error=game_full");
}

if (playerIds.includes(id)) {
  return response.redirect(`/games/${game_id}`); // Already joined
}

await Games.join(gameId, id);
```

### Files to Modify
- `src/backend/routes/games.ts` (add validation before line 78)

### Acceptance Criteria
- [ ] Cannot join when player_count >= max_players
- [ ] Idempotent (joining twice redirects to game)
- [ ] Error message shown in lobby

---

## Task 2: Error Handling & User Feedback
**Duration:** 2 hours  
**Status:** ⬜ TODO

### Current State (Verified)
```typescript
// routes/games.ts:93-95 - Has try/catch but no user feedback
} catch (error: any) {
  logger.error(`Error joining game ${gameId}:`, error);
  response.redirect("/lobby"); // Silent redirect
}
```

### Implementation (Query Params - Simpler)
```typescript
// In join route catch block:
response.redirect("/lobby?error=join_failed");

// In lobby route:
router.get('/lobby', (req, res) => {
  const errorMsg = {
    'join_failed': 'Failed to join game',
    'game_full': 'Game is full',
    'game_started': 'Game already started'
  }[req.query.error as string];
  
  res.render('lobby/lobby', { error: errorMsg || null });
});

// In lobby.ejs:
<% if (error) { %>
  <div class="error-banner"><%= error %></div>
<% } %>
```

### Files to Modify
- `src/backend/routes/games.ts` (update error redirects)
- `src/backend/routes/lobby.ts` (pass error to view)
- `src/backend/views/lobby/lobby.ejs` (show error banner)

### Acceptance Criteria
- [ ] User sees error when join fails
- [ ] User sees error when game full
- [ ] Error clears after navigation
- [ ] Errors are user-friendly

---

## Task 3: Reconnection & Auto-Sync
**Duration:** 3 hours  
**Status:** ⬜ TODO

### Current State (Verified)
- `game:requestState` handler EXISTS (sockets/init.ts:39-54)
- Frontend does NOT auto-request on reconnect

### Implementation
```typescript
// In frontend/game.ts:
socket.on("connect", () => {
  console.log("Connected/Reconnected");
  socket.emit("game:requestState", { gameId });
  hideReconnectingUI();
});

socket.on("disconnect", () => {
  console.log("Disconnected");
  showReconnectingUI();
});

function showReconnectingUI() {
  const overlay = document.createElement('div');
  overlay.id = 'reconnecting-overlay';
  overlay.innerHTML = '<div class="reconnecting-message">Reconnecting...</div>';
  document.body.appendChild(overlay);
}

function hideReconnectingUI() {
  document.getElementById('reconnecting-overlay')?.remove();
}
```

### Files to Modify
- `src/frontend/game.ts` (add reconnect logic)
- `src/frontend/styles/game.css` (reconnecting overlay styles)

### Acceptance Criteria
- [ ] Auto-requests state on reconnect
- [ ] Shows "Reconnecting..." overlay on disconnect
- [ ] Overlay disappears on reconnect
- [ ] State syncs after reconnect

---

## Task 4: Server-Side Action Validation (Foundation Only)
**Duration:** 4 hours  
**Status:** ⬜ TODO

### Current State (Verified)
- NO `player:action` socket handler exists
- Frontend game.ts:218 emits `player:action` but backend doesn't listen

### Implementation (Basic Framework)
```typescript
// In sockets/init.ts, add handler:
socket.on("player:action", async (data: { 
  gameId: number; 
  action: string; 
  amount?: number 
}) => {
  try {
    const game = await Games.get(data.gameId);
    
    // Basic validation
    if (game.current_turn_user_id !== session.user!.id) {
      socket.emit("action:rejected", { 
        action: data.action,
        reason: "Not your turn" 
      });
      return;
    }
    
    if (!['fold', 'check', 'call', 'raise'].includes(data.action)) {
      socket.emit("action:rejected", { 
        action: data.action,
        reason: "Invalid action" 
      });
      return;
    }
    
    // TODO: Process action (Phase 3)
    socket.emit("action:confirmed", { action: data.action });
    logger.info(`User ${session.user!.id} performed ${data.action} in game ${data.gameId}`);
    
  } catch (error) {
    socket.emit("action:rejected", { 
      action: data.action,
      reason: "Server error" 
    });
  }
});
```

### Files to Modify
- `src/backend/sockets/init.ts` (add player:action handler)

### Acceptance Criteria
- [ ] Backend receives player:action events
- [ ] Rejects actions when not player's turn
- [ ] Rejects invalid action types
- [ ] Confirms valid actions (processing comes later)
- [ ] Frontend receives action:rejected with reason

---

## Task 5: Basic Timeout System (UI Only)
**Duration:** 4 hours  
**Status:** ⬜ TODO

### Current State (Verified)
- NO timer system exists
- No turn_started_at column in database

### Implementation (Client-Side Visual Only)
```typescript
// In frontend/game/ui-updates.ts:
const TURN_TIMEOUT_MS = 30000; // 30 seconds
let turnTimer: NodeJS.Timeout | null = null;

export function startTurnTimer(onTimeout: () => void) {
  clearTurnTimer();
  
  let remaining = TURN_TIMEOUT_MS;
  const timerEl = document.getElementById('turn-timer');
  
  turnTimer = setInterval(() => {
    remaining -= 1000;
    if (timerEl) {
      timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;
    }
    
    if (remaining <= 0) {
      clearTurnTimer();
      onTimeout();
    }
  }, 1000);
}

export function clearTurnTimer() {
  if (turnTimer) {
    clearInterval(turnTimer);
    turnTimer = null;
  }
}

// In frontend/game.ts:
socket.on("turn:changed", (data) => {
  if (data.is_my_turn) {
    startTurnTimer(() => {
      // Auto-fold on timeout
      socket.emit("player:action", { 
        gameId, 
        action: "fold" 
      });
    });
  } else {
    clearTurnTimer();
  }
});
```

### Files to Modify
- `src/frontend/game/ui-updates.ts` (timer functions)
- `src/frontend/game.ts` (use timer on turn change)
- `src/backend/views/games/game.ejs` (add timer display)
- `src/frontend/styles/game.css` (timer styles)

### Acceptance Criteria
- [ ] Visual countdown shows during turn
- [ ] Auto-folds after 30 seconds
- [ ] Timer clears when action taken
- [ ] Timer clears when not your turn

---

## Progress Tracker

| Task | Priority | Duration | Status |
|------|----------|----------|--------|
| 1. Max Players Validation | 🔴 CRITICAL | 1h | ⬜ TODO |
| 2. Error Handling | 🔴 CRITICAL | 2h | ⬜ TODO |
| 3. Reconnection | 🟡 IMPORTANT | 3h | ⬜ TODO |
| 4. Action Validation | 🔴 CRITICAL | 4h | ⬜ TODO |
| 5. Timeout System | 🟡 IMPORTANT | 4h | ⬜ TODO |

**Total Effort:** ~14 hours  
**Critical Path:** Tasks 1, 2, 4 (7 hours)

