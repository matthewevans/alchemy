import type { GameState, PlayerId, PlayerState, RNG, RulesetConfig } from './types';
import { createEmptyStats } from './types';
import { buildDeck } from './deck';
import { drawOpeningHand } from './deck';

export interface GameInitConfig {
  ruleset: RulesetConfig;
  player1Deck: string[];
  player2Deck: string[];
  rng: RNG;
  startingPlayer?: PlayerId;
}

function createPlayerState(
  deckCardIds: string[],
  ruleset: RulesetConfig,
  rng: RNG,
  playerId: PlayerId,
): PlayerState {
  const prefix = playerId === 'player1' ? 'p1' : 'p2';
  const shuffledDeck = buildDeck(deckCardIds, rng, prefix);
  const { hand, remaining } = drawOpeningHand(
    shuffledDeck,
    ruleset.startingHandSize,
    rng,
  );

  return {
    health: ruleset.startingHealth,
    maxEnergy: 0,
    currentEnergy: 0,
    hand,
    deck: remaining,
    board: Array(ruleset.maxBoardSize).fill(null),
    discard: [],
    fatigueDamage: 0,
    mulliganUsed: false,
  };
}

export function createInitialGameState(config: GameInitConfig): GameState {
  const startingPlayer = config.startingPlayer ?? 'player1';

  return {
    ruleset: config.ruleset,
    phase: { type: 'mulligan', player: startingPlayer },
    turn: 0,
    activePlayer: startingPlayer,
    players: {
      player1: createPlayerState(config.player1Deck, config.ruleset, config.rng, 'player1'),
      player2: createPlayerState(config.player2Deck, config.ruleset, config.rng, 'player2'),
    },
    stats: {
      player1: createEmptyStats(),
      player2: createEmptyStats(),
    },
  };
}
