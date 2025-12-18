# TODO

## General
- [x] ~~Change styling in game page to match overall style (Sal)~~
- [x] Fix error where you are not routed to game page after creating game (Bao) 
- [ ] Create unique game rooms for each game (Sal)  
- [x] ~~Make an entry in the "table" table for every entry in "game" table~~ (No longer doing)
- [x] ~~Add functionality for checking available games in lobby (Bao)~~
- [x] ~~Add cards to "card" table in DB(John)~~
- [x] Clicking "join" or "rejoin" game in lobby routes you to game (Bao)  
- [x] Implement feature for game owner to start game once enough players present (Bao)  

## Gameplay loop
- [ ] Implement server dealing private cards 
    - First get it to update the DB
    - Get it to render on webpage
- [ ] Implement server dealing community cards
    - if game state = "flop": deal 3 community cards
    - else "turn", or "river" game state: deal 1 card
- [ ] Implement betting logic
- [ ] Implement component to compare players decks and choose winner 
- [ ] Implement server dealer actions 

---


**Reference:** Professor's code https://github.com/csc-667-fall-2025-roberts/jrob-term-project

---

## What Already Exists
Database migrations include:
- `cards` table with all 52 cards seeded (rank, suit, display_name)
- `player_cards` table for hole cards (owner_player_id, position)
- `community_cards` table for flop/turn/river
- `game_players` table with player_money, bet_amount, role
- `games` table with pot_money and game states

**You don't need to create these tables.**

---

## Phase 1:Server Dealing Private Cards

### Task A1: Player Cards Module
**Create:**
- `src/backend/db/player-cards/sql.ts`
- `src/backend/db/player-cards/index.ts`

**Reference:** Professor's `backend/db/game-cards/` pattern

**SQL queries needed:**
- [x] CREATE_DECK: Insert all 52 cards for a game with random shuffle using ROW_NUMBER
- [x] DEAL_CARDS: Assign specific cards to a player by updating owner_player_id
- [x] GET_PLAYER_CARDS: Fetch player's hole cards with rank and suit joined from cards table
- [x] GET_CARDS_FROM_DECK: Pull N cards from deck ordered by position
- [x] COUNT_DECK_CARDS: Count remaining undealt cards

**Wrapper functions needed:**
- [x] createDeck(gameId) - inserts shuffled deck
- [x] dealCards(cardIds, playerId) - assigns cards to player
- [x] getPlayerCards(gameId, playerId) - fetches with rank/suit
- [x] getCardsFromDeck(gameId, count) - gets N cards
- [x] countDeckCards(gameId) - returns remaining count

**Testing:**
- [x] Deck creates with 52 unique shuffled cards
- [x] Can deal 2 cards to each player
- [x] Can fetch player's cards with suit and rank
- [x] Cards pulled from deck are sequential by position
- [x] No duplicate cards across players

---

### Task A3: Update Game Service for Card Dealing
**Modify:** `src/backend/services/game-service.ts`

**Update startGame() function to:**
- [x] Create shuffled deck using createDeck
- [x] Deal 2 hole cards to each player in round-robin fashion
- [x] Assign sequential positions to players (no shuffle for poker)
- [x] Leave TODO comments for blind deductions (Phase 3)
- [x] Set first player to act (position 3 or wrap to position 1)
- [x] Start game with proper initial state

**Testing:**
- [x] Starting game creates full deck
- [x] Each player receives exactly 2 unique cards
- [x] No duplicate cards across all players
- [x] Works correctly with 2-9 players

---

### Task D1a: Display Player Cards (Frontend)
**Modify:** `src/frontend/game/ui-updates.ts`

**Functions needed:**
- [ ] updatePlayerHand(cards[]) - displays player's 2 hole cards with rank and suit
- [ ] Handle missing elements gracefully
- [ ] Apply card CSS classes (rank-A, suit-H, etc.)

**Testing:**
- [ ] Player sees their 2 hole cards after game starts
- [ ] Cards show correct rank and suit styling

---

## Phase 2: Server Dealing Community Cards

### Task A2: Community Cards Module
**Create:**
- `src/backend/db/community-cards/sql.ts`
- `src/backend/db/community-cards/index.ts`

**SQL queries needed:**
- [ ] ADD_COMMUNITY_CARDS: Insert multiple cards using unnest for flop/turn/river
- [ ] GET_COMMUNITY_CARDS: Fetch all community cards with rank and suit
- [ ] COUNT_COMMUNITY_CARDS: Return how many cards currently revealed
- [ ] CLEAR_COMMUNITY_CARDS: Delete all community cards for new hand

**Wrapper functions needed:**
- [ ] addCommunityCards(gameId, cardIds[]) - adds cards to table
- [ ] getCommunityCards(gameId) - fetches all with details
- [ ] countCommunityCards(gameId) - returns count
- [ ] clearCommunityCards(gameId) - removes all for reset

**Testing:**
- [ ] Can add 3 cards for flop
- [ ] Can add 1 card for turn
- [ ] Can add 1 card for river
- [ ] Can fetch all community cards in order
- [ ] Can clear cards for new hand

---

### Task C1: Round Progression Service
**Create:** `src/backend/services/round-service.ts`

**Functions needed:**
- [ ] dealFlop(gameId) - deals 3 cards, updates state to "flop", resets bets
- [ ] dealTurn(gameId) - deals 1 card, updates state to "turn", resets bets
- [ ] dealRiver(gameId) - deals 1 card, updates state to "river", resets bets
- [ ] isBettingRoundComplete(gameId) - checks if all bets are equal

**Each deal function must:**
- [ ] Validate current game state allows the transition
- [ ] Get appropriate number of cards from deck
- [ ] Add cards to community_cards table
- [ ] Update game state in games table
- [ ] Reset all player bet_amounts to 0
- [ ] Return dealt card details

**Add to games/sql.ts:**
- [ ] UPDATE_GAME_STATE query to change state column

**Testing:**
- [ ] Flop correctly deals 3 cards
- [ ] Turn correctly deals 1 card
- [ ] River correctly deals 1 card
- [ ] Bets reset after each round
- [ ] State transitions work correctly

---

### Task D1b: Display Community Cards (Frontend)
**Modify:** `src/frontend/game/ui-updates.ts`

**Functions needed:**
- [ ] updateCommunityCards(cards[]) - renders cards with animation
- [ ] Apply dealing animation to each card
- [ ] Update game state badge when rounds advance

**Modify:** `src/frontend/game.ts`

**Socket events:**
- [ ] Listen for ROUND_ADVANCED event
- [ ] Update game state badge text and CSS class
- [ ] Call updateCommunityCards with new cards
- [ ] Update pot display

**Testing:**
- [ ] Community cards appear when flop/turn/river dealt
- [ ] Cards animate dealing in sequence
- [ ] Game state badge updates (flop, turn, river)

---

## Phase 3: Betting Logic

### Task B1: Betting Queries [Bao] COMPLETE
**Modify:**
- `src/backend/db/games/sql.ts`
- `src/backend/db/games/index.ts`

**SQL queries to add:**
- [x] UPDATE_PLAYER_CHIPS: Add or subtract from player_money and return new balance
- [x] UPDATE_PLAYER_BET: Set bet_amount for a player
- [x] UPDATE_POT: Increment pot_money and return new total
- [x] GET_CURRENT_BET: Find MAX bet_amount for current round
- [x] GET_PLAYER_BET: Fetch specific player's current bet
- [x] CHECK_ALL_BETS_EQUAL: Count distinct bet amounts for active players
- [x] RESET_BETS: Set all bet_amount to 0 for new round

**Wrapper functions to add:**
- [x] deductChips(gameId, userId, amount) - decreases player chips
- [x] addChips(gameId, userId, amount) - increases player chips
- [x] updatePlayerBet(gameId, userId, amount) - sets current bet
- [x] addToPot(gameId, amount) - increases pot
- [x] getCurrentBet(gameId) - returns highest bet
- [x] getPlayerBet(gameId, userId) - returns player's bet
- [x] areAllBetsEqual(gameId) - checks if round complete
- [x] resetBets(gameId) - clears all bets

---

### Task B2: Betting Service
**Create:** `src/backend/services/betting-service.ts`

**Functions to implement:**
- [x] validateTurn(gameId, userId) - throws error if not player's turn
- [x] fold(gameId, userId) - sets bet_amount to -1 to mark folded
- [x] call(gameId, userId) - matches current bet and adds difference to pot
- [x] raise(gameId, userId, raiseAmount) - increases bet and adds to pot
- [x] check(gameId, userId) - passes if no bet to call, errors otherwise
- [x] allIn(gameId, userId) - bets all remaining chips
- [x] isBettingRoundComplete(gameId) - checks if all bets equal

**Each function should:**
- [x] Validate it's the player's turn
- [x] Update chips, bets, and pot in database
- [x] Advance turn to next player
- [x] Handle edge cases like insufficient chips

---

### Task B3: Betting Routes
**Create:** `src/backend/routes/betting.ts`

**Routes to implement:**
- [x] POST /games/:id/fold - calls BettingService.fold
- [x] POST /games/:id/call - calls BettingService.call
- [x] POST /games/:id/raise - validates amount, calls BettingService.raise
- [x] POST /games/:id/check - calls BettingService.check
- [x] POST /games/:id/all-in - calls BettingService.allIn

**Each route must:**
- [x] Extract gameId from params and userId from session
- [x] Call corresponding service function with proper error handling
- [x] Emit betting:action socket event to game room
- [x] Return JSON success or error response
- [x] Log errors with logger

**Add to server.ts:**
- [x] Import bettingRoutes and mount at /games path

**Testing:**
- [ ] Can fold and be marked as folded
- [ ] Can call and match current bet
- [ ] Can raise and increase bet amount
- [ ] Can check when no bet to call
- [ ] Can go all-in with remaining chips
- [ ] Turn properly advances to next player
- [ ] All players receive socket notifications

---

### Task D2: Betting Action Handlers (Frontend)
**Modify:** `src/frontend/game/betting.ts`

**Functions to implement:**
- [ ] handleFold() - POST to /games/:id/fold
- [ ] handleCall() - POST to /games/:id/call
- [ ] handleRaise() - validates amount, POST to /games/:id/raise with JSON body
- [ ] disableAllActions() - disables all action buttons after action taken

**Setup event listeners:**
- [ ] Attach click handlers to fold, call, raise buttons on DOMContentLoaded
- [ ] Read gameId from document.body.dataset.gameId
- [ ] Show error alerts on fetch failures
- [ ] Disable buttons immediately after successful action

**Modify:** `src/frontend/game/ui-updates.ts`

**Functions needed:**
- [ ] updatePot(amount) - updates pot display text
- [ ] setActiveTurn(userId) - adds/removes active-turn class on seats
- [ ] updatePlayerBet(userId, amount) - updates player's bet display

**Modify:** `src/frontend/game.ts`

**Socket events:**
- [ ] Listen for PLAYER_ACTION event
- [ ] Mark seat as folded if action is fold
- [ ] Request fresh game state after action
- [ ] Listen for BET_UPDATE event
- [ ] Update bet displays and pot for all players

**Testing:**
- [ ] Betting buttons functional
- [ ] Pot updates in real-time
- [ ] Turn indicators show correctly
- [ ] Player bet amounts display correctly

---

## Phase 4: Compare Players & Choose Winner

### Task C2: Hand Evaluator
**Create:** `src/backend/services/hand-evaluator.ts`

**Install dependency:**
- [ ] Run: npm install pokersolver
- [ ] Run: npm install --save-dev @types/pokersolver

**Functions to implement:**
- [ ] evaluateHand(holeCards, communityCards) - converts to pokersolver format and solves
- [ ] compareHands(hand1, hand2) - returns 1, 0, or -1 for comparison
- [ ] determineWinners(playerHands[]) - finds best hand(s) and returns winner userId(s)

**Card format conversion:**
- [ ] Convert database cards to pokersolver strings like "Ah", "Kd"
- [ ] Combine hole cards and community cards for evaluation
- [ ] Handle ties by tracking multiple winners

---

### Task C3: Showdown Service
**Create:** `src/backend/services/showdown-service.ts`

**Function to implement:**
- [ ] runShowdown(gameId) - full showdown process

**Showdown steps:**
- [ ] Fetch all community cards from database
- [ ] Get all active players (bet_amount >= 0, not folded)
- [ ] For each active player, get hole cards and evaluate hand
- [ ] Determine winner(s) using hand evaluator
- [ ] Calculate pot share (divide evenly if tie)
- [ ] Add pot share to each winner's chips
- [ ] Update game state to "game-over"
- [ ] Return winners, winning hand description, and pot share

**Testing:**
- [ ] Showdown evaluates hands correctly
- [ ] Winners properly determined
- [ ] Pot distributed to winner(s)
- [ ] Ties handled with split pot

---

### Task D3: Winner Display (Frontend)
**Modify:** `src/frontend/game.ts`

**Socket events:**
- [ ] Listen for SHOWDOWN event
- [ ] Display alert or modal with winners, winning hand, and pot amount
- [ ] Update winner's chip count display
- [ ] Show winning hand description

**Testing:**
- [ ] Winner announcement displays correctly
- [ ] Multiple winners shown in ties
- [ ] Chip counts update after pot distribution

---

## Resources

**Phase 1 (Card Dealing):**
- Professor's `db/game-cards/` modules for pattern reference

**Phase 3 (Betting):**
- Existing `db/games/` modules for SQL query patterns
- Professor's `services/game-service.ts` for service layer pattern

**Phase 4 (Winner):**
- pokersolver npm package documentation
- Texas Hold'em rules at pokernews.com/poker-rules

**Frontend Tasks:**
- Professor's `frontend/game.ts` for socket patterns
- Existing `frontend/game/` modules for structure

---

## Success Criteria

By completion:
1. Game starts with 2+ players
2. Each player sees their 2 hole cards
3. Players can bet, call, fold, raise in proper turn
4. Game progresses through all poker rounds
5. Community cards revealed at correct times
6. Winner determined at showdown
7. Pot distributed correctly
8. All updates happen in real-time

**Follow professor's coding standards: explicit comparisons, const/let, ES modules, async/await.**
