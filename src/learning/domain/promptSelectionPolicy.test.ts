import { describe, expect, it } from 'vitest';
import { choosePromptBucket } from './promptSelectionPolicy';

describe('promptSelectionPolicy', () => {
  it('returns null when all buckets are disabled', () => {
    const decision = choosePromptBucket({
      readingChallengesEnabled: false,
      mathChallengesEnabled: false,
      readingChallengeWeight: 0,
      wordChallengeWeight: 0,
      mathChallengeWeight: 0,
    }, 123);

    expect(decision.bucket).toBeNull();
  });

  it('chooses weighted bucket deterministically for same seed', () => {
    const prefs = {
      readingChallengesEnabled: true,
      mathChallengesEnabled: true,
      readingChallengeWeight: 0,
      wordChallengeWeight: 10,
      mathChallengeWeight: 0,
    };

    const first = choosePromptBucket(prefs, 42);
    const second = choosePromptBucket(prefs, 42);

    expect(first.bucket).toBe('word');
    expect(first).toEqual(second);
  });
});
