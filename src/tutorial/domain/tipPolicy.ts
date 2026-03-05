import type { TutorialStepId } from './stepRegistry';

export interface TipTriggerContext {
  phaseType: string;
  phaseStep?: string;
  combatMathEnabled: boolean;
  isHumanTurn: boolean;
}

export interface TipExposureState {
  shownThisGame: Set<TutorialStepId>;
  autoSeenAcrossSessions: Set<TutorialStepId>;
  currentTipId: TutorialStepId | null;
}

export interface TipPolicyPrefs {
  autoTipsEnabled: boolean;
}

export interface TipDecision {
  shouldShow: boolean;
  tipId: TutorialStepId | null;
  reason: 'eligible' | 'disabled' | 'already_seen' | 'currently_open' | 'not_applicable';
}

export function resolveContextualTipId(context: TipTriggerContext): TutorialStepId | null {
  if (context.phaseType === 'energy') return 'first_energy';
  if (context.phaseType === 'play') return 'first_play';
  if (context.phaseType === 'targeting') return 'targeting';
  if (context.phaseType === 'learning') return 'learning_challenge';
  if (context.phaseType === 'discard') return 'discard_phase';

  if (context.phaseType === 'battle' && context.phaseStep === 'declare_attackers') {
    return 'first_battle';
  }

  if (context.phaseType === 'battle' && context.phaseStep === 'declare_blockers') {
    return context.combatMathEnabled ? 'combat_math' : 'first_block';
  }

  if (context.phaseType === 'battle' && context.phaseStep === 'order_blockers') {
    return 'block_order';
  }

  return null;
}

export function evaluateTipTrigger(
  context: TipTriggerContext,
  exposure: TipExposureState,
  prefs: TipPolicyPrefs,
): TipDecision {
  if (!context.isHumanTurn) {
    return { shouldShow: false, tipId: null, reason: 'not_applicable' };
  }

  if (!prefs.autoTipsEnabled) {
    return { shouldShow: false, tipId: null, reason: 'disabled' };
  }

  const tipId = resolveContextualTipId(context);
  if (!tipId) {
    return { shouldShow: false, tipId: null, reason: 'not_applicable' };
  }

  if (exposure.currentTipId) {
    return { shouldShow: false, tipId, reason: 'currently_open' };
  }

  if (exposure.shownThisGame.has(tipId) || exposure.autoSeenAcrossSessions.has(tipId)) {
    return { shouldShow: false, tipId, reason: 'already_seen' };
  }

  return { shouldShow: true, tipId, reason: 'eligible' };
}
