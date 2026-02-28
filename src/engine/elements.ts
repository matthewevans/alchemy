import type { Element } from './types';

export interface ElementMeta {
  name: string;
  color: string;
  philosophy: string;
  strengths: string[];
}

export const ELEMENT_META: Record<Element, ElementMeta> = {
  fire: {
    name: 'Fire',
    color: 'var(--fire)',
    philosophy: 'Aggressive, fast, direct damage',
    strengths: ['swift creatures', 'burn spells', 'high attack'],
  },
  water: {
    name: 'Water',
    color: 'var(--water)',
    philosophy: 'Defensive, card advantage, healing',
    strengths: ['card draw', 'healing spells', 'high health creatures'],
  },
  earth: {
    name: 'Earth',
    color: 'var(--earth)',
    philosophy: 'Sturdy, reliable, growth',
    strengths: ['armor', 'large creatures', 'energy ramp'],
  },
  air: {
    name: 'Air',
    color: 'var(--air)',
    philosophy: 'Tricky, evasive, tempo',
    strengths: ['swift creatures', 'bounce effects', 'combat tricks'],
  },
  shadow: {
    name: 'Shadow',
    color: 'var(--shadow)',
    philosophy: 'Ruthless, sacrifice, power at a cost',
    strengths: ['deathtouch', 'lifesteal', 'removal spells'],
  },
} as const;

export const ELEMENTS: readonly Element[] = ['fire', 'water', 'earth', 'air', 'shadow'] as const;

/** Allied element pairs on the color wheel. */
export const ALLIED_PAIRS: readonly [Element, Element][] = [
  ['fire', 'air'],
  ['air', 'water'],
  ['water', 'earth'],
  ['earth', 'shadow'],
  ['shadow', 'fire'],
] as const;
