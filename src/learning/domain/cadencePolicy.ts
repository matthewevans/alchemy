import { LEARNING_FREQUENCY_INTERVAL } from '../config';
import type { LearningFrequency } from '../config';

export interface CadencePolicyInput {
  opportunityIndex: number;
  learningFrequency: LearningFrequency;
  correctStreak: number;
  incorrectStreak: number;
}

export interface CadencePolicyDecision {
  shouldTrigger: boolean;
  interval: number;
  reason: string;
}

function resolveDynamicInterval(input: CadencePolicyInput): number {
  const base = LEARNING_FREQUENCY_INTERVAL[input.learningFrequency];

  if (input.incorrectStreak >= 2) {
    return Math.max(1, base - 1);
  }

  if (input.correctStreak >= 3) {
    return base + 1;
  }

  return base;
}

export function evaluateLearningCadence(input: CadencePolicyInput): CadencePolicyDecision {
  const interval = resolveDynamicInterval(input);
  const shouldTrigger = input.opportunityIndex % interval === 0;

  if (input.incorrectStreak >= 2) {
    return {
      shouldTrigger,
      interval,
      reason: `Support mode: ${input.incorrectStreak} misses in a row so prompts appear every ${interval} opportunity.`,
    };
  }

  if (input.correctStreak >= 3) {
    return {
      shouldTrigger,
      interval,
      reason: `Flow mode: ${input.correctStreak} correct in a row so prompts are spaced to every ${interval} opportunities.`,
    };
  }

  return {
    shouldTrigger,
    interval,
    reason: `Base cadence for ${input.learningFrequency} frequency is every ${interval} opportunities.`,
  };
}
