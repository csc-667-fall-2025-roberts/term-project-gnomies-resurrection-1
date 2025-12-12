## Core Gameplay loop and dealer actions:
- When >2 players are in the game game owner will be prompted to start game
- Upon game start, server deals 2 cards to each player, randomly assign big blind and assign small blind on BB's right hand side. 
- Pre-flop. See betting logic
- Server places 3 community cards on table
- Flop. See betting logic
- Server places 4th community card on table
- turn. See betting logic
- Server places 5th community card on table
- River. See betting logic
- Players reveal their cards, a winner is chosen via winner evaluation logic.

## Betting logic:
- Server takes money from BB and SB and adds to pot. Go blockwise from person on BB's left and prompt them to bet, match, raise, or fold. Give them 20 seconds.
- How to handle no players betting.
- How to handle re-raising/re-matching?
- Players who do not act within the 20 second time period automatically fold and forfeit all money put in the pot.

## Winner Evaluation Logic
- Starting from the first player in the table store their deck, and set this first player as the candidate to be the winner.
- Each player onwards has their deck evaluated and compared against the current winning candidate (this will be done by a separate component)
- Repeat step 2 until all players have been evaluated, the player with the strongest deck will win the game and the money.

## Deck evaluation logic
1. High Card
2. One Pair
3. Two Pair
4. Three of a Kind
5. Straight
6. Flush
7. Full House
8. Four of a Kind
9. Straight Flush
10. Royal Flush
