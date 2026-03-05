import type {
  GameAction,
  GameState,
  LearningDomain,
  PlayerId,
} from '@engine/types';
import type { LearningFrequency, MathLevel, ReadingLevel } from './config';
import { buildMathPrompt, buildReadingPrompt } from './content';
import { hashStringToSeed } from './random';
import { evaluateLearningCadence } from './domain/cadencePolicy';
import {
  choosePromptBucket,
  type LearningPromptBucket,
  type PromptSelectionPrefs,
} from './domain/promptSelectionPolicy';
import { chooseLearningReward } from './domain/rewardPolicy';

interface LearningPolicyPrefs extends PromptSelectionPrefs {
  learningChallengesEnabled: boolean;
  readingLevel: ReadingLevel;
  mathLevel: MathLevel;
  learningFrequency: LearningFrequency;
}

interface LearningPolicyInput {
  state: GameState;
  action: GameAction;
  actingPlayer: PlayerId;
  humanPlayer: PlayerId;
  opportunityIndex: number;
  correctStreak: number;
  incorrectStreak: number;
  prefs: LearningPolicyPrefs;
}

type LearningGateAction =
  | Extract<GameAction, { type: 'CONFIRM_ATTACKERS' }>
  | Extract<GameAction, { type: 'CONFIRM_BLOCKERS' }>;

function isLearningGateAction(action: GameAction): action is LearningGateAction {
  return action.type === 'CONFIRM_ATTACKERS' || action.type === 'CONFIRM_BLOCKERS';
}

function buildPromptSeed(
  state: GameState,
  action: LearningGateAction,
  bucket: LearningPromptBucket,
  opportunityIndex: number,
): number {
  const domain: LearningDomain = bucket === 'math' ? 'math' : 'reading';
  const signature = [
    bucket,
    domain,
    action.type,
    String(opportunityIndex),
    String(state.turn),
    state.activePlayer,
    String(state.players.player1.health),
    String(state.players.player2.health),
    state.phase.type,
  ].join('|');
  return hashStringToSeed(signature);
}

function buildSelectionSeed(
  state: GameState,
  action: LearningGateAction,
  opportunityIndex: number,
): number {
  const signature = [
    action.type,
    String(opportunityIndex),
    String(state.turn),
    state.activePlayer,
    String(state.players.player1.health),
    String(state.players.player2.health),
    state.phase.type,
  ].join('|');
  return hashStringToSeed(signature);
}

export function maybeBuildLearningChallengeAction(
  input: LearningPolicyInput,
): Extract<GameAction, { type: 'START_LEARNING_CHALLENGE' }> | null {
  const {
    state,
    action,
    actingPlayer,
    humanPlayer,
    opportunityIndex,
    correctStreak,
    incorrectStreak,
    prefs,
  } = input;

  if (!prefs.learningChallengesEnabled) return null;
  if (state.phase.type === 'learning') return null;
  if (actingPlayer !== humanPlayer) return null;
  if (!isLearningGateAction(action)) return null;

  const cadence = evaluateLearningCadence({
    opportunityIndex,
    learningFrequency: prefs.learningFrequency,
    correctStreak,
    incorrectStreak,
  });
  if (!cadence.shouldTrigger) return null;

  const selectionSeed = buildSelectionSeed(state, action, opportunityIndex);
  const selection = choosePromptBucket(prefs, selectionSeed);
  if (!selection.bucket) return null;

  const rewardDecision = chooseLearningReward({
    state,
    action,
    correctStreak,
  });
  if (!rewardDecision.reward) return null;

  const promptSeed = buildPromptSeed(state, action, selection.bucket, opportunityIndex);
  const prompt = selection.bucket === 'math'
    ? buildMathPrompt(prefs.mathLevel, promptSeed)
    : buildReadingPrompt(
      prefs.readingLevel,
      promptSeed,
      selection.bucket === 'word' ? 'word_to_picture' : 'missing_letter',
    );

  return {
    type: 'START_LEARNING_CHALLENGE',
    prompt,
    reward: rewardDecision.reward,
    resumeAction: { type: action.type },
    meta: {
      cadenceReason: cadence.reason,
      rewardReason: rewardDecision.reason,
      selectionReason: selection.reason,
      opportunityIndex,
      promptBucket: selection.bucket,
      effectiveReadingLevel: prefs.readingLevel,
      effectiveMathLevel: prefs.mathLevel,
    },
  };
}
