import { describe, it, expect } from 'vitest';
import { enumerateLegalActions } from '../validation';
import { reduce } from '../reducer';
import { createRNG } from '../prng';
import { createTestGameState, makeCardInstance, makePermanent } from './__fixtures__/testHelpers';
import type { GameState, PlayerId } from '../types';

/**
 * Tests for auto-advance logic — verifying that the game correctly
 * identifies when a player has no meaningful choices and should skip forward.
 */

/** Check if the only meaningful actions are ADVANCE_PHASE and CONCEDE. */
function hasMeaningfulActions(state: GameState, player: PlayerId): boolean {
  const actions = enumerateLegalActions(state, player);
  return actions.some((a) => a.type !== 'ADVANCE_PHASE' && a.type !== 'CONCEDE');
}

/** Check if battle has any attackers to declare. */
function hasAttackableCreatures(state: GameState, player: PlayerId): boolean {
  const actions = enumerateLegalActions(state, player);
  return actions.some((a) => a.type === 'DECLARE_ATTACKER');
}

describe('auto-advance: play phase with no playable cards', () => {
  it('has no meaningful actions when hand is empty and board is empty', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: { hand: [], currentEnergy: 5, maxEnergy: 5 },
    });
    expect(hasMeaningfulActions(state, 'player1')).toBe(false);
  });

  it('has no meaningful actions when all cards cost more than current energy', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [
          makeCardInstance('fire_magma_golem'),  // cost 3
          makeCardInstance('fire_dragon_whelp'),  // cost 5
        ],
        currentEnergy: 2,
        maxEnergy: 2,
      },
    });
    expect(hasMeaningfulActions(state, 'player1')).toBe(false);
  });

  it('has meaningful actions when a card is affordable', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [makeCardInstance('fire_ember_sprite')],  // cost 1
        currentEnergy: 1,
        maxEnergy: 1,
      },
    });
    expect(hasMeaningfulActions(state, 'player1')).toBe(true);
  });
});

describe('auto-advance: battle phase with no attackers', () => {
  it('has no attackable creatures when board is empty', () => {
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
    });
    expect(hasAttackableCreatures(state, 'player1')).toBe(false);
  });

  it('has no attackable creatures when all are tapped', () => {
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      player1: {
        board: [
          makePermanent('fire_ember_sprite', 'player1', { isTapped: true }),
          null, null, null, null,
        ],
      },
    });
    expect(hasAttackableCreatures(state, 'player1')).toBe(false);
  });

  it('has no attackable creatures when all have summoning sickness (no swift)', () => {
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      player1: {
        board: [
          makePermanent('fire_lava_hound', 'player1', { summonedThisTurn: true }),
          null, null, null, null,
        ],
      },
    });
    expect(hasAttackableCreatures(state, 'player1')).toBe(false);
  });

  it('has attackable creatures when an untapped, non-sick creature exists', () => {
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      player1: {
        board: [
          makePermanent('fire_lava_hound', 'player1', {
            attack: 2, health: 3,
            isTapped: false, summonedThisTurn: false,
          }),
          null, null, null, null,
        ],
      },
    });
    expect(hasAttackableCreatures(state, 'player1')).toBe(true);
  });

  it('swift creatures can attack even with summoning sickness', () => {
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      player1: {
        board: [
          makePermanent('fire_ember_sprite', 'player1', {
            attack: 1, health: 2,
            summonedThisTurn: true,
          }),
          null, null, null, null,
        ],
      },
    });
    // fire_ember_sprite has swift keyword
    expect(hasAttackableCreatures(state, 'player1')).toBe(true);
  });
});

describe('auto-advance: confirm attackers with 0 attackers skips combat', () => {
  it('confirming with 0 attackers goes to post-combat play', () => {
    const rng = createRNG(42);
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      turn: 2,
      player1: { maxEnergy: 2, currentEnergy: 0 },
      player2: { maxEnergy: 1, currentEnergy: 0 },
    });

    const result = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    expect(result.newState.phase).toEqual({ type: 'play', postCombat: true });
  });
});

describe('auto-advance: end phase requires explicit action', () => {
  it('end phase has ADVANCE_PHASE as a meaningful action', () => {
    const state = createTestGameState({
      phase: { type: 'end' },
    });
    const actions = enumerateLegalActions(state, 'player1');
    expect(actions.some((a) => a.type === 'ADVANCE_PHASE')).toBe(true);
  });
});
