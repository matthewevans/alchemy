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
   * - CCSS 3.OA.C.7: multiplication/division fluency within 100.
   *   https://www.thecorestandards.org/Math/Content/3/OA/C/7/
   * - CCSS 4.NBT.B.5-6: multi-digit multiplication and division with one-digit divisors.
   *   https://www.thecorestandards.org/Math/Content/4/NBT/B/5/
   *   https://www.thecorestandards.org/Math/Content/4/NBT/B/6/
   * - CCSS 5.NBT.B.5-6: larger whole-number multiplication and division.
   *   https://www.thecorestandards.org/Math/Content/5/NBT/B/5/
   *   https://www.thecorestandards.org/Math/Content/5/NBT/B/6/
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

function multiplication(left: number, right: number): MathPromptBlueprint {
  return {
    kind: 'multiplication',
    promptText: `${left} × ${right} = ?`,
    answer: left * right,
  };
}

function division(dividend: number, divisor: number): MathPromptBlueprint {
  return {
    kind: 'division',
    promptText: `${dividend} ÷ ${divisor} = ?`,
    answer: dividend / divisor,
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
  m4: {
    templates: [
      {
        id: 'multiply-facts-within-100',
        weight: 5,
        build: (random) => {
          const left = randomInRange(random, 2, 10);
          const right = randomInRange(random, 2, Math.min(10, Math.floor(100 / left)));
          return multiplication(left, right);
        },
      },
      {
        id: 'divide-facts-within-100',
        weight: 5,
        build: (random) => {
          const divisor = randomInRange(random, 2, 10);
          const quotient = randomInRange(random, 2, Math.min(10, Math.floor(100 / divisor)));
          return division(divisor * quotient, divisor);
        },
      },
      {
        id: 'missing-factor-within-100',
        weight: 3,
        build: (random) => {
          const known = randomInRange(random, 2, 10);
          const answer = randomInRange(random, 2, Math.min(10, Math.floor(100 / known)));
          return {
            kind: 'multiplication',
            promptText: `${known} × ? = ${known * answer}`,
            answer,
          };
        },
      },
      {
        id: 'missing-divisor-within-100',
        weight: 2,
        build: (random) => {
          const answer = randomInRange(random, 2, 10);
          const quotient = randomInRange(random, 2, Math.min(10, Math.floor(100 / answer)));
          return {
            kind: 'division',
            promptText: `${answer * quotient} ÷ ? = ${quotient}`,
            answer,
          };
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 100,
    distractorDeltas: [-12, -10, -8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 10, 12],
  },
  m5: {
    templates: [
      {
        id: 'multiply-two-digit-by-one-digit',
        weight: 5,
        build: (random) => {
          const right = randomInRange(random, 2, 6);
          const left = randomInRange(random, 12, Math.floor(200 / right));
          return multiplication(left, right);
        },
      },
      {
        id: 'divide-by-one-digit-two-digit-quotient',
        weight: 5,
        build: (random) => {
          const divisor = randomInRange(random, 2, 9);
          const quotient = randomInRange(random, 10, Math.floor(200 / divisor));
          return division(divisor * quotient, divisor);
        },
      },
      {
        id: 'missing-factor-two-digit-by-one-digit',
        weight: 3,
        build: (random) => {
          const factor = randomInRange(random, 2, 9);
          const answer = randomInRange(random, 10, Math.floor(200 / factor));
          return {
            kind: 'multiplication',
            promptText: `? × ${factor} = ${answer * factor}`,
            answer,
          };
        },
      },
      {
        id: 'missing-divisor-two-digit-quotient',
        weight: 2,
        build: (random) => {
          const answer = randomInRange(random, 2, 9);
          const quotient = randomInRange(random, 10, Math.floor(200 / answer));
          return {
            kind: 'division',
            promptText: `${answer * quotient} ÷ ? = ${quotient}`,
            answer,
          };
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 200,
    distractorDeltas: [-20, -15, -12, -10, -8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 10, 12, 15, 20],
  },
  m6: {
    templates: [
      {
        id: 'multiply-two-digit-by-two-digit',
        weight: 5,
        build: (random) => {
          const left = randomInRange(random, 12, 49);
          const right = randomInRange(random, 11, 29);
          return multiplication(left, right);
        },
      },
      {
        id: 'divide-four-digit-by-two-digit-exact',
        weight: 5,
        build: (random) => {
          const divisor = randomInRange(random, 11, 29);
          const quotient = randomInRange(random, 6, 49);
          return division(divisor * quotient, divisor);
        },
      },
      {
        id: 'missing-factor-two-digit-pair',
        weight: 3,
        build: (random) => {
          const factor = randomInRange(random, 12, 29);
          const answer = randomInRange(random, 6, 49);
          return {
            kind: 'multiplication',
            promptText: `? × ${factor} = ${answer * factor}`,
            answer,
          };
        },
      },
      {
        id: 'missing-divisor-two-digit-pair',
        weight: 2,
        build: (random) => {
          const answer = randomInRange(random, 11, 29);
          const quotient = randomInRange(random, 6, 49);
          return {
            kind: 'division',
            promptText: `${answer * quotient} ÷ ? = ${quotient}`,
            answer,
          };
        },
      },
    ],
    minAnswer: 0,
    maxAnswer: 2000,
    distractorDeltas: [-120, -100, -80, -60, -40, -30, -20, -12, -10, -8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 10, 12, 20, 30, 40, 60, 80, 100, 120],
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
