import { describe, expect, it } from 'vitest';
import { evaluateLearningCadence } from './cadencePolicy';

describe('cadencePolicy', () => {
  it('uses base interval when no streak modifiers apply', () => {
    const decision = evaluateLearningCadence({
      opportunityIndex: 4,
      learningFrequency: 'low',
      correctStreak: 0,
      incorrectStreak: 0,
    });

    expect(decision.interval).toBe(4);
    expect(decision.shouldTrigger).toBe(true);
  });

  it('tightens cadence during incorrect streaks', () => {
    const decision = evaluateLearningCadence({
      opportunityIndex: 1,
      learningFrequency: 'medium',
      correctStreak: 0,
      incorrectStreak: 2,
    });

    expect(decision.interval).toBe(1);
    expect(decision.shouldTrigger).toBe(true);
  });

  it('widens cadence during long correct streaks', () => {
    const decision = evaluateLearningCadence({
      opportunityIndex: 2,
      learningFrequency: 'medium',
      correctStreak: 3,
      incorrectStreak: 0,
    });

    expect(decision.interval).toBe(3);
    expect(decision.shouldTrigger).toBe(false);
  });
});
