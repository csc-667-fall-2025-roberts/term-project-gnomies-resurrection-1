# CSC 667 Poker Game – Project Requirements

This document:
- All requirements from **Professor Term Project**
- All critical “things to avoid” that can lose points
- All coding, structure, planning, GitHub, and presentation expectations

---


# 1. Project Overview
A real-time, multiplayer Texas Hold’em Poker game playable in a browser.  
Supports:
- Authentication  
- Lobby with chat  
- Multiple game rooms  
- Unlimited concurrent games  
- Real-time gameplay (WebSockets)  
- Persistent server-side game state  
- Spectators (optional)


---


# 2. Milestone 1 – Completed Work
- Game selected: Texas Hold’em Poker  
- Low-fidelity wireframes completed:
  - Login / Signup
  - Lobby
  - Game Room (Waiting)
  - Game Room (In-progress)
- Initial feature list & high-level flow completed
- Early slides prepared


---


# 3. Mandatory Project Requirements (from Professor)


These come directly from the Term Project rubric and intro lecture.


## 3.1 Authentication (Required)
- Sign up  
- Login  
- Logout  
- Sessions must restrict:
  - Pages requiring login  
  - Game rooms (player-only unless spectators allowed)


## 3.2 Real-Time Chat (Required)
Chat must exist in:
- Lobby  
- Each game room  


## 3.3 Real-Time Gameplay (Required)
- Server pushes updates via **WebSockets**
- Client sends changes via **HTTP POST**
- Server = **sole source of truth**
- Client must hold **no true state**


## 3.4 Game State Persistence (Required)
All state stored **on server database**:
- Player hands  
- Community cards  
- Bets  
- Pot  
- Turn order  
- Player seating  
- Game phase  


### Required behavior:
- Closing the tab → state restored on reconnect  
- No localStorage  
- No client-side authority


## 3.5 Unlimited Simultaneous Games
- Any number of games running  
- A user can join multiple games in different tabs  
- Games must be isolated by room ID


## 3.6 Game Must Be Fully Functional
Including:
- Dealing cards  
- Betting rounds  
- Pot calculation  
- Winner determination  
- Showdown logic  
- Fold logic  
- Blinds rotation  
- Correct turn order  


## 3.7 Appearance Requirements
- Must “not look terrible”  
- Must be readable and functional  
- Clean layout, basic spacing, grouping, alignment  


---


# 4. Coding Requirements (Strict – From Rubric)
These are areas where students frequently lose points.


### Dependency and Script Management


- `package.json` is the **single source of truth** for:
  - All project dependencies.
  - All npm scripts (`dev`, `start`, `lint`, `format`, etc.).
- Team members must:
  - Install dependencies using `npm install`.
  - Avoid manually installing global versions that conflict with `package.json`.
- If a dependency is needed, it must be:
  - Added to `package.json` via `npm install <pkg> --save` (or `--save-dev`).


### JavaScript Variable Rules


- Use **`const` by default** for variables that do not need reassignment.
- Use **`let` only when you truly need to reassign** a variable.
- **Do not use `var` anywhere in the codebase.**
  - `var` has legacy behavior (hoisting, function scoping) that can lead to subtle bugs.
- Prefer clear, block-scoped code using `const`/`let` only.


### Module System


- Use **ES Modules** throughout the project:
  - `import express from "express";`
  - `export default function ...` or named `export`.
- **Do not use CommonJS**:
  - Avoid `require(...)`, `module.exports`, `exports = ...`.
- All backend code should use `import` / `export` syntax consistently.


### Express Structure and Middleware


- Follow the standard **Express pattern**:
  - Use **route handlers** (`app.get`, `app.post`, etc.) for API endpoints.
  - Use **middleware** for cross-cutting concerns (logging, auth, sessions, etc.).
- Middleware functions must have the signature `(req, res, next)` and:
  - Call `next()` when passing control to the next middleware/handler.
  - Or end the request by sending a response (`res.send`, `res.json`, etc.).
- Keep routes and middleware organized in separate modules (e.g. `routes/`, `middleware/`).




### Asynchronous Code Style


- Prefer **`async/await`** for asynchronous operations (database queries, network calls, etc.).
- Avoid long `.then().then().catch()` chains when possible.
- Example:


  ```js
  // Preferred
  const result = await db.query("SELECT ...");
 
  // Less preferred for complex logic
  db.query("SELECT ...")
    .then(...)
    .catch(...);






## 4.1 Formatting Rules


### Tooling: ESLint and Prettier


- The project must use:
  - **ESLint** for static analysis (linting).
  - **Prettier** for automatic code formatting.
- Configure npm scripts, for example:
  - `"lint": "eslint ."`
  - `"format": "prettier --write ."`
- Recommended:
  - Run Prettier and ESLint automatically on commit (e.g., via a git hook).
- **Do not commit code** that:
  - Fails ESLint linting.
  - Is not formatted by Prettier.




❗ These rules are strictly graded.


- No tabs anywhere in the code  
- Consistent whitespace  
- No run‑together code  
- No major misalignment  
- No commented-out blocks  
- Proper spacing between logical sections  
- No debug output in final repo  
- No compile warnings  


## 4.2 Explicit Code Only
Professor specifically forbids implicit JS expressions like:


```
input && input.addEventListener()
```


Must be rewritten as:


```
if (input !== null) {
  input.addEventListener();
}
```


Explicit comparisons only.  
No clever shortcuts.  
Readable > compact.


## 4.3 Naming & Structure
- Variables must be intention‑revealing  
- No vague names (e.g., `x`, `data1`, `thing`)  
- No unnecessary comments  
- Functions should do **one thing**  
- Modules grouped logically (e.g., `auth/`, `game/`, `db/`, `sockets/`)  


## 4.4 File Organization
- Must use modules to separate concerns  
- No giant files with mixed responsibilities  


---


# 5. GitHub Requirements (Professor Will Check Weekly)
- Use **GitHub Issues** for weekly planning  
- Use **Pull Requests** for all merged code  
- Use GitHub for milestones submission  
- Weekly milestone submission required  


Missing a milestone = **instant 0 for that week**.


---


# 6. Features (Team + Required Combined)


## 6.1 Mandatory Poker Features
- 2 cards dealt to each player  
- Community cards (flop, turn, river)  
- Blinds assigned automatically  
- Actions: Call, Raise, Fold  
- Pot updates correctly  
- Showdown logic implemented  
- Server determines winner  


## 6.2 Optional Features
(Not required but allowed)
- Leaderboards  
- Player statistics  
- Spectator mode  
- Replays  


---


# 7. Technology Stack (Required + Chosen)


## 7.1 Required
### Runtime and Package Manager


- JavaScript runtime: **Node.js only**.
- Package manager: **npm only**.
- Do **not** use alternative runtimes (Deno, Bun, etc.).
- Do **not** use alternative package managers (Yarn, pnpm, etc.).
- All dependencies and scripts must be managed via `package.json`.


- Express.js  
- PostgreSQL  
- Render.com deployment  
- WebSockets  
- GitHub Classroom repo  


## 7.2 Team’s Stack
- Backend: Node.js + Express  
- DB: PostgreSQL  
- Real-time: WebSockets  
- Frontend: JS + CSS  DO NOT use React and Tailwind (if you see Tailwind, just ignore or delete it)
- Hosting: Render  


## 7.3 Week 8 Technology Constraints (New)


### Frontend Implementation Rules
- **React is explicitly banned** – do not include it anywhere in the stack.
- Build the UI with **HTML + CSS**  and **plain JavaScript** (or TypeScript compiled to JS).
- Real-time updates must use the browser’s native **WebSocket API** or a lightweight helper such as **Socket.IO**.


### Database Access Expectations
- Continue using **PostgreSQL**, but interact with it “close to the metal.”
- Use the standard Postgres client (e.g., `pg`) and **write SQL directly**.
- Heavy ORMs such as **Prisma are not allowed** because they hide SQL from the developer.


### HTTP Requests from the Frontend
- Default to the built-in **Fetch API** for all HTTP calls.
- Libraries such as **Axios** are allowed but **strongly discouraged** because they add unnecessary dependencies.


### Authentication Stack Guidance
- **Roll your own auth**: implement sessions, login, and logout logic yourselves so everyone understands the flow.
- Tools like JWT or Passport can be helpers, but they must not become “magic black boxes.” Keep the flow simple and transparent.


### SQL Querying Conventions
- Never pull an entire table into Node.js just to filter it in JavaScript.
- Always push filtering/limiting logic into SQL using `WHERE`, `ORDER BY`, `LIMIT`, and `JOIN`.
- Rule of thumb: **“Let the database do the work.”**


### Ordering and Normalized Schema
- Preserve seating/card order by querying with explicit `ORDER BY` clauses (e.g., `seat_number`, `card_order`, `game_user_id`).
- Design tables with proper join tables and normalization so Milestone 2’s ERD matches the implemented schema and avoids duplication.


### Quick Recap of New Expectations
- React forbidden; use HTML/CSS/JS + WebSockets or Socket.IO.
- Write SQL manually via the `pg` client; no heavy ORMs.
- Use `fetch` instead of Axios unless there is a compelling reason.
- Implement authentication yourselves; JWT/Passport optional.
- Filter/limit data inside SQL, never in JS after a `SELECT *`.
- Use `ORDER BY` to keep seat/card order deterministic.
- Keep the schema normalized with join tables.


---


# 8. Wireframes (Completed)
- Login  
- Signup  
- Lobby (create/join/spectate game)  
- Game Waiting Room  
- Game In-Progress Room  


---


# 9. Game Flow (High-Level)
1. User logs in  
2. Enters lobby  
3. Creates/joins/spectates game  
4. Players gather in room  
5. Game auto-starts  
6. Betting rounds  
7. Winner revealed  
8. Game continues  

---


# 11. Future Milestones (Full List)


## 11.1 Milestone 2 (Detailed Requirements)
- Full **ERD + database schema**
- Full **API endpoints list**
- **Game state model**
- **Socket event architecture**
- Lobby logic (filters, game list)
- Architecture diagram
- Backend prototyping
- Basic deployment on Render
- GitHub Issues board setup


## 11.2 Milestone 3
- Complete gameplay logic  
- All WS events implemented  
- Persistent DB-backed game state  
- Full frontend  
- Testing + bug fixes  
- Final UX adjustments  
- Stable deployment  


---


# 12. Final Deliverables Checklist
- Fully working multiplayer poker game  
- Authentication, chat, gameplay, persistence  
- Unlimited game rooms  
- Clean, readable, explicit code  
- GitHub issues + PRs showing real work  
- Final presentation (10–12 minutes) containing:
  - Agenda  
  - Technical explanation  
  - Difficulties  
  - Learnings  
  - 3‑minute demo  


---


# 13. Critical Items to Avoid (COMPLETE LIST – No Missing Items)


These are ALL items from professor notes + lecture + rubric.


## 13.1 Code / Logic
- ❌ Storing ANY game state on client  
- ❌ Using localStorage  
- ❌ Using implicit JS (`a && b()`)  
- ❌ Do not rely on implicit JS expressions (input && input.addEventListener())
- ❌ Using tabs  
- ❌ Debug logs in final repo  
- ❌ Messy indentation  
- ❌ Multi-purpose functions  
- ❌ Poor naming  
- ❌ Commenting out blocks or leaving unused code  
- ❌ Relying on client-held state (must be server)  
- ❌ Client rendering hidden cards that shouldn’t be sent


## 13.2 Project / Planning
- ❌ Starting to code before planning  
- ❌ Not using GitHub Issues  
- ❌ Not using Pull Requests  
- ❌ Not assigning tasks explicitly  
- ❌ Team members not communicating  
- ❌ Avoiding uncomfortable conversations about contribution  
- ❌ Not documenting who does what  


## 13.3 Game Requirements
- ❌ Using unapproved external libraries  
- ❌ Letting players see other hands  
- ❌ Not supporting multiple simultaneous games  


## 13.4 Milestones / Presentation
- ❌ Missing milestone submissions (auto zero)  
- ❌ Sloppy slides  
- ❌ Grammar errors  
- ❌ Not including agenda  
- ❌ Presenting under 10 minutes or over 12  
- ❌ No demo  


---


# 14. Summary
This document is a **complete, professor-accurate, no‑risk version** combining your team’s progress and every critical requirement from the Term Project guide. Nothing essential is missing, and this version ensures no point loss due to overlooked requirements.
