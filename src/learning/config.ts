export type ReadingLevel = 'r0' | 'r1' | 'r2' | 'r3';
export type MathLevel = 'm0' | 'm1' | 'm2' | 'm3';
export type LearningFrequency = 'low' | 'medium' | 'high';

export const LEARNING_FREQUENCY_INTERVAL: Record<LearningFrequency, number> = {
  low: 4,
  medium: 2,
  high: 1,
};

