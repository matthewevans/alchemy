import type { GameAction, GameState, LearningDomain, LearningReward, PlayerId } from '@engine/types';
import { LEARNING_FREQUENCY_INTERVAL } from './config';
import type { LearningFrequency, MathLevel, ReadingLevel } from './config';
import { buildMathPrompt, buildReadingPrompt } from './content';
import { hashStringToSeed } from './random';

interface LearningPolicyPrefs {
  learningChallengesEnabled: boolean;
  readingChallengesEnabled: boolean;
  mathChallengesEnabled: boolean;
  readingLevel: ReadingLevel;
  mathLevel: MathLevel;
  learningFrequency: LearningFrequency;
  readingChallengeWeight: number;
  wordChallengeWeight: number;
  mathChallengeWeight: number;
}

interface LearningPolicyInput {
  state: GameState;
  action: GameAction;
  actingPlayer: PlayerId;
  humanPlayer: PlayerId;
  opportunityIndex: number;
  prefs: LearningPolicyPrefs;
}

type LearningGateAction =
  | Extract<GameAction, { type: 'CONFIRM_ATTACKERS' }>
  | Extract<GameAction, { type: 'CONFIRM_BLOCKERS' }>;

type LearningPromptBucket = 'reading' | 'word' | 'math';

function isLearningGateAction(action: GameAction): action is LearningGateAction {
  return action.type === 'CONFIRM_ATTACKERS' || action.type === 'CONFIRM_BLOCKERS';
}

function sanitizeWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  return Math.max(0, Math.round(weight));
}

function choosePromptBucket(
  prefs: LearningPolicyPrefs,
  selectionSeed: number,
): LearningPromptBucket | null {
  const choices: Array<{ bucket: LearningPromptBucket; weight: number }> = [];

  if (prefs.mathChallengesEnabled) {
    choices.push({ bucket: 'math', weight: sanitizeWeight(prefs.mathChallengeWeight) });
  }
  if (prefs.readingChallengesEnabled) {
    choices.push({ bucket: 'reading', weight: sanitizeWeight(prefs.readingChallengeWeight) });
    choices.push({ bucket: 'word', weight: sanitizeWeight(prefs.wordChallengeWeight) });
  }

  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  if (totalWeight <= 0) return null;

  let roll = selectionSeed % totalWeight;
  for (const choice of choices) {
    roll -= choice.weight;
    if (roll < 0) return choice.bucket;
  }
  return choices[choices.length - 1]?.bucket ?? null;
}

function chooseReward(
  state: GameState,
  action: LearningGateAction,
): LearningReward | null {
  if (action.type === 'CONFIRM_ATTACKERS') {
    if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') return null;
    const targetId = state.phase.tentativeAttackers[0];
    if (!targetId) return null;
    return { permanentId: targetId, attackBonus: 1, healthBonus: 0 };
  }

  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_blockers') return null;
  const targetId = Object.keys(state.phase.tentativeBlockers)[0];
  if (!targetId) return null;
  return { permanentId: targetId, attackBonus: 0, healthBonus: 1 };
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
  const { state, action, actingPlayer, humanPlayer, opportunityIndex, prefs } = input;
  if (!prefs.learningChallengesEnabled) return null;
  if (state.phase.type === 'learning') return null;
  if (actingPlayer !== humanPlayer) return null;
  if (!isLearningGateAction(action)) return null;

  const interval = LEARNING_FREQUENCY_INTERVAL[prefs.learningFrequency];
  if (opportunityIndex % interval !== 0) return null;
  const selectionSeed = buildSelectionSeed(state, action, opportunityIndex);
  const promptBucket = choosePromptBucket(prefs, selectionSeed);
  if (!promptBucket) return null;

  const reward = chooseReward(state, action);
  if (!reward) return null;

  const promptSeed = buildPromptSeed(state, action, promptBucket, opportunityIndex);
  const prompt = promptBucket === 'math'
    ? buildMathPrompt(prefs.mathLevel, promptSeed)
    : buildReadingPrompt(
      prefs.readingLevel,
      promptSeed,
      promptBucket === 'word' ? 'word_to_picture' : 'missing_letter',
    );

  return {
    type: 'START_LEARNING_CHALLENGE',
    prompt,
    reward,
    resumeAction: { type: action.type },
  };
}
