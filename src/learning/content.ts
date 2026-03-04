import type { LearningDomain, LearningPrompt, LearningPromptOption } from '@engine/types';
import type { MathLevel, ReadingLevel } from './config';
import {
  buildMathBlueprint,
  getMathDistractorDeltas,
  getMathLevelBounds,
} from './mathCurriculum';
import { READING_CURRICULUM } from './readingCurriculum';
import { createLearningRandom, hashStringToSeed, type LearningRandom } from './random';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const BASE = import.meta.env.BASE_URL;

const LOOKALIKE_LETTERS: Record<string, readonly string[]> = {
  b: ['d', 'p', 'h', 'r'],
  d: ['b', 'p', 'q', 't'],
  p: ['b', 'd', 'q', 'f'],
  q: ['g', 'd', 'p', 'o'],
  m: ['n', 'w', 'h', 'r'],
  n: ['m', 'h', 'r', 'u'],
  f: ['v', 't', 'p', 's'],
  v: ['f', 'w', 'y', 'u'],
  c: ['k', 'g', 'o', 's'],
  g: ['c', 'q', 'j', 'o'],
};

function makePromptId(domain: LearningDomain, random: LearningRandom): string {
  return `${domain}:${random.int(0x100000).toString(36)}:${random.int(0x100000).toString(36)}`;
}

function getRandom(seed: number | undefined, domain: LearningDomain): LearningRandom {
  const resolvedSeed = seed ?? hashStringToSeed(
    `${domain}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`,
  );
  return createLearningRandom(resolvedSeed);
}

function uniqueWords(words: readonly string[]): string[] {
  return [...new Set(words.map((word) => word.toLowerCase()))];
}

function chooseMissingLetterIndex(word: string, random: LearningRandom): number {
  if (word.length <= 3) return 1;
  if (word.length <= 5) return random.int(word.length - 2) + 1;
  // Prefer middle letters for longer words to reduce first/last-letter guessing.
  return random.int(word.length - 4) + 2;
}

function getMissingLetterCandidates(word: string): number[] {
  if (word.length <= 3) return [1];
  if (word.length <= 5) {
    return Array.from({ length: word.length - 2 }, (_, i) => i + 1);
  }
  return Array.from({ length: word.length - 4 }, (_, i) => i + 2);
}

function isUniqueMaskedCompletion(
  word: string,
  missingIndex: number,
  bank: readonly string[],
): boolean {
  const prefix = word.slice(0, missingIndex);
  const suffix = word.slice(missingIndex + 1);
  const correctLetter = word[missingIndex];

  for (const candidate of bank) {
    if (candidate === word || candidate.length !== word.length) continue;
    if (!candidate.startsWith(prefix)) continue;
    if (!candidate.endsWith(suffix)) continue;
    if (candidate[missingIndex] !== correctLetter) {
      return false;
    }
  }
  return true;
}

function chooseUniqueWordAndIndex(
  bank: readonly string[],
  random: LearningRandom,
): { word: string; index: number } | null {
  for (const word of random.shuffle(bank)) {
    const indices = random.shuffle(getMissingLetterCandidates(word));
    for (const index of indices) {
      if (isUniqueMaskedCompletion(word, index, bank)) {
        return { word, index };
      }
    }
  }
  return null;
}

function getLetterDistractors(correctLetter: string, random: LearningRandom): string[] {
  const lower = correctLetter.toLowerCase();
  const choices = new Set<string>([lower]);

  if (VOWELS.has(lower)) {
    for (const vowel of random.shuffle([...VOWELS])) {
      if (vowel !== lower && choices.size < 4) choices.add(vowel);
    }
  } else if (LOOKALIKE_LETTERS[lower]) {
    for (const letter of random.shuffle(LOOKALIKE_LETTERS[lower])) {
      if (choices.size < 4) choices.add(letter);
    }
  }

  while (choices.size < 4) {
    choices.add(random.pick(ALPHABET));
  }

  return random.shuffle([...choices]);
}

function buildMissingLetterPrompt(level: ReadingLevel, random: LearningRandom): LearningPrompt {
  const bank = uniqueWords(READING_CURRICULUM[level].missingLetterWords);
  const chosen = chooseUniqueWordAndIndex(bank, random);
  const word = chosen?.word ?? random.pick(bank);
  const missingIndex = chosen?.index ?? chooseMissingLetterIndex(word, random);
  const correctLetter = word[missingIndex];
  const masked = `${word.slice(0, missingIndex)}_${word.slice(missingIndex + 1)}`;
  const choices = getLetterDistractors(correctLetter, random);

  return {
    id: makePromptId('reading', random),
    domain: 'reading',
    kind: 'missing_letter',
    prompt: `Pick the missing letter: ${masked}`,
    options: choices.map((letter) => ({ id: `letter:${letter}`, text: letter.toUpperCase() })),
    correctOptionId: `letter:${correctLetter}`,
  };
}

function toAssetUrl(path: string): string {
  if (path.startsWith('/')) return `${BASE}${path.slice(1)}`;
  return `${BASE}${path}`;
}

function buildWordToPicturePrompt(level: ReadingLevel, random: LearningRandom): LearningPrompt {
  const vocab = READING_CURRICULUM[level].wordPictureVocab;
  const target = random.pick(vocab);
  const distractors = random
    .shuffle(vocab.filter((item) => item.word !== target.word))
    .slice(0, 3);
  const options = random.shuffle([target, ...distractors]);

  const promptOptions: LearningPromptOption[] = options.map((item, index) => ({
    id: `picture:${item.word}`,
    text: `Picture ${index + 1}`,
    imageId: toAssetUrl(item.imagePath),
  }));

  return {
    id: makePromptId('reading', random),
    domain: 'reading',
    kind: 'word_to_picture',
    prompt: `Pick the picture for: ${target.word}`,
    options: promptOptions,
    correctOptionId: `picture:${target.word}`,
  };
}

function buildMathOptions(
  level: MathLevel,
  answer: number,
  random: LearningRandom,
): number[] {
  const { min, max } = getMathLevelBounds(level);
  const deltas = random.shuffle([...getMathDistractorDeltas(level)]);
  const choices = new Set<number>([answer]);

  for (const delta of deltas) {
    if (choices.size >= 4) break;
    const candidate = answer + delta;
    if (candidate >= min && candidate <= max && candidate !== answer) {
      choices.add(candidate);
    }
  }

  while (choices.size < 4) {
    const candidate = answer + random.int(9) - 4;
    if (candidate >= min && candidate <= max && candidate !== answer) {
      choices.add(candidate);
    }
  }

  return random.shuffle([...choices]);
}

export function buildReadingPrompt(
  level: ReadingLevel,
  seed?: number,
): LearningPrompt {
  const random = getRandom(seed, 'reading');
  const shouldUsePictures = random.chance(READING_CURRICULUM[level].wordToPictureChance);
  if (shouldUsePictures) {
    return buildWordToPicturePrompt(level, random);
  }
  return buildMissingLetterPrompt(level, random);
}

export function buildMathPrompt(
  level: MathLevel,
  seed?: number,
): LearningPrompt {
  const random = getRandom(seed, 'math');
  const blueprint = buildMathBlueprint(level, random);
  const choices = buildMathOptions(level, blueprint.answer, random);

  return {
    id: makePromptId('math', random),
    domain: 'math',
    kind: blueprint.kind,
    prompt: blueprint.promptText,
    options: choices.map((value) => ({ id: `math:${value}`, text: String(value) })),
    correctOptionId: `math:${blueprint.answer}`,
  };
}
