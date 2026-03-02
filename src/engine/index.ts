// Core types
export type {
  PlayerId,
  Tier,
  Element,
  Keyword,
  CardDefinition,
  CardInstance,
  Permanent,
  Phase,
  GameState,
  PlayerState,
  GameAction,
  GameEvent,
  TargetRef,
  TargetingType,
  RulesetConfig,
  RNG,
  ReducerResult,
  ValidationResult,
} from './types';
export { getOpponent, getCurrentHealth, getEffectiveAttack, getActingPlayer } from './types';

// Registries
export { CARD_REGISTRY, ALL_CARDS, getCardsByElement, getCardsByTier } from './cards';
export { KEYWORD_REGISTRY, getKeywordsForTier } from './keywords';
export type { KeywordDefinition } from './keywords';
export { EFFECT_REGISTRY } from './effects';
export type { EffectDefinition, EffectStep } from './effects';

// Configuration
export { TIER_CONFIGS, TIER_ORDER } from './ruleset';
export { ELEMENT_META, ELEMENTS, ALLIED_PAIRS } from './elements';

// Engine
export { reduce } from './reducer';
export { validateAction, enumerateLegalActions } from './validation';
export { createInitialGameState } from './gameInit';
export type { GameInitConfig } from './gameInit';

// AI
export { chooseAction, runAITurn } from './ai';

// Simulation
export { simulateGame, simulateMatchup } from './simulate';
export type { SimulationConfig, GameResult, MatchupStats } from './simulate';

// Utilities
export { createRNG, restoreRNG, shuffle } from './prng';
export type { SeededRNG } from './prng';
export { buildDeck, drawCards, drawOpeningHand, performMulligan, validateDeck } from './deck';
