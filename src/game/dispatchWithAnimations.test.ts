import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRNG } from '@engine/prng';
import { createTestGameState, makeCardInstance, makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { useAnimationStore, registerPosition, unregisterPosition } from './animationStore';
import { useGameStore } from './gameStore';
import { useLearningStore } from './learningStore';
import { usePreferencesStore } from './preferencesStore';
import { dispatchWithAnimations } from './dispatchWithAnimations';

describe('dispatchWithAnimations', () => {
  beforeEach(() => {
    resetTestCounters();
    useAnimationStore.setState({
      queue: [],
      activeStep: null,
      isAnimating: false,
    });
    // Clear any registered positions
    unregisterPosition('player:player1');
    unregisterPosition('player:player2');
    useLearningStore.getState().reset();
    usePreferencesStore.setState({
      learningChallengesEnabled: false,
      readingChallengesEnabled: true,
      mathChallengesEnabled: true,
      readingLevel: 'r1',
      mathLevel: 'm1',
      learningFrequency: 'medium',
      readingChallengeWeight: 5,
      wordChallengeWeight: 3,
      mathChallengeWeight: 5,
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
    registerPosition(attacker.permanentId, { x: 120, y: 210, width: 80, height: 120 });
    registerPosition('player:player2', { x: 330, y: 60, width: 56, height: 56 });

    dispatchWithAnimations({ type: 'CONFIRM_BLOCKERS' }, 'player2');

    const { activeStep, queue } = useAnimationStore.getState();
    expect(activeStep).not.toBeNull();
    const allEffects = [
      ...(activeStep?.effects ?? []),
      ...queue.flatMap((s) => s.effects),
    ];
    expect(allEffects.some((effect) => effect.type === 'combat_strike')).toBe(true);
    expect(allEffects.some((effect) => effect.type === 'player_damage')).toBe(true);

    // Clean up registered positions
    unregisterPosition(attacker.permanentId);
    unregisterPosition('player:player2');
  });

  it('keeps per-pair combat sequencing when resolving from post-blockers priority', () => {
    const attackerA = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      isTapped: true,
    });
    const attackerB = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      isTapped: true,
    });
    const blockerA = makePermanent('water_river_otter', 'player2', {
      attack: 2,
      health: 3,
      isTapped: false,
    });
    const blockerB = makePermanent('water_river_otter', 'player2', {
      attack: 2,
      health: 3,
      isTapped: false,
    });

    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_blockers',
        confirmedAttackers: [attackerA.permanentId, attackerB.permanentId],
        blockers: {
          [blockerA.permanentId]: attackerA.permanentId,
          [blockerB.permanentId]: attackerB.permanentId,
        },
        attackerBlockerOrder: {
          [attackerA.permanentId]: [blockerA.permanentId],
          [attackerB.permanentId]: [blockerB.permanentId],
        },
        priorityPlayer: 'player1',
        passCount: 1,
        stack: [],
      },
      player1: { board: [attackerA, attackerB, null, null, null, null] },
      player2: { board: [blockerA, blockerB, null, null, null, null], health: 20 },
    });

    useGameStore.setState({
      state,
      rng: createRNG(11),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });

    registerPosition(attackerA.permanentId, { x: 110, y: 260, width: 80, height: 120 });
    registerPosition(attackerB.permanentId, { x: 210, y: 260, width: 80, height: 120 });
    registerPosition(blockerA.permanentId, { x: 110, y: 130, width: 80, height: 120 });
    registerPosition(blockerB.permanentId, { x: 210, y: 130, width: 80, height: 120 });

    dispatchWithAnimations({ type: 'PASS_PRIORITY' }, 'player1');

    const { activeStep, queue } = useAnimationStore.getState();
    const allSteps = [
      ...(activeStep ? [activeStep] : []),
      ...queue,
    ];
    const combatSteps = allSteps.filter((step) =>
      step.effects.some((effect) => effect.type === 'combat_strike'),
    );

    expect(combatSteps.length).toBe(2);
    for (const step of combatSteps) {
      const strikeCount = step.effects.filter((effect) => effect.type === 'combat_strike').length;
      expect(strikeCount).toBe(2);
    }

    unregisterPosition(attackerA.permanentId);
    unregisterPosition(attackerB.permanentId);
    unregisterPosition(blockerA.permanentId);
    unregisterPosition(blockerB.permanentId);
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

  it('intercepts confirm action into learning phase when challenges are enabled', () => {
    usePreferencesStore.setState({
      learningChallengesEnabled: true,
      readingChallengesEnabled: true,
      mathChallengesEnabled: false,
      readingLevel: 'r1',
      learningFrequency: 'high',
      readingChallengeWeight: 10,
      wordChallengeWeight: 0,
      mathChallengeWeight: 0,
    });

    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      isTapped: false,
      summonedThisTurn: false,
    });
    const defender = makePermanent('water_shell_crab', 'player2', {
      attack: 0,
      health: 4,
      isTapped: false,
    });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: { board: [attacker, null, null, null, null, null] },
      player2: { board: [defender, null, null, null, null, null] },
    });

    useGameStore.setState({
      state,
      rng: createRNG(9),
      humanPlayer: 'player1',
      gameId: 'game-learning',
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });

    dispatchWithAnimations({ type: 'CONFIRM_ATTACKERS' }, 'player1');

    const phase = useGameStore.getState().state?.phase;
    expect(phase?.type).toBe('learning');
    const { activeStep, queue } = useAnimationStore.getState();
    expect(activeStep).toBeNull();
    expect(queue).toHaveLength(0);
  });
});

// ─── Card Reveal ───

describe('card reveal for opponent plays', () => {
  beforeEach(() => {
    resetTestCounters();
    useAnimationStore.setState({
      queue: [],
      activeStep: null,
      isAnimating: false,
    });
  });

  it('prepends a card_reveal step when the opponent plays a spell', () => {
    const state = createTestGameState({
      activePlayer: 'player2',
      phase: { type: 'play' },
      player2: {
        currentEnergy: 3,
        maxEnergy: 3,
        hand: [makeCardInstance('fire_fireball')],
      },
      player1: { health: 20 },
    });

    useGameStore.setState({
      state,
      rng: createRNG(42),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });
    registerPosition('player:player1', { x: 100, y: 400, width: 56, height: 56 });

    // Opponent plays a targeted spell — the reducer handles targeting internally
    // For untargeted spells or auto-target, CARD_PLAYED + SPELL_RESOLVED events emit
    dispatchWithAnimations({ type: 'PLAY_CARD', cardIndex: 0 }, 'player2');

    const { activeStep, queue } = useAnimationStore.getState();
    expect(activeStep).not.toBeNull();
    expect(activeStep!.effects[0].type).toBe('card_reveal');
    if (activeStep!.effects[0].type === 'card_reveal') {
      expect(activeStep!.effects[0].cardId).toBe('fire_fireball');
    }
    // The spell's actual effects (if any) come after the reveal
    const allEffects = [...(activeStep?.effects ?? []), ...queue.flatMap((s) => s.effects)];
    const revealCount = allEffects.filter((e) => e.type === 'card_reveal').length;
    expect(revealCount).toBe(1);

    unregisterPosition('player:player1');
  });

  it('prepends a card_reveal step when the opponent plays a creature', () => {
    const state = createTestGameState({
      activePlayer: 'player2',
      phase: { type: 'play' },
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [makeCardInstance('fire_ember_sprite')],
      },
    });

    useGameStore.setState({
      state,
      rng: createRNG(42),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });

    dispatchWithAnimations({ type: 'PLAY_CARD', cardIndex: 0 }, 'player2');

    const { activeStep } = useAnimationStore.getState();
    expect(activeStep).not.toBeNull();
    expect(activeStep!.effects[0].type).toBe('card_reveal');
    if (activeStep!.effects[0].type === 'card_reveal') {
      expect(activeStep!.effects[0].cardId).toBe('fire_ember_sprite');
    }
  });

  it('does NOT add card_reveal when the human player plays a card', () => {
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: { type: 'play' },
      player1: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [makeCardInstance('fire_ember_sprite')],
      },
    });

    useGameStore.setState({
      state,
      rng: createRNG(42),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });

    dispatchWithAnimations({ type: 'PLAY_CARD', cardIndex: 0 }, 'player1');

    const { activeStep, queue } = useAnimationStore.getState();
    const allEffects = [
      ...(activeStep?.effects ?? []),
      ...queue.flatMap((s) => s.effects),
    ];
    expect(allEffects.some((e) => e.type === 'card_reveal')).toBe(false);
  });

  it('does NOT add card_reveal for non-play actions like ADVANCE_PHASE', () => {
    const state = createTestGameState({
      activePlayer: 'player2',
      phase: { type: 'play' },
    });

    useGameStore.setState({
      state,
      rng: createRNG(42),
      humanPlayer: 'player1',
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      legalActions: [],
      events: [],
    });

    dispatchWithAnimations({ type: 'ADVANCE_PHASE' }, 'player2');

    const { activeStep, queue } = useAnimationStore.getState();
    const allEffects = [
      ...(activeStep?.effects ?? []),
      ...queue.flatMap((s) => s.effects),
    ];
    expect(allEffects.some((e) => e.type === 'card_reveal')).toBe(false);
  });
});
