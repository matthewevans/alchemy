import { describe, expect, it } from 'vitest';
import { createTestGameState, makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { chooseLearningReward } from './rewardPolicy';

describe('rewardPolicy', () => {
  it('uses base attacker reward at low streak', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1');
    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: { board: [attacker, null, null, null, null, null] },
    });

    const decision = chooseLearningReward({
      state,
      action: { type: 'CONFIRM_ATTACKERS' },
      correctStreak: 0,
    });

    expect(decision.reward?.attackBonus).toBe(1);
    expect(decision.reward?.healthBonus).toBe(0);
  });

  it('upgrades reward to dual stat on streak 2+', () => {
    resetTestCounters();
    const attacker = makePermanent('fire_lava_hound', 'player1');
    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: { board: [attacker, null, null, null, null, null] },
    });

    const decision = chooseLearningReward({
      state,
      action: { type: 'CONFIRM_ATTACKERS' },
      correctStreak: 2,
    });

    expect(decision.reward?.attackBonus).toBe(1);
    expect(decision.reward?.healthBonus).toBe(1);
  });
});
