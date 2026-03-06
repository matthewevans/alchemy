import type { RNG } from './types';

// ─── Types ───

export type AIDifficulty = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
export type AIPersonality = 'aggressive' | 'defensive' | 'balanced';
export type AIPolicy = 'heuristic' | 'tree_search';

export interface EvalWeights {
  /** Value of own health advantage. */
  health: number;
  /** Value of reducing opponent health. */
  aggression: number;
  /** Value per creature on board. */
  boardPresence: number;
  /** Value per point of total attack power on board. */
  boardPower: number;
  /** Value per point of total creature durability (current health) on board. */
  boardDurability: number;
  /** Value per card in hand. */
  handSize: number;
}

export interface AISearchConfig {
  enabled: boolean;
  maxDepth: number;
  maxNodes: number;
  maxBranching: number;
  rolloutDepth: number;
  useTransposition: boolean;
}

export interface AIConfig {
  difficulty: AIDifficulty;
  personality: AIPersonality;
  policy: AIPolicy;
  /** Softmax temperature — lower = more deterministic, higher = more random. */
  temperature: number;
  /** Use 1-ply lookahead for play-phase card selection. */
  playLookahead: boolean;
  /** Use scored evaluation for combat decisions (attackers/blockers). */
  combatLookahead: boolean;
  /** Optional bounded tree-search on top of the heuristic policy. */
  search: AISearchConfig;
  /** Board evaluation weights (personality-adjusted). */
  weights: EvalWeights;
}

// ─── Personality Weight Profiles ───

const PERSONALITY_WEIGHTS: Record<AIPersonality, EvalWeights> = {
  aggressive: {
    health: 0.8,
    aggression: 1.5,
    boardPresence: 1.0,
    boardPower: 1.4,
    boardDurability: 0.6,
    handSize: 0.5,
  },
  defensive: {
    health: 1.5,
    aggression: 0.7,
    boardPresence: 1.2,
    boardPower: 0.7,
    boardDurability: 1.4,
    handSize: 1.0,
  },
  balanced: {
    health: 1.0,
    aggression: 1.0,
    boardPresence: 1.0,
    boardPower: 1.0,
    boardDurability: 1.0,
    handSize: 0.8,
  },
};

// ─── Difficulty Presets ───

interface DifficultyPreset {
  policy: AIPolicy;
  temperature: number;
  playLookahead: boolean;
  combatLookahead: boolean;
  search: AISearchConfig;
}

const DIFFICULTY_PRESETS: Record<AIDifficulty, DifficultyPreset> = {
  very_easy: {
    policy: 'heuristic',
    temperature: 4.0,
    playLookahead: false,
    combatLookahead: false,
    search: {
      enabled: false,
      maxDepth: 1,
      maxNodes: 4,
      maxBranching: 2,
      rolloutDepth: 0,
      useTransposition: true,
    },
  },
  easy: {
    policy: 'heuristic',
    temperature: 2.0,
    playLookahead: true,
    combatLookahead: false,
    search: {
      enabled: false,
      maxDepth: 1,
      maxNodes: 8,
      maxBranching: 3,
      rolloutDepth: 0,
      useTransposition: true,
    },
  },
  medium: {
    policy: 'tree_search',
    temperature: 1.0,
    playLookahead: true,
    combatLookahead: true,
    search: {
      enabled: true,
      maxDepth: 2,
      maxNodes: 16,
      maxBranching: 4,
      rolloutDepth: 0,
      useTransposition: true,
    },
  },
  hard: {
    policy: 'tree_search',
    temperature: 0.5,
    playLookahead: true,
    combatLookahead: true,
    search: {
      enabled: true,
      maxDepth: 2,
      maxNodes: 24,
      maxBranching: 4,
      rolloutDepth: 2,
      useTransposition: true,
    },
  },
  very_hard: {
    policy: 'tree_search',
    temperature: 0.01,
    playLookahead: true,
    combatLookahead: true,
    search: {
      enabled: true,
      maxDepth: 2,
      maxNodes: 32,
      maxBranching: 5,
      rolloutDepth: 2,
      useTransposition: true,
    },
  },
};

// ─── Factory ───

const PERSONALITIES: AIPersonality[] = ['aggressive', 'defensive', 'balanced'];

export function createAIConfig(difficulty: AIDifficulty, rng: RNG): AIConfig {
  const personality = difficulty === 'very_hard'
    ? 'balanced'
    : difficulty === 'hard'
      ? 'aggressive'
      : PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)];
  const preset = DIFFICULTY_PRESETS[difficulty];
  return {
    difficulty,
    personality,
    policy: preset.policy,
    temperature: preset.temperature,
    playLookahead: preset.playLookahead,
    combatLookahead: preset.combatLookahead,
    search: { ...preset.search },
    weights: { ...PERSONALITY_WEIGHTS[personality] },
  };
}

/** Sensible default config (medium difficulty, balanced personality). */
export const DEFAULT_AI_CONFIG: AIConfig = {
  difficulty: 'medium',
  personality: 'balanced',
  policy: 'tree_search',
  temperature: 1.0,
  playLookahead: true,
  combatLookahead: true,
  search: {
    enabled: true,
    maxDepth: 2,
    maxNodes: 16,
    maxBranching: 4,
    rolloutDepth: 0,
    useTransposition: true,
  },
  weights: { ...PERSONALITY_WEIGHTS.balanced },
};

export const DIFFICULTY_ORDER: readonly AIDifficulty[] = [
  'very_easy',
  'easy',
  'medium',
  'hard',
  'very_hard',
];

export const DIFFICULTY_LABELS: Record<AIDifficulty, { label: string; description: string }> = {
  very_easy: { label: 'Very Easy', description: 'Plays cards but rarely finds good lines' },
  easy: { label: 'Easy', description: 'Decent card picks, sloppy combat' },
  medium: { label: 'Medium', description: 'Solid play with occasional mistakes' },
  hard: { label: 'Hard', description: 'Near-optimal with slight variance' },
  very_hard: { label: 'Very Hard', description: 'Practically perfect play' },
};
