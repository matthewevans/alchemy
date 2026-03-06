import { describe, expect, it } from 'vitest';
import type { Phase } from '@engine/types';
import { getCardCostPresentation } from './costPresentation';

describe('getCardCostPresentation', () => {
  it('returns default presentation outside combat priority', () => {
    const result = getCardCostPresentation('fire_fireball', { type: 'play' });
    expect(result).toEqual({ highlightCost: false });
  });

  it('applies burn instant surcharge in combat priority', () => {
    const phase: Phase = {
      type: 'combat_priority',
      window: 'post_attackers',
      confirmedAttackers: [],
      blockers: {},
      attackerBlockerOrder: {},
      priorityPlayer: 'player1',
      passCount: 0,
      stack: [],
    };

    const result = getCardCostPresentation('fire_fireball', phase);
    expect(result).toEqual({
      costOverride: 3,
      costHint: 'Combat instant cast: 2 base + 1 surcharge = 3 (before blockers).',
      highlightCost: true,
    });
  });

  it('applies removal instant surcharge in combat priority', () => {
    const phase: Phase = {
      type: 'combat_priority',
      window: 'post_blockers',
      confirmedAttackers: [],
      blockers: {},
      attackerBlockerOrder: {},
      priorityPlayer: 'player1',
      passCount: 0,
      stack: [],
    };

    const result = getCardCostPresentation('shadow_doom', phase);
    expect(result).toEqual({
      costOverride: 6,
      costHint: 'Combat instant cast: 4 base + 2 surcharge = 6 (before combat damage).',
      highlightCost: true,
    });
  });
});

