import { describe, expect, it } from 'vitest';
import { applyLearningOutcome, createDefaultLearningProfile } from './masteryModel';

describe('masteryModel', () => {
  it('promotes level after sustained high accuracy', () => {
    let profile = createDefaultLearningProfile('r1', 'm1', 100);
    let lastReason: string = 'no_change';

    for (let i = 0; i < 5; i += 1) {
      const result = applyLearningOutcome(profile, 'reading', 'correct', 100 + i);
      profile = result.profile;
      lastReason = result.decision.reason;
      if (i < 4) {
        expect(result.decision.reason).toBe('no_change');
      }
    }

    expect(profile.reading.level).toBe('r2');
    expect(lastReason).toBe('mastery_increase');
  });

  it('supports learner after low accuracy', () => {
    let profile = createDefaultLearningProfile('r3', 'm3', 100);

    const sequence: Array<'incorrect' | 'correct'> = ['incorrect', 'incorrect', 'incorrect', 'incorrect', 'correct'];
    let finalReason: string = 'no_change';
    for (let i = 0; i < sequence.length; i += 1) {
      const result = applyLearningOutcome(profile, 'math', sequence[i], 300 + i);
      profile = result.profile;
      finalReason = result.decision.reason;
    }

    expect(profile.math.level).toBe('m2');
    expect(finalReason).toBe('support_needed');
  });

  it('does not shift levels while cooldown is active', () => {
    let profile = createDefaultLearningProfile('r1', 'm1', 100);

    for (let i = 0; i < 6; i += 1) {
      profile = applyLearningOutcome(profile, 'reading', 'correct', 500 + i).profile;
    }

    const levelAfterPromotion = profile.reading.level;
    expect(profile.reading.cooldownRemaining).toBeGreaterThan(0);

    const duringCooldown = applyLearningOutcome(profile, 'reading', 'correct', 700);
    expect(duringCooldown.profile.reading.level).toBe(levelAfterPromotion);
    expect(duringCooldown.decision.reason).toBe('no_change');
  });
});
