import type { RNG } from './types';

// ─── Types ───

export type AIDifficulty = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
export type AIPersonality = 'aggressive' | 'defensive' | 'balanced';

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

export interface AIConfig {
  difficulty: AIDifficulty;
  personality: AIPersonality;
  /** Softmax temperature — lower = more deterministic, higher = more random. */
  temperature: number;
  /** Use 1-ply lookahead for play-phase card selection. */
  playLookahead: boolean;
  /** Use scored evaluation for combat decisions (attackers/blockers). */
  combatLookahead: boolean;
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
  temperature: number;
  playLookahead: boolean;
  combatLookahead: boolean;
}

const DIFFICULTY_PRESETS: Record<AIDifficulty, DifficultyPreset> = {
  very_easy: { temperature: 4.0, playLookahead: false, combatLookahead: false },
  easy: { temperature: 2.0, playLookahead: true, combatLookahead: false },
  medium: { temperature: 1.0, playLookahead: true, combatLookahead: true },
  hard: { temperature: 0.5, playLookahead: true, combatLookahead: true },
  very_hard: { temperature: 0.15, playLookahead: true, combatLookahead: true },
};

// ─── Factory ───

const PERSONALITIES: AIPersonality[] = ['aggressive', 'defensive', 'balanced'];

export function createAIConfig(difficulty: AIDifficulty, rng: RNG): AIConfig {
  const personality = PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)];
  const preset = DIFFICULTY_PRESETS[difficulty];
  return {
    difficulty,
    personality,
    temperature: preset.temperature,
    playLookahead: preset.playLookahead,
    combatLookahead: preset.combatLookahead,
    weights: { ...PERSONALITY_WEIGHTS[personality] },
  };
}

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
