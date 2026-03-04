import { describe, expect, it } from 'vitest';
import { createRNG } from '../prng';
import { reduce } from '../reducer';
import { enumerateLegalActions, validateAction } from '../validation';
import { createTestGameState, makePermanent, resetTestCounters } from './__fixtures__/testHelpers';

describe('learning challenge flow', () => {
  it('starts a learning phase and exposes answer actions', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1', { attack: 2, health: 3 });
    const defender = makePermanent('water_shell_crab', 'player2', { attack: 0, health: 4 });
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

    const startAction = {
      type: 'START_LEARNING_CHALLENGE' as const,
      prompt: {
        id: 'prompt-1',
        domain: 'reading' as const,
        kind: 'missing_letter' as const,
        prompt: 'Pick the missing letter: c_t',
        options: [
          { id: 'a', text: 'A' },
          { id: 'o', text: 'O' },
          { id: 'u', text: 'U' },
        ],
        correctOptionId: 'a',
      },
      reward: { permanentId: attacker.permanentId, attackBonus: 1, healthBonus: 0 },
      resumeAction: { type: 'CONFIRM_ATTACKERS' as const },
    };

    const { newState, events } = reduce(state, startAction, 'player1', createRNG(1));
    expect(newState.phase.type).toBe('learning');
    if (newState.phase.type !== 'learning') return;

    expect(newState.phase.resumeAction).toEqual({ type: 'CONFIRM_ATTACKERS' });
    expect(newState.phase.suspendedPhase).toEqual(state.phase);
    expect(events).toContainEqual({
      type: 'LEARNING_CHALLENGE_STARTED',
      player: 'player1',
      promptId: 'prompt-1',
    });

    const legal = enumerateLegalActions(newState, 'player1');
    const answerActions = legal.filter((a) => a.type === 'ANSWER_LEARNING_CHALLENGE');
    expect(answerActions).toHaveLength(3);
    expect(legal.some((a) => a.type === 'SKIP_LEARNING_CHALLENGE')).toBe(true);
  });

  it('applies reward on correct answer and resumes pending action', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1', { attack: 2, health: 3 });
    const defender = makePermanent('water_shell_crab', 'player2', { attack: 0, health: 4 });
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
    const rng = createRNG(2);

    const started = reduce(state, {
      type: 'START_LEARNING_CHALLENGE',
      prompt: {
        id: 'prompt-2',
        domain: 'math',
        kind: 'addition',
        prompt: '2 + 3 = ?',
        options: [
          { id: '5', text: '5' },
          { id: '4', text: '4' },
          { id: '6', text: '6' },
        ],
        correctOptionId: '5',
      },
      reward: { permanentId: attacker.permanentId, attackBonus: 1, healthBonus: 0 },
      resumeAction: { type: 'CONFIRM_ATTACKERS' },
    }, 'player1', rng);

    const answered = reduce(
      started.newState,
      { type: 'ANSWER_LEARNING_CHALLENGE', optionId: '5' },
      'player1',
      rng,
    );

    expect(answered.newState.phase.type).toBe('battle');
    if (answered.newState.phase.type !== 'battle') return;
    expect(answered.newState.phase.step).toBe('declare_blockers');

    const buffedAttacker = answered.newState.players.player1.board[0];
    expect(buffedAttacker).toBeTruthy();
    expect(buffedAttacker?.temporaryAttackBonus).toBe(1);
    expect(buffedAttacker?.isTapped).toBe(true);
    expect(answered.events).toContainEqual({
      type: 'LEARNING_CHALLENGE_RESOLVED',
      player: 'player1',
      promptId: 'prompt-2',
      correct: true,
      rewardApplied: true,
    });
    expect(answered.events.some((event) => event.type === 'ATTACKERS_DECLARED')).toBe(true);
  });

  it('skips reward on challenge skip and still resumes pending action', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1', { attack: 2, health: 3 });
    const defender = makePermanent('water_shell_crab', 'player2', { attack: 0, health: 4 });
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
    const rng = createRNG(3);

    const started = reduce(state, {
      type: 'START_LEARNING_CHALLENGE',
      prompt: {
        id: 'prompt-3',
        domain: 'reading',
        kind: 'missing_letter',
        prompt: 'Pick the missing letter: d_g',
        options: [
          { id: 'o', text: 'O' },
          { id: 'a', text: 'A' },
          { id: 'u', text: 'U' },
        ],
        correctOptionId: 'o',
      },
      reward: { permanentId: attacker.permanentId, attackBonus: 1, healthBonus: 0 },
      resumeAction: { type: 'CONFIRM_ATTACKERS' },
    }, 'player1', rng);

    const skipped = reduce(
      started.newState,
      { type: 'SKIP_LEARNING_CHALLENGE' },
      'player1',
      rng,
    );

    expect(skipped.newState.phase.type).toBe('battle');
    const unchangedAttacker = skipped.newState.players.player1.board[0];
    expect(unchangedAttacker?.temporaryAttackBonus).toBe(0);
    expect(skipped.events).toContainEqual({
      type: 'LEARNING_CHALLENGE_RESOLVED',
      player: 'player1',
      promptId: 'prompt-3',
      correct: false,
      rewardApplied: false,
    });
  });

  it('rejects learning challenge start when reward target is not owned by acting player', () => {
    resetTestCounters();
    const enemy = makePermanent('water_shell_crab', 'player2', { attack: 0, health: 4 });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: { type: 'play' },
      player2: { board: [enemy, null, null, null, null, null] },
    });

    const result = validateAction(
      state,
      {
        type: 'START_LEARNING_CHALLENGE',
        prompt: {
          id: 'prompt-4',
          domain: 'math',
          kind: 'addition',
          prompt: '1 + 1 = ?',
          options: [
            { id: '2', text: '2' },
            { id: '3', text: '3' },
          ],
          correctOptionId: '2',
        },
        reward: { permanentId: enemy.permanentId, attackBonus: 1, healthBonus: 0 },
        resumeAction: { type: 'ADVANCE_PHASE' },
      },
      'player1',
    );

    expect(result.valid).toBe(false);
  });
});

