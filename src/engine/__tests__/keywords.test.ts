import { describe, it, expect } from 'vitest';
import { KEYWORD_REGISTRY, getKeywordsForTier } from '../keywords';
import type { Keyword, Tier } from '../types';

const ALL_KEYWORDS: Keyword[] = [
  'swift', 'blast', 'heal', 'draw',
  'fury', 'armor',
  'deathtouch', 'lifesteal',
];

describe('KEYWORD_REGISTRY', () => {
  it('registers all 8 keywords', () => {
    expect(Object.keys(KEYWORD_REGISTRY)).toHaveLength(8);
    for (const kw of ALL_KEYWORDS) {
      expect(KEYWORD_REGISTRY[kw]).toBeDefined();
    }
  });

  it('every keyword has a non-empty description', () => {
    for (const kw of ALL_KEYWORDS) {
      expect(KEYWORD_REGISTRY[kw].description).toBeTruthy();
    }
  });

  it('every keyword name matches its registry key', () => {
    for (const [key, def] of Object.entries(KEYWORD_REGISTRY)) {
      expect(def.name).toBe(key);
    }
  });
});

describe('getKeywordsForTier', () => {
  it('apprentice tier returns exactly 4 keywords', () => {
    const keywords = getKeywordsForTier('apprentice');
    expect(keywords).toHaveLength(4);
  });

  it('alchemist tier returns exactly 6 keywords', () => {
    const keywords = getKeywordsForTier('alchemist');
    expect(keywords).toHaveLength(6);
  });

  it('archmage tier returns exactly 8 keywords', () => {
    const keywords = getKeywordsForTier('archmage');
    expect(keywords).toHaveLength(8);
  });

  it('higher tiers are supersets of lower tiers', () => {
    const apprentice = getKeywordsForTier('apprentice');
    const alchemist = getKeywordsForTier('alchemist');
    const archmage = getKeywordsForTier('archmage');

    for (const kw of apprentice) {
      expect(alchemist).toContain(kw);
    }
    for (const kw of alchemist) {
      expect(archmage).toContain(kw);
    }
  });

  it('returns only keywords introduced at or before the given tier', () => {
    const tiers: Tier[] = ['apprentice', 'alchemist', 'archmage'];
    for (const tier of tiers) {
      const keywords = getKeywordsForTier(tier);
      for (const kw of keywords) {
        const kwTierIndex = tiers.indexOf(KEYWORD_REGISTRY[kw].tier);
        const tierIndex = tiers.indexOf(tier);
        expect(kwTierIndex).toBeLessThanOrEqual(tierIndex);
      }
    }
  });
});
