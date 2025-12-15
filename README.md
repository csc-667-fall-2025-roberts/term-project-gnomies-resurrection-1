# TODO

## General
- [x] ~~Change styling in game page to match overall style (Sal)~~
- [] Fix error where you are not routed to game page after creating game 
- [] Create unique game rooms for each game (Sal)
- [x] ~~Make an entry in the "table" table for every entry in "game" table~~ (No longer doing)
- [x] ~~Add functionality for checking available games in lobby (Bao)~~
- [x] ~~Add cards to "card" table in DB(John)~~
- [] Clicking "join" or "rejoin" game in lobby routes you to game
- [] Implement feature for game owner to start game once enough players present

## Gameplay loop
- [] Implement server dealing private cards
    - First get it to update the DB
    - Get it to render on webpage
- [] Implement server dealing community cards
    - if game state = "flop": deal 3 community cards
    - else "turn", or "river" game state: deal 1 card
- [] Implement betting logic
- [] Implement component to compare players decks and choose winner
- [] Implement server dealer actions
