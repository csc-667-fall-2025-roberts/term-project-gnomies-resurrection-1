/**
 * Poker Game Type Definitions
 * 
 * Purpose: TypeScript interfaces for poker game state
 * Pattern: professor_sample_code/frontend/game/types.ts
 */

/**
 * Represents a single playing card
 */
export interface Card {
    rank: string;  // '2'-'10', 'J', 'Q', 'K', 'A'
    suit: string;  // 'hearts', 'diamonds', 'clubs', 'spades'
}

/**
 * Represents a player in the poker game
 */
export interface Player {
    user_id: number;
    username: string;
    chip_count: number;
    current_bet: number;
    position: number;  // 0-8 (seat position at table)
    is_dealer: boolean;
    is_folded: boolean;
    hand_cards: Card[];  // Only populated for current user
}

/**
 * The current stage of a poker hand
 */
export type HandStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

/**
 * Types of betting actions a player can take
 */
export type BettingAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

/**
 * Complete game state update from server
 */
export interface GameStateUpdate {
    pot: number;
    community_cards: Card[];
    players: Player[];
    my_cards: Card[];
    current_stage: HandStage;
    is_my_turn: boolean;
    current_turn_user_id: number | null;
    min_bet: number;
    min_raise: number;
    dealer_position: number;
}

/**
 * Result of a betting action
 */
export interface BettingResult {
    action: BettingAction;
    amount: number;
    player_id: number;
    new_pot: number;
    new_player_stack: number;
}
