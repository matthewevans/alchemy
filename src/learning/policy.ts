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

function isLearningGateAction(action: GameAction): action is LearningGateAction {
  return action.type === 'CONFIRM_ATTACKERS' || action.type === 'CONFIRM_BLOCKERS';
}

function chooseDomain(
  readingEnabled: boolean,
  mathEnabled: boolean,
  challengeIndex: number,
): LearningDomain | null {
  if (readingEnabled && mathEnabled) {
    return challengeIndex % 2 === 0 ? 'math' : 'reading';
  }
  if (readingEnabled) return 'reading';
  if (mathEnabled) return 'math';
  return null;
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
  domain: LearningDomain,
  opportunityIndex: number,
): number {
  const signature = [
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
  const challengeIndex = opportunityIndex / interval;

  const domain = chooseDomain(
    prefs.readingChallengesEnabled,
    prefs.mathChallengesEnabled,
    challengeIndex,
  );
  if (!domain) return null;

  const reward = chooseReward(state, action);
  if (!reward) return null;

  const promptSeed = buildPromptSeed(state, action, domain, opportunityIndex);
  const prompt = domain === 'reading'
    ? buildReadingPrompt(prefs.readingLevel, promptSeed)
    : buildMathPrompt(prefs.mathLevel, promptSeed);

  return {
    type: 'START_LEARNING_CHALLENGE',
    prompt,
    reward,
    resumeAction: { type: action.type },
  };
}
