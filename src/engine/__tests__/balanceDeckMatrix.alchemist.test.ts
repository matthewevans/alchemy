import { beforeAll, describe, expect, it } from 'vitest';
import type { Tier } from '../types';
import {
  BALANCE_DEBUG,
  TIER_GUARDRAILS,
  assertValidSimulationKnobs,
  runTierMatrix,
  type TierSummary,
} from './balanceDeckMatrix.shared';

const TIER: Tier = 'alchemist';

let summary: TierSummary;

beforeAll(() => {
  assertValidSimulationKnobs();
  summary = runTierMatrix(TIER);
  if (BALANCE_DEBUG) {
    console.log(JSON.stringify({ [TIER]: summary }, null, 2));
  }
}, 20 * 60 * 1000);

describe(`starter deck matrix balance gate (${TIER})`, () => {
  it('ensures every deck has decided games', () => {
    for (const decided of Object.values(summary.deckDecidedGames)) {
      expect(decided).toBeGreaterThan(0);
    }
  });

  it('keeps draw rate within guardrails', () => {
    const guardrail = TIER_GUARDRAILS[TIER];
    expect(summary.drawRate).toBeGreaterThanOrEqual(guardrail.minDrawRate);
    expect(summary.drawRate).toBeLessThanOrEqual(guardrail.maxDrawRate);
  });

  it('keeps average game length within guardrails', () => {
    const guardrail = TIER_GUARDRAILS[TIER];
    expect(summary.avgTurns).toBeGreaterThanOrEqual(guardrail.minAvgTurns);
    expect(summary.avgTurns).toBeLessThanOrEqual(guardrail.maxAvgTurns);
  });

  it('keeps tier deck spread within guardrails', () => {
    const guardrail = TIER_GUARDRAILS[TIER];
    expect(summary.spread).toBeLessThanOrEqual(guardrail.maxSpread);
  });
});
