import type { Keyword, Tier } from './types';
import { TIER_ORDER } from './ruleset';

export interface KeywordDefinition {
  name: Keyword;
  type: 'passive' | 'etb';
  tier: Tier;
  icon: string;
  description: string;
}

export const KEYWORD_REGISTRY: Record<Keyword, KeywordDefinition> = {
  swift: {
    name: 'swift',
    type: 'passive',
    tier: 'apprentice',
    icon: '\u26A1',
    description: 'Attacks right away!',
  },
  blast: {
    name: 'blast',
    type: 'etb',
    tier: 'apprentice',
    icon: '\uD83D\uDCA5',
    description: 'Hurts all enemies for 1 when played',
  },
  heal: {
    name: 'heal',
    type: 'etb',
    tier: 'apprentice',
    icon: '\u2764\uFE0F',
    description: 'Heals you for 2 when played',
  },
  draw: {
    name: 'draw',
    type: 'etb',
    tier: 'apprentice',
    icon: '\uD83C\uDCCF',
    description: 'Draw a card when played',
  },
  fury: {
    name: 'fury',
    type: 'passive',
    tier: 'alchemist',
    icon: '\u2694\uFE0F',
    description: 'Hits twice in combat!',
  },
  armor: {
    name: 'armor',
    type: 'passive',
    tier: 'alchemist',
    icon: '\uD83D\uDEE1\uFE0F',
    description: 'Blocks 1 damage each turn',
  },
  deathtouch: {
    name: 'deathtouch',
    type: 'passive',
    tier: 'archmage',
    icon: '\uD83D\uDC80',
    description: 'One hit destroys any enemy!',
  },
  lifesteal: {
    name: 'lifesteal',
    type: 'passive',
    tier: 'archmage',
    icon: '\uD83E\uDDB7',
    description: 'Heals you when it deals damage',
  },
};

export function getKeywordsForTier(tier: Tier): Keyword[] {
  const tierIndex = TIER_ORDER.indexOf(tier);
  return Object.values(KEYWORD_REGISTRY)
    .filter((def) => TIER_ORDER.indexOf(def.tier) <= tierIndex)
    .map((def) => def.name);
}
