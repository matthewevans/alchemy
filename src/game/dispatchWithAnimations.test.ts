import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRNG } from '@engine/prng';
import { createTestGameState, makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { useAnimationStore } from './animationStore';
import { useGameStore } from './gameStore';
import { dispatchWithAnimations } from './dispatchWithAnimations';

describe('dispatchWithAnimations', () => {
  beforeEach(() => {
    resetTestCounters();
    useAnimationStore.setState({
      positions: new Map(),
      queue: [],
      activeStep: null,
      isAnimating: false,
    });
  });

  it('enqueues animation steps for combat resolution actions', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      isTapped: true,
    });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {},
      },
      player1: { board: [attacker, null, null, null, null, null] },
      player2: { health: 20 },
    });

    useGameStore.setState({
      state,
      rng: createRNG(7),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });
    useAnimationStore.setState({
      positions: new Map([
        [attacker.permanentId, { x: 120, y: 210, width: 80, height: 120 }],
        ['player:player2', { x: 330, y: 60, width: 56, height: 56 }],
      ]),
    });

    dispatchWithAnimations({ type: 'CONFIRM_BLOCKERS' }, 'player2');

    const activeStep = useAnimationStore.getState().activeStep;
    expect(activeStep).not.toBeNull();
    expect(activeStep?.effects.some((effect) => effect.type === 'combat_strike')).toBe(true);
    expect(activeStep?.effects.some((effect) => effect.type === 'player_damage')).toBe(true);
  });

  it('notifies optional local-action callback once', () => {
    const state = createTestGameState({ phase: { type: 'play' } });
    useGameStore.setState({
      state,
      rng: createRNG(1),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });

    const onLocalAction = vi.fn();
    dispatchWithAnimations({ type: 'ADVANCE_PHASE' }, 'player1', onLocalAction);
    expect(onLocalAction).toHaveBeenCalledTimes(1);
  });
});

