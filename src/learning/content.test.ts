import { describe, expect, it } from 'vitest';
import { buildMathPrompt, buildReadingPrompt } from './content';
import { READING_CURRICULUM } from './readingCurriculum';

describe('learning content', () => {
  it('builds deterministic reading prompts for the same seed', () => {
    const first = buildReadingPrompt('r1', 4242);
    const second = buildReadingPrompt('r1', 4242);
    expect(first).toEqual(second);
  });

  it('builds deterministic math prompts for the same seed', () => {
    const first = buildMathPrompt('m2', 9911);
    const second = buildMathPrompt('m2', 9911);
    expect(first).toEqual(second);
  });

  it('emits both missing-letter and word-to-picture reading prompts over a seed range', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 120; seed += 1) {
      const prompt = buildReadingPrompt('r2', seed);
      kinds.add(prompt.kind);
      if (prompt.kind === 'word_to_picture') {
        expect(prompt.options.every((option) => typeof option.imageId === 'string')).toBe(true);
      }
    }

    expect(kinds.has('missing_letter')).toBe(true);
    expect(kinds.has('word_to_picture')).toBe(true);
  });

  it('keeps math answers in options for each level', () => {
    for (const level of ['m0', 'm1', 'm2', 'm3'] as const) {
      for (let seed = 1; seed <= 80; seed += 1) {
        const prompt = buildMathPrompt(level, seed * 17);
        expect(prompt.options.length).toBe(4);
        expect(prompt.options.some((option) => option.id === prompt.correctOptionId)).toBe(true);
      }
    }
  });

  it('builds missing-letter prompts with unique completions', () => {
    for (const level of ['r0', 'r1', 'r2', 'r3'] as const) {
      const bank = [...new Set(READING_CURRICULUM[level].missingLetterWords.map((word) => word.toLowerCase()))];

      for (let seed = 1; seed <= 240; seed += 1) {
        const prompt = buildReadingPrompt(level, seed * 31);
        if (prompt.kind !== 'missing_letter') continue;

        const maskedWord = prompt.prompt.replace('Pick the missing letter: ', '').toLowerCase();
        const missingIndex = maskedWord.indexOf('_');
        expect(missingIndex).toBeGreaterThanOrEqual(0);

        const prefix = maskedWord.slice(0, missingIndex);
        const suffix = maskedWord.slice(missingIndex + 1);
        const completionCount = bank.filter((candidate) =>
          candidate.length === maskedWord.length
          && candidate.startsWith(prefix)
          && candidate.endsWith(suffix)).length;

        expect(completionCount).toBe(1);
      }
    }
  });
});
