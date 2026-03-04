import type { LearningPromptKind } from '@engine/types';
import type { MathLevel } from './config';
import type { LearningRandom } from './random';

export interface MathPromptBlueprint {
  kind: LearningPromptKind;
  promptText: string;
  answer: number;
}

interface MathTemplate {
  id: string;
  weight: number;
  build: (random: LearningRandom) => MathPromptBlueprint;
}

interface MathLevelCurriculum {
  /**
   * Evidence-aligned progression:
   * - CCSS K.OA.A.5: add/subtract within 5.
   *   https://www.thecorestandards.org/Math/Content/K/OA/
   * - CCSS 1.OA.C.6: add/subtract within 10, use relationship strategies.
   *   https://www.thecorestandards.org/Math/Content/1/OA/C/6/
   * - CCSS 2.OA.B.2: fluency with add/subtract within 20.
   *   https://www.thecorestandards.org/Math/Content/2/OA/B/2/
   * - Grade 2-3 bridge: two-digit + one-digit and subtraction decomposition.
   */
  templates: readonly MathTemplate[];
  minAnswer: number;
  maxAnswer: number;
  distractorDeltas: readonly number[];
}

function addition(left: number, right: number): MathPromptBlueprint {
  return {
    kind: 'addition',
    promptText: `${left} + ${right} = ?`,
    answer: left + right,
  };
}

function subtraction(left: number, right: number): MathPromptBlueprint {
  return {
    kind: 'subtraction',
    promptText: `${left} - ${right} = ?`,
    answer: left - right,
  };
}

function randomInRange(random: LearningRandom, min: number, max: number): number {
  return min + random.int(max - min + 1);
}

const CURRICULUM: Record<MathLevel, MathLevelCurriculum> = {
  m0: {
    templates: [
      {
        id: 'add-within-5',
        weight: 5,
        build: (random) => {
          const left = randomInRange(random, 0, 5);
          const right = randomInRange(random, 0, 5 - left);
          return addition(left, right);
        },
      },
      {
        id: 'plus-one',
        weight: 3,
        build: (random) => {
          const left = randomInRange(random, 0, 4);
          return addition(left, 1);
        },
      },
      {
        id: 'minus-one',
        weight: 2,
        build: (random) => {
          const left = randomInRange(random, 1, 5);
          return subtraction(left, 1);
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 5,
    distractorDeltas: [-2, -1, 1, 2],
  },
  m1: {
    templates: [
      {
        id: 'add-within-10',
        weight: 5,
        build: (random) => {
          const left = randomInRange(random, 0, 10);
          const right = randomInRange(random, 0, 10 - left);
          return addition(left, right);
        },
      },
      {
        id: 'subtract-within-10',
        weight: 4,
        build: (random) => {
          const left = randomInRange(random, 2, 10);
          const right = randomInRange(random, 0, left);
          return subtraction(left, right);
        },
      },
      {
        id: 'make-ten-missing-addend',
        weight: 3,
        build: (random) => {
          const shown = randomInRange(random, 1, 9);
          const answer = 10 - shown;
          return {
            kind: 'addition',
            promptText: `? + ${shown} = 10`,
            answer,
          };
        },
      },
      {
        id: 'doubles',
        weight: 2,
        build: (random) => {
          const n = randomInRange(random, 1, 5);
          return addition(n, n);
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 10,
    distractorDeltas: [-3, -2, -1, 1, 2, 3],
  },
  m2: {
    templates: [
      {
        id: 'add-within-20',
        weight: 4,
        build: (random) => {
          const left = randomInRange(random, 0, 20);
          const right = randomInRange(random, 0, 20 - left);
          return addition(left, right);
        },
      },
      {
        id: 'subtract-within-20',
        weight: 4,
        build: (random) => {
          const left = randomInRange(random, 5, 20);
          const right = randomInRange(random, 0, left);
          return subtraction(left, right);
        },
      },
      {
        id: 'bridge-ten',
        weight: 3,
        build: (random) => {
          const left = randomInRange(random, 7, 9);
          const right = randomInRange(random, 5, 9);
          return addition(left, right);
        },
      },
      {
        id: 'missing-addend-within-20',
        weight: 2,
        build: (random) => {
          const total = randomInRange(random, 11, 20);
          const shown = randomInRange(random, 1, total - 1);
          return {
            kind: 'addition',
            promptText: `${shown} + ? = ${total}`,
            answer: total - shown,
          };
        },
      },
      {
        id: 'near-doubles',
        weight: 2,
        build: (random) => {
          const n = randomInRange(random, 3, 9);
          const tweak = random.chance(0.5) ? 1 : -1;
          return addition(n, n + tweak);
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 20,
    distractorDeltas: [-4, -3, -2, -1, 1, 2, 3, 4],
  },
  m3: {
    templates: [
      {
        id: 'add-two-digit-plus-one-digit',
        weight: 4,
        build: (random) => {
          const left = randomInRange(random, 10, 49);
          const right = randomInRange(random, 1, 9);
          return addition(left, right);
        },
      },
      {
        id: 'subtract-two-digit-minus-one-digit',
        weight: 4,
        build: (random) => {
          const left = randomInRange(random, 12, 50);
          const right = randomInRange(random, 1, 9);
          return subtraction(left, right);
        },
      },
      {
        id: 'add-near-tens',
        weight: 3,
        build: (random) => {
          const base = random.pick([10, 20, 30, 40]);
          const left = base + randomInRange(random, 6, 9);
          const right = randomInRange(random, 2, 9);
          return addition(left, right);
        },
      },
      {
        id: 'subtract-across-ten',
        weight: 3,
        build: (random) => {
          const tens = random.pick([20, 30, 40, 50]);
          const left = tens + randomInRange(random, 0, 4);
          const right = randomInRange(random, 6, 9);
          return subtraction(left, right);
        },
      },
      {
        id: 'missing-addend-two-digit',
        weight: 2,
        build: (random) => {
          const total = randomInRange(random, 20, 50);
          const shown = randomInRange(random, 5, total - 5);
          return {
            kind: 'addition',
            promptText: `${shown} + ? = ${total}`,
            answer: total - shown,
          };
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 50,
    distractorDeltas: [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6],
  },
};

function chooseTemplate(level: MathLevel, random: LearningRandom): MathTemplate {
  const templates = CURRICULUM[level].templates;
  const totalWeight = templates.reduce((sum, template) => sum + template.weight, 0);
  let roll = random.int(totalWeight);
  for (const template of templates) {
    roll -= template.weight;
    if (roll < 0) return template;
  }
  return templates[templates.length - 1];
}

export function buildMathBlueprint(level: MathLevel, random: LearningRandom): MathPromptBlueprint {
  return chooseTemplate(level, random).build(random);
}

export function getMathLevelBounds(level: MathLevel): { min: number; max: number } {
  const config = CURRICULUM[level];
  return { min: config.minAnswer, max: config.maxAnswer };
}

export function getMathDistractorDeltas(level: MathLevel): readonly number[] {
  return CURRICULUM[level].distractorDeltas;
}
