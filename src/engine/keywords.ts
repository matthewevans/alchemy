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
    description: 'Can attack the turn it is played',
  },
  blast: {
    name: 'blast',
    type: 'etb',
    tier: 'apprentice',
    icon: '\uD83D\uDCA5',
    description: 'When played, deals 1 damage to all enemy creatures',
  },
  heal: {
    name: 'heal',
    type: 'etb',
    tier: 'apprentice',
    icon: '\u2764\uFE0F',
    description: 'When played, restore 2 health to your hero',
  },
  draw: {
    name: 'draw',
    type: 'etb',
    tier: 'apprentice',
    icon: '\uD83C\uDCCF',
    description: 'When played, draw 1 card',
  },
  fury: {
    name: 'fury',
    type: 'passive',
    tier: 'alchemist',
    icon: '\u2694\uFE0F',
    description: 'Deals damage twice in combat',
  },
  armor: {
    name: 'armor',
    type: 'passive',
    tier: 'alchemist',
    icon: '\uD83D\uDEE1\uFE0F',
    description: 'Prevents the first 1 damage received each turn',
  },
  deathtouch: {
    name: 'deathtouch',
    type: 'passive',
    tier: 'archmage',
    icon: '\uD83D\uDC80',
    description: 'Destroys any creature it damages',
  },
  lifesteal: {
    name: 'lifesteal',
    type: 'passive',
    tier: 'archmage',
    icon: '\uD83E\uDDB7',
    description: 'When this deals damage, heal your hero the same amount',
  },
};

export function getKeywordsForTier(tier: Tier): Keyword[] {
  const tierIndex = TIER_ORDER.indexOf(tier);
  return Object.values(KEYWORD_REGISTRY)
    .filter((def) => TIER_ORDER.indexOf(def.tier) <= tierIndex)
    .map((def) => def.name);
}
