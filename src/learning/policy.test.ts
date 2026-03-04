import { describe, expect, it } from 'vitest';
import { createTestGameState, makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { maybeBuildLearningChallengeAction } from './policy';

describe('learning policy', () => {
  it('builds deterministic prompt payloads from state + opportunity', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1', { summonedThisTurn: false });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: { board: [attacker, null, null, null, null, null] },
    });

    const input = {
      state,
      action: { type: 'CONFIRM_ATTACKERS' as const },
      actingPlayer: 'player1' as const,
      humanPlayer: 'player1' as const,
      prefs: {
        learningChallengesEnabled: true,
        readingChallengesEnabled: true,
        mathChallengesEnabled: false,
        readingLevel: 'r1' as const,
        mathLevel: 'm1' as const,
        learningFrequency: 'high' as const,
      },
    };

    const first = maybeBuildLearningChallengeAction({ ...input, opportunityIndex: 3 });
    const second = maybeBuildLearningChallengeAction({ ...input, opportunityIndex: 3 });

    expect(first).toEqual(second);
    expect(first?.reward.permanentId).toBe(attacker.permanentId);
  });

  it('alternates reading/math by triggered challenge count at medium frequency', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1', { summonedThisTurn: false });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: { board: [attacker, null, null, null, null, null] },
    });

    const baseInput = {
      state,
      action: { type: 'CONFIRM_ATTACKERS' as const },
      actingPlayer: 'player1' as const,
      humanPlayer: 'player1' as const,
      prefs: {
        learningChallengesEnabled: true,
        readingChallengesEnabled: true,
        mathChallengesEnabled: true,
        readingLevel: 'r1' as const,
        mathLevel: 'm1' as const,
        learningFrequency: 'medium' as const,
      },
    };

    const firstTriggered = maybeBuildLearningChallengeAction({
      ...baseInput,
      opportunityIndex: 2,
    });
    const secondTriggered = maybeBuildLearningChallengeAction({
      ...baseInput,
      opportunityIndex: 4,
    });

    expect(firstTriggered?.prompt.domain).toBe('reading');
    expect(secondTriggered?.prompt.domain).toBe('math');
  });
});
