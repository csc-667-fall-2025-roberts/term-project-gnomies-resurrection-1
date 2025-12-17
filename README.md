# TODO

## General
- [x] ~~Change styling in game page to match overall style (Sal)~~
- [x] Fix error where you are not routed to game page after creating game (Bao) 
- [ ] Create unique game rooms for each game (Sal)  
  *(NOTE: See TODO.md Task 1 - Frontend socket join fix)*
- [x] ~~Make an entry in the "table" table for every entry in "game" table~~ (No longer doing)
- [x] ~~Add functionality for checking available games in lobby (Bao)~~
- [x] ~~Add cards to "card" table in DB(John)~~
- [x] Clicking "join" or "rejoin" game in lobby routes you to game (Bao)  
- [ ] Implement feature for game owner to start game once enough players present  
  *(NOTE: See TODO.md Task 4 - Start Game Feature)*

## Gameplay loop
- [ ] Implement server dealing private cards  *(NOTE: Phase 2 feature - not in Phase 1/TODO.md yet)*
    - First get it to update the DB
    - Get it to render on webpage
- [ ] Implement server dealing community cards  *(NOTE: Phase 2 feature - not in Phase 1/TODO.md yet)*
    - if game state = "flop": deal 3 community cards
    - else "turn", or "river" game state: deal 1 card
- [ ] Implement betting logic  *(NOTE: Phase 2 feature - not in Phase 1/TODO.md yet)*
- [ ] Implement component to compare players decks and choose winner  *(NOTE: Phase 2 feature - not in Phase 1/TODO.md yet)*
- [ ] Implement server dealer actions  *(NOTE: Phase 2 feature - not in Phase 1/TODO.md yet)*

---
