import type { LearningFrequency, MathLevel, ReadingLevel } from './config';

export type LearningAgeRange =
  | 'age_4_5'
  | 'age_6_7'
  | 'age_8_9'
  | 'age_10_12'
  | 'age_13_plus';

export interface LearningAgeRangeOption {
  value: LearningAgeRange;
  label: string;
  description: string;
}

export interface LearningOnboardingPreset {
  readingLevel: ReadingLevel;
  mathLevel: MathLevel;
  learningFrequency: LearningFrequency;
  readingChallengeWeight: number;
  wordChallengeWeight: number;
  mathChallengeWeight: number;
}

export const LEARNING_AGE_RANGE_OPTIONS: readonly LearningAgeRangeOption[] = [
  {
    value: 'age_4_5',
    label: 'Ages 4-5',
    description: 'Early decoding and within-5 number facts.',
  },
  {
    value: 'age_6_7',
    label: 'Ages 6-7',
    description: 'Digraph/blend reading and within-10 facts.',
  },
  {
    value: 'age_8_9',
    label: 'Ages 8-9',
    description: 'Longer words and early two-digit strategy work.',
  },
  {
    value: 'age_10_12',
    label: 'Ages 10-12',
    description: 'Morphology-heavy reading and multi-digit operations.',
  },
  {
    value: 'age_13_plus',
    label: 'Ages 13+',
    description: 'Advanced vocabulary and higher fluency math.',
  },
];

const LEARNING_ONBOARDING_PRESETS: Record<LearningAgeRange, LearningOnboardingPreset> = {
  age_4_5: {
    readingLevel: 'r0',
    mathLevel: 'm0',
    learningFrequency: 'low',
    readingChallengeWeight: 6,
    wordChallengeWeight: 2,
    mathChallengeWeight: 4,
  },
  age_6_7: {
    readingLevel: 'r1',
    mathLevel: 'm1',
    learningFrequency: 'medium',
    readingChallengeWeight: 5,
    wordChallengeWeight: 3,
    mathChallengeWeight: 5,
  },
  age_8_9: {
    readingLevel: 'r3',
    mathLevel: 'm3',
    learningFrequency: 'medium',
    readingChallengeWeight: 4,
    wordChallengeWeight: 0,
    mathChallengeWeight: 6,
  },
  age_10_12: {
    readingLevel: 'r5',
    mathLevel: 'm5',
    learningFrequency: 'medium',
    readingChallengeWeight: 4,
    wordChallengeWeight: 0,
    mathChallengeWeight: 6,
  },
  age_13_plus: {
    readingLevel: 'r6',
    mathLevel: 'm6',
    learningFrequency: 'low',
    readingChallengeWeight: 3,
    wordChallengeWeight: 0,
    mathChallengeWeight: 6,
  },
};

export function isLearningAgeRange(value: unknown): value is LearningAgeRange {
  return LEARNING_AGE_RANGE_OPTIONS.some((option) => option.value === value);
}

export function getLearningOnboardingPreset(
  ageRange: LearningAgeRange,
): LearningOnboardingPreset {
  return LEARNING_ONBOARDING_PRESETS[ageRange];
}
