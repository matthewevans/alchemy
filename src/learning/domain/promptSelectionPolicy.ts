export type LearningPromptBucket = 'reading' | 'word' | 'math';

export interface PromptSelectionPrefs {
  readingChallengesEnabled: boolean;
  mathChallengesEnabled: boolean;
  readingChallengeWeight: number;
  wordChallengeWeight: number;
  mathChallengeWeight: number;
}

export interface PromptSelectionDecision {
  bucket: LearningPromptBucket | null;
  reason: string;
}

interface PromptChoice {
  bucket: LearningPromptBucket;
  weight: number;
}

function sanitizeWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  return Math.max(0, Math.round(weight));
}

function buildPromptChoices(prefs: PromptSelectionPrefs): PromptChoice[] {
  const choices: PromptChoice[] = [];

  if (prefs.mathChallengesEnabled) {
    choices.push({ bucket: 'math', weight: sanitizeWeight(prefs.mathChallengeWeight) });
  }

  if (prefs.readingChallengesEnabled) {
    choices.push({ bucket: 'reading', weight: sanitizeWeight(prefs.readingChallengeWeight) });
    choices.push({ bucket: 'word', weight: sanitizeWeight(prefs.wordChallengeWeight) });
  }

  return choices.filter((choice) => choice.weight > 0);
}

export function choosePromptBucket(
  prefs: PromptSelectionPrefs,
  selectionSeed: number,
): PromptSelectionDecision {
  const choices = buildPromptChoices(prefs);
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  if (totalWeight <= 0) {
    return { bucket: null, reason: 'All challenge weights are zero.' };
  }

  let roll = selectionSeed % totalWeight;
  for (const choice of choices) {
    roll -= choice.weight;
    if (roll < 0) {
      return {
        bucket: choice.bucket,
        reason: `Weighted pick selected ${choice.bucket} from ${choices.length} active challenge buckets.`,
      };
    }
  }

  const fallback = choices[choices.length - 1];
  return {
    bucket: fallback?.bucket ?? null,
    reason: 'Weighted selection used fallback bucket.',
  };
}
