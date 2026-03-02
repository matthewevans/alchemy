import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateState, softmaxSelect } from '../aiEval';
import { createAIConfig, DIFFICULTY_ORDER } from '../aiConfig';
import type { EvalWeights } from '../aiConfig';
import { createRNG } from '../prng';
import { createTestGameState, makePermanent, resetTestCounters } from './__fixtures__/testHelpers';

const BALANCED: EvalWeights = {
  health: 1.0,
  aggression: 1.0,
  boardPresence: 1.0,
  boardPower: 1.0,
  boardDurability: 1.0,
  handSize: 0.8,
};

beforeEach(() => {
  resetTestCounters();
});

// ─── softmaxSelect ───

describe('softmaxSelect', () => {
  it('returns 0 for single-element array', () => {
    expect(softmaxSelect([5], 1.0, 0.5)).toBe(0);
  });

  it('picks highest score at very low temperature (argmax)', () => {
    expect(softmaxSelect([1, 5, 3], 0.001, 0.5)).toBe(1);
    expect(softmaxSelect([10, 2, 8], 0.001, 0.99)).toBe(0);
  });

  it('picks first index when rand = 0', () => {
    // At any temperature, rand=0 should pick the first item with nonzero probability
    const idx = softmaxSelect([1, 1, 1], 1.0, 0.0);
    expect(idx).toBe(0);
  });

  it('picks last index when rand is near 1', () => {
    const idx = softmaxSelect([1, 1, 1], 1.0, 0.999);
    expect(idx).toBe(2);
  });

  it('handles all equal scores without crashing', () => {
    const idx = softmaxSelect([0, 0, 0, 0], 1.0, 0.5);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(4);
  });

  it('handles negative scores', () => {
    const idx = softmaxSelect([-10, -5, -1], 0.001, 0.5);
    expect(idx).toBe(2); // -1 is the highest
  });

  it('handles large score differences without NaN', () => {
    const idx = softmaxSelect([0, 10000], 1.0, 0.5);
    expect(idx).toBe(1); // exp(10000) dominates
    expect(Number.isNaN(idx)).toBe(false);
  });

  it('returns 0 for all -Infinity scores (degenerate case)', () => {
    const idx = softmaxSelect([-Infinity, -Infinity, -Infinity], 1.0, 0.5);
    expect(idx).toBe(0);
    expect(Number.isNaN(idx)).toBe(false);
  });

  it('handles mix of -Infinity and finite scores', () => {
    const idx = softmaxSelect([-Infinity, 5, -Infinity], 0.001, 0.5);
    expect(idx).toBe(1); // only finite option
  });

  it('approaches uniform distribution at high temperature', () => {
    const counts = [0, 0, 0];
    const scores = [1, 2, 3];
    for (let i = 0; i < 100; i++) {
      const rand = i / 100;
      counts[softmaxSelect(scores, 100.0, rand)]++;
    }
    // With temperature=100, should be roughly uniform (each ~33%)
    for (const count of counts) {
      expect(count).toBeGreaterThan(20);
      expect(count).toBeLessThan(45);
    }
  });
});

// ─── evaluateState ───

describe('evaluateState', () => {
  it('returns +10000 for game_over win', () => {
    const state = createTestGameState({
      phase: { type: 'game_over', winner: 'player1' },
    });
    expect(evaluateState(state, 'player1', BALANCED)).toBe(10000);
    expect(evaluateState(state, 'player2', BALANCED)).toBe(-10000);
  });

  it('returns -10000 for game_over loss', () => {
    const state = createTestGameState({
      phase: { type: 'game_over', winner: 'player2' },
    });
    expect(evaluateState(state, 'player1', BALANCED)).toBe(-10000);
    expect(evaluateState(state, 'player2', BALANCED)).toBe(10000);
  });

  it('scores empty board based on health and hand', () => {
    const state = createTestGameState();
    // Both players start equal: score should be 0 with balanced weights
    const score = evaluateState(state, 'player1', BALANCED);
    expect(score).toBe(0);
  });

  it('favors the player with more board presence', () => {
    const creature = makePermanent('fire_lava_hound', 'player1', { attack: 2, health: 3 });
    const state = createTestGameState({
      player1: { board: [creature, null, null, null, null] },
    });
    const p1Score = evaluateState(state, 'player1', BALANCED);
    const p2Score = evaluateState(state, 'player2', BALANCED);
    expect(p1Score).toBeGreaterThan(0);
    expect(p2Score).toBeLessThan(0);
  });

  it('aggressive weights value opponent health reduction more', () => {
    const aggressive: EvalWeights = { ...BALANCED, health: 0.8, aggression: 1.5 };
    const defensive: EvalWeights = { ...BALANCED, health: 1.5, aggression: 0.7 };

    // Player 1 at 20, opponent at 15 — player 1 is ahead
    const state = createTestGameState({
      player1: { health: 20 },
      player2: { health: 15 },
    });

    const aggressiveScore = evaluateState(state, 'player1', aggressive);
    const defensiveScore = evaluateState(state, 'player1', defensive);

    // healthScore = w.health * myHealth - w.aggression * theirHealth
    // aggressive: 0.8*20 - 1.5*15 = 16 - 22.5 = -6.5
    // defensive:  1.5*20 - 0.7*15 = 30 - 10.5 = 19.5
    // But for p1, the TOTAL advantage matters (subtract p2's perspective):
    // aggressive favors reducing opponent health more, so when opponent is already
    // lower, the aggressive score from p1's perspective captures that better.
    // Actually: aggressive penalizes opponent health MORE (1.5x), so opponent at 15
    // costs p1 MORE in the health equation than defensive does.
    // Defensive values own health MORE (1.5x), so p1 at 20 is worth MORE.
    // Net: defensive is happier here because it values keeping own health high.
    expect(defensiveScore).toBeGreaterThan(aggressiveScore);
  });

  it('health advantage produces positive score', () => {
    const state = createTestGameState({
      player1: { health: 20 },
      player2: { health: 10 },
    });
    const score = evaluateState(state, 'player1', BALANCED);
    // healthScore = 1.0*20 - 1.0*10 = 10 (positive)
    expect(score).toBeGreaterThan(0);
  });
});

// ─── createAIConfig ───

describe('createAIConfig', () => {
  it('maps each difficulty to correct temperature', () => {
    const expected: Record<string, number> = {
      very_easy: 4.0,
      easy: 2.0,
      medium: 1.0,
      hard: 0.5,
      very_hard: 0.15,
    };

    for (const difficulty of DIFFICULTY_ORDER) {
      const rng = createRNG(42);
      const config = createAIConfig(difficulty, rng);
      expect(config.temperature, difficulty).toBe(expected[difficulty]);
    }
  });

  it('very_easy has no lookahead', () => {
    const config = createAIConfig('very_easy', createRNG(42));
    expect(config.playLookahead).toBe(false);
    expect(config.combatLookahead).toBe(false);
  });

  it('hard has full lookahead', () => {
    const config = createAIConfig('hard', createRNG(42));
    expect(config.playLookahead).toBe(true);
    expect(config.combatLookahead).toBe(true);
  });

  it('selects personality from the three options', () => {
    const personalities = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const config = createAIConfig('medium', createRNG(seed));
      personalities.add(config.personality);
    }
    expect(personalities).toContain('aggressive');
    expect(personalities).toContain('defensive');
    expect(personalities).toContain('balanced');
  });

  it('copies weights by value (not reference)', () => {
    const rng = createRNG(42);
    const config1 = createAIConfig('medium', rng);
    const config2 = createAIConfig('medium', createRNG(42));
    config1.weights.health = 999;
    expect(config2.weights.health).not.toBe(999);
  });
});
