import {
  MATH_LEVELS,
  READING_LEVELS,
  type MathLevel,
  type ReadingLevel,
} from '../config';

export type LearningOutcome = 'correct' | 'incorrect' | 'skipped';

export interface DomainMasteryState<L extends string> {
  level: L;
  recentOutcomes: LearningOutcome[];
  answeredCount: number;
  cooldownRemaining: number;
}

export interface LearningProfile {
  version: 1;
  reading: DomainMasteryState<ReadingLevel>;
  math: DomainMasteryState<MathLevel>;
  updatedAt: number;
}

export interface AdaptationDecision {
  domain: 'reading' | 'math';
  previousLevel: string;
  nextLevel: string;
  reason: 'mastery_increase' | 'support_needed' | 'no_change';
  evidence: string;
}

export interface MasteryUpdateResult {
  profile: LearningProfile;
  decision: AdaptationDecision;
}

// Evidence anchors:
// - Retrieval practice + feedback: Roediger & Karpicke (2006), Butler & Roediger (2008)
// - Spacing/cadence principles: Cepeda et al. (2006)
// - Curriculum progression: CCSS + WWC references in docs/learning-mechanics-research-reference.md
export const ADAPTIVE_WINDOW_SIZE = 8;
export const ADAPTIVE_MIN_ANSWERED = 5;
export const ADAPTIVE_PROMOTION_ACCURACY = 0.85;
export const ADAPTIVE_SUPPORT_ACCURACY = 0.45;
export const ADAPTIVE_COOLDOWN_STEPS = 3;

function clampOutcomes(outcomes: LearningOutcome[]): LearningOutcome[] {
  if (outcomes.length <= ADAPTIVE_WINDOW_SIZE) return outcomes;
  return outcomes.slice(outcomes.length - ADAPTIVE_WINDOW_SIZE);
}

function getAccuracy(outcomes: LearningOutcome[]): { accuracy: number; answered: number; correct: number } {
  const answeredOutcomes = outcomes.filter((outcome) => outcome !== 'skipped');
  const answered = answeredOutcomes.length;
  if (answered === 0) return { accuracy: 0, answered: 0, correct: 0 };
  const correct = answeredOutcomes.filter((outcome) => outcome === 'correct').length;
  return { accuracy: correct / answered, answered, correct };
}

function stepLevel<L extends string>(
  current: L,
  levels: readonly L[],
  direction: 1 | -1,
): L {
  const index = levels.indexOf(current);
  const nextIndex = Math.max(0, Math.min(levels.length - 1, index + direction));
  return levels[nextIndex] ?? current;
}

function buildNoChangeDecision(
  domain: 'reading' | 'math',
  level: string,
  evidence: string,
): AdaptationDecision {
  return {
    domain,
    previousLevel: level,
    nextLevel: level,
    reason: 'no_change',
    evidence,
  };
}

function updateDomainState<L extends string>(
  domain: 'reading' | 'math',
  state: DomainMasteryState<L>,
  outcome: LearningOutcome,
  levels: readonly L[],
): { nextState: DomainMasteryState<L>; decision: AdaptationDecision } {
  const nextOutcomes = clampOutcomes([...state.recentOutcomes, outcome]);
  const nextAnsweredCount = outcome === 'skipped' ? state.answeredCount : state.answeredCount + 1;
  const nextCooldown = Math.max(0, state.cooldownRemaining - 1);

  const baseState: DomainMasteryState<L> = {
    level: state.level,
    recentOutcomes: nextOutcomes,
    answeredCount: nextAnsweredCount,
    cooldownRemaining: nextCooldown,
  };

  const metrics = getAccuracy(nextOutcomes);

  if (metrics.answered < ADAPTIVE_MIN_ANSWERED) {
    return {
      nextState: baseState,
      decision: buildNoChangeDecision(
        domain,
        state.level,
        `Gathering data (${metrics.answered}/${ADAPTIVE_MIN_ANSWERED} answered in window).`,
      ),
    };
  }

  if (baseState.cooldownRemaining > 0) {
    return {
      nextState: baseState,
      decision: buildNoChangeDecision(
        domain,
        state.level,
        `Cooldown active for ${baseState.cooldownRemaining} more challenge${baseState.cooldownRemaining === 1 ? '' : 's'}.`,
      ),
    };
  }

  if (metrics.accuracy >= ADAPTIVE_PROMOTION_ACCURACY) {
    const promoted = stepLevel(state.level, levels, 1);
    if (promoted !== state.level) {
      return {
        nextState: {
          ...baseState,
          level: promoted,
          cooldownRemaining: ADAPTIVE_COOLDOWN_STEPS,
        },
        decision: {
          domain,
          previousLevel: state.level,
          nextLevel: promoted,
          reason: 'mastery_increase',
          evidence: `${metrics.correct}/${metrics.answered} correct in recent window. Moving up for productive challenge.`,
        },
      };
    }
  }

  if (metrics.accuracy <= ADAPTIVE_SUPPORT_ACCURACY) {
    const supported = stepLevel(state.level, levels, -1);
    if (supported !== state.level) {
      return {
        nextState: {
          ...baseState,
          level: supported,
          cooldownRemaining: ADAPTIVE_COOLDOWN_STEPS,
        },
        decision: {
          domain,
          previousLevel: state.level,
          nextLevel: supported,
          reason: 'support_needed',
          evidence: `${metrics.correct}/${metrics.answered} correct in recent window. Stepping down for consolidation.`,
        },
      };
    }
  }

  return {
    nextState: baseState,
    decision: buildNoChangeDecision(
      domain,
      state.level,
      `${metrics.correct}/${metrics.answered} correct in recent window. Keeping current level.`,
    ),
  };
}

export function createDefaultLearningProfile(
  readingLevel: ReadingLevel,
  mathLevel: MathLevel,
  now: number = Date.now(),
): LearningProfile {
  return {
    version: 1,
    reading: {
      level: readingLevel,
      recentOutcomes: [],
      answeredCount: 0,
      cooldownRemaining: 0,
    },
    math: {
      level: mathLevel,
      recentOutcomes: [],
      answeredCount: 0,
      cooldownRemaining: 0,
    },
    updatedAt: now,
  };
}

export function applyLearningOutcome(
  profile: LearningProfile,
  domain: 'reading' | 'math',
  outcome: LearningOutcome,
  now: number = Date.now(),
): MasteryUpdateResult {
  if (domain === 'reading') {
    const { nextState, decision } = updateDomainState(domain, profile.reading, outcome, READING_LEVELS);
    return {
      profile: {
        ...profile,
        reading: nextState,
        updatedAt: now,
      },
      decision,
    };
  }

  const { nextState, decision } = updateDomainState(domain, profile.math, outcome, MATH_LEVELS);
  return {
    profile: {
      ...profile,
      math: nextState,
      updatedAt: now,
    },
    decision,
  };
}
