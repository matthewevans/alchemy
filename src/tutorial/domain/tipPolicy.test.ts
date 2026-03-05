import { describe, expect, it } from 'vitest';
import { evaluateTipTrigger, resolveContextualTipId } from './tipPolicy';
import type { TutorialStepId } from './stepRegistry';

describe('tipPolicy', () => {
  const baseExposure = {
    shownThisGame: new Set<TutorialStepId>(),
    autoSeenAcrossSessions: new Set<TutorialStepId>(),
    currentTipId: null,
  };

  it('returns eligible for unseen human-turn context', () => {
    const decision = evaluateTipTrigger(
      {
        phaseType: 'energy',
        combatMathEnabled: false,
        isHumanTurn: true,
      },
      baseExposure,
      { autoTipsEnabled: true },
    );

    expect(decision.shouldShow).toBe(true);
    expect(decision.tipId).toBe('first_energy');
    expect(decision.reason).toBe('eligible');
  });

  it('suppresses tips when auto tips are disabled', () => {
    const decision = evaluateTipTrigger(
      {
        phaseType: 'energy',
        combatMathEnabled: false,
        isHumanTurn: true,
      },
      baseExposure,
      { autoTipsEnabled: false },
    );

    expect(decision.shouldShow).toBe(false);
    expect(decision.reason).toBe('disabled');
  });

  it('suppresses already seen tips', () => {
    const decision = evaluateTipTrigger(
      {
        phaseType: 'energy',
        combatMathEnabled: false,
        isHumanTurn: true,
      },
      {
        ...baseExposure,
        autoSeenAcrossSessions: new Set(['first_energy']),
      },
      { autoTipsEnabled: true },
    );

    expect(decision.shouldShow).toBe(false);
    expect(decision.reason).toBe('already_seen');
  });

  it('maps declare blockers to combat math when enabled', () => {
    expect(resolveContextualTipId({
      phaseType: 'battle',
      phaseStep: 'declare_blockers',
      combatMathEnabled: true,
      isHumanTurn: true,
    })).toBe('combat_math');
  });
});
