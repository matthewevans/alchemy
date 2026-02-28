import type { Keyword, RulesetConfig, Tier } from './types';

export const TIER_ORDER: readonly Tier[] = ['apprentice', 'alchemist', 'archmage'];

const APPRENTICE_KEYWORDS: ReadonlySet<Keyword> = new Set([
  'swift',
  'blast',
  'heal',
  'draw',
]);

const ALCHEMIST_KEYWORDS: ReadonlySet<Keyword> = new Set([
  ...APPRENTICE_KEYWORDS,
  'fury',
  'armor',
]);

const ARCHMAGE_KEYWORDS: ReadonlySet<Keyword> = new Set([
  ...ALCHEMIST_KEYWORDS,
  'deathtouch',
  'lifesteal',
]);

export const TIER_CONFIGS: Record<Tier, RulesetConfig> = {
  apprentice: {
    tier: 'apprentice',
    deckSize: 20,
    maxCopiesPerCard: 2,
    energyCap: 5,
    maxHandSize: 7,
    maxBoardSize: 5,
    startingHealth: 20,
    startingHandSize: 4,
    damagePersists: true,
    allowCombatTricks: false,
    availableKeywords: APPRENTICE_KEYWORDS,
  },
  alchemist: {
    tier: 'alchemist',
    deckSize: 30,
    maxCopiesPerCard: 3,
    energyCap: 7,
    maxHandSize: 8,
    maxBoardSize: 6,
    startingHealth: 25,
    startingHandSize: 5,
    damagePersists: false,
    allowCombatTricks: false,
    availableKeywords: ALCHEMIST_KEYWORDS,
  },
  archmage: {
    tier: 'archmage',
    deckSize: 30,
    maxCopiesPerCard: 4,
    energyCap: 10,
    maxHandSize: 9,
    maxBoardSize: 7,
    startingHealth: 30,
    startingHandSize: 5,
    damagePersists: false,
    allowCombatTricks: true,
    availableKeywords: ARCHMAGE_KEYWORDS,
  },
} as const;
