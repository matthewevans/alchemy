import { describe, expect, it } from 'vitest';
import {
  LEARNING_AGE_RANGE_OPTIONS,
  getLearningOnboardingPreset,
  isLearningAgeRange,
} from './onboarding';

describe('learning onboarding presets', () => {
  it('resolves a preset for every supported age range', () => {
    for (const option of LEARNING_AGE_RANGE_OPTIONS) {
      const preset = getLearningOnboardingPreset(option.value);
      expect(preset.readingLevel).toMatch(/^r[0-6]$/);
      expect(preset.mathLevel).toMatch(/^m[0-6]$/);
      expect(['low', 'medium', 'high']).toContain(preset.learningFrequency);
      expect(preset.readingChallengeWeight).toBeGreaterThanOrEqual(0);
      expect(preset.wordChallengeWeight).toBeGreaterThanOrEqual(0);
      expect(preset.mathChallengeWeight).toBeGreaterThanOrEqual(0);
    }
  });

  it('validates age range values', () => {
    for (const option of LEARNING_AGE_RANGE_OPTIONS) {
      expect(isLearningAgeRange(option.value)).toBe(true);
    }

    expect(isLearningAgeRange('age_99_100')).toBe(false);
    expect(isLearningAgeRange('')).toBe(false);
    expect(isLearningAgeRange(undefined)).toBe(false);
    expect(isLearningAgeRange(null)).toBe(false);
  });

  it('disables word matching for brackets above ages 6-7', () => {
    expect(getLearningOnboardingPreset('age_4_5').wordChallengeWeight).toBeGreaterThan(0);
    expect(getLearningOnboardingPreset('age_6_7').wordChallengeWeight).toBeGreaterThan(0);
    expect(getLearningOnboardingPreset('age_8_9').wordChallengeWeight).toBe(0);
    expect(getLearningOnboardingPreset('age_10_12').wordChallengeWeight).toBe(0);
    expect(getLearningOnboardingPreset('age_13_plus').wordChallengeWeight).toBe(0);
  });
});
