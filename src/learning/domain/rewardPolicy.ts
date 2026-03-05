import type { GameAction, GameState, LearningReward } from '@engine/types';

type LearningGateAction =
  | Extract<GameAction, { type: 'CONFIRM_ATTACKERS' }>
  | Extract<GameAction, { type: 'CONFIRM_BLOCKERS' }>;

export interface RewardPolicyInput {
  state: GameState;
  action: LearningGateAction;
  correctStreak: number;
}

export interface RewardPolicyDecision {
  reward: LearningReward | null;
  reason: string;
}

function resolveRewardShape(
  correctStreak: number,
  context: 'attack' | 'block',
): { attackBonus: number; healthBonus: number; reason: string } {
  if (correctStreak >= 2) {
    return {
      attackBonus: 1,
      healthBonus: 1,
      reason: `Reward upgrade: ${correctStreak} correct answers in a row grants +1/+1.`,
    };
  }

  if (context === 'attack') {
    return {
      attackBonus: 1,
      healthBonus: 0,
      reason: 'Base reward: +1 ATK for your leading attacker.',
    };
  }

  return {
    attackBonus: 0,
    healthBonus: 1,
    reason: 'Base reward: +1 HP for your leading blocker.',
  };
}

export function chooseLearningReward(input: RewardPolicyInput): RewardPolicyDecision {
  if (input.action.type === 'CONFIRM_ATTACKERS') {
    const bonus = resolveRewardShape(input.correctStreak, 'attack');
    if (input.state.phase.type !== 'battle' || input.state.phase.step !== 'declare_attackers') {
      return { reward: null, reason: 'No valid attacker reward target for current phase.' };
    }

    const targetId = input.state.phase.tentativeAttackers[0];
    if (!targetId) {
      return { reward: null, reason: 'No attacker selected for reward target.' };
    }

    return {
      reward: {
        permanentId: targetId,
        attackBonus: bonus.attackBonus,
        healthBonus: bonus.healthBonus,
      },
      reason: bonus.reason,
    };
  }

  if (input.state.phase.type !== 'battle' || input.state.phase.step !== 'declare_blockers') {
    return { reward: null, reason: 'No valid blocker reward target for current phase.' };
  }
  const bonus = resolveRewardShape(input.correctStreak, 'block');

  const targetId = Object.keys(input.state.phase.tentativeBlockers)[0];
  if (!targetId) {
    return { reward: null, reason: 'No blocker assigned for reward target.' };
  }

  return {
    reward: {
      permanentId: targetId,
      attackBonus: bonus.attackBonus,
      healthBonus: bonus.healthBonus,
    },
    reason: bonus.reason,
  };
}
