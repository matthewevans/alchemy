import { describe, it, expect } from 'vitest';
import { TIER_CONFIGS } from '../ruleset';
import type { Tier } from '../types';

describe('TIER_CONFIGS', () => {
  const tiers: Tier[] = ['apprentice', 'alchemist', 'archmage'];

  it('defines configs for all three tiers', () => {
    for (const tier of tiers) {
      expect(TIER_CONFIGS[tier]).toBeDefined();
      expect(TIER_CONFIGS[tier].tier).toBe(tier);
    }
  });

  it('scales complexity upward across tiers', () => {
    const app = TIER_CONFIGS.apprentice;
    const alc = TIER_CONFIGS.alchemist;
    const arc = TIER_CONFIGS.archmage;

    expect(app.deckSize).toBeLessThanOrEqual(alc.deckSize);
    expect(alc.deckSize).toBeLessThanOrEqual(arc.deckSize);

    expect(app.energyCap).toBeLessThan(alc.energyCap);
    expect(alc.energyCap).toBeLessThan(arc.energyCap);

    expect(app.availableKeywords.size).toBeLessThan(alc.availableKeywords.size);
    expect(alc.availableKeywords.size).toBeLessThan(arc.availableKeywords.size);
  });

  it('higher tiers are supersets of lower tier keywords', () => {
    for (const kw of TIER_CONFIGS.apprentice.availableKeywords) {
      expect(TIER_CONFIGS.alchemist.availableKeywords.has(kw)).toBe(true);
    }
    for (const kw of TIER_CONFIGS.alchemist.availableKeywords) {
      expect(TIER_CONFIGS.archmage.availableKeywords.has(kw)).toBe(true);
    }
  });

  it('only archmage allows combat tricks', () => {
    expect(TIER_CONFIGS.apprentice.allowCombatTricks).toBe(false);
    expect(TIER_CONFIGS.alchemist.allowCombatTricks).toBe(false);
    expect(TIER_CONFIGS.archmage.allowCombatTricks).toBe(true);
  });

  it('apprentice has persistent damage; higher tiers heal EOT', () => {
    expect(TIER_CONFIGS.apprentice.damagePersists).toBe(true);
    expect(TIER_CONFIGS.alchemist.damagePersists).toBe(false);
    expect(TIER_CONFIGS.archmage.damagePersists).toBe(false);
  });
});
