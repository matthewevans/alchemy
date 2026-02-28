import { describe, it, expect } from 'vitest';
import { ALL_CARDS, CARD_REGISTRY, getCardsByElement, getCardsByTier } from '../cards';
import { EFFECT_REGISTRY } from '../effects';
import type { Element } from '../types';

const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];

const FUTURE_EFFECT_IDS = ['ghost_knight_etb', 'shadow_dragon_etb'];

describe('ALL_CARDS', () => {
  it('has exactly 50 cards', () => {
    expect(ALL_CARDS).toHaveLength(50);
  });

  it('each element has exactly 10 cards', () => {
    for (const element of ELEMENTS) {
      const cards = ALL_CARDS.filter((c) => c.element === element);
      expect(cards).toHaveLength(10);
    }
  });

  it('each element has 7 creatures and 3 spells', () => {
    for (const element of ELEMENTS) {
      const cards = ALL_CARDS.filter((c) => c.element === element);
      const creatures = cards.filter((c) => c.type === 'creature');
      const spells = cards.filter((c) => c.type === 'spell');
      expect(creatures).toHaveLength(7);
      expect(spells).toHaveLength(3);
    }
  });

  it('all card IDs are unique', () => {
    const ids = ALL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all cards have valid element, type, and tier', () => {
    const validElements = new Set(ELEMENTS);
    const validTypes = new Set(['creature', 'spell']);
    const validTiers = new Set(['apprentice', 'alchemist', 'archmage']);

    for (const card of ALL_CARDS) {
      expect(validElements.has(card.element)).toBe(true);
      expect(validTypes.has(card.type)).toBe(true);
      expect(validTiers.has(card.tier)).toBe(true);
    }
  });

  it('creatures have attack >= 0 and health >= 1', () => {
    const creatures = ALL_CARDS.filter((c) => c.type === 'creature');
    for (const creature of creatures) {
      expect(creature.attack).toBeGreaterThanOrEqual(0);
      expect(creature.health).toBeGreaterThanOrEqual(1);
    }
  });

  it('spells have no attack or health', () => {
    const spells = ALL_CARDS.filter((c) => c.type === 'spell');
    for (const spell of spells) {
      expect(spell.attack).toBeUndefined();
      expect(spell.health).toBeUndefined();
    }
  });

  it('cards with effectId have matching entries in EFFECT_REGISTRY (excluding future ETBs)', () => {
    const cardsWithEffects = ALL_CARDS.filter(
      (c) => c.effectId && !FUTURE_EFFECT_IDS.includes(c.effectId),
    );
    for (const card of cardsWithEffects) {
      expect(EFFECT_REGISTRY[card.effectId!]).toBeDefined();
    }
  });

  it('spell cards with registered effectId have targetingType matching the effect', () => {
    const spellsWithRegisteredEffects = ALL_CARDS.filter(
      (c) => c.type === 'spell' && c.effectId && EFFECT_REGISTRY[c.effectId],
    );
    for (const spell of spellsWithRegisteredEffects) {
      const effect = EFFECT_REGISTRY[spell.effectId!];
      expect(spell.targetingType).toEqual(effect.targetingType);
    }
  });
});

describe('CARD_REGISTRY', () => {
  it('contains all cards indexed by id', () => {
    expect(Object.keys(CARD_REGISTRY)).toHaveLength(ALL_CARDS.length);
    for (const card of ALL_CARDS) {
      expect(CARD_REGISTRY[card.id]).toBe(card);
    }
  });
});

describe('getCardsByElement', () => {
  it('returns correct count per element', () => {
    for (const element of ELEMENTS) {
      expect(getCardsByElement(element)).toHaveLength(10);
    }
  });

  it('returns only cards of the requested element', () => {
    for (const element of ELEMENTS) {
      const cards = getCardsByElement(element);
      for (const card of cards) {
        expect(card.element).toBe(element);
      }
    }
  });
});

describe('getCardsByTier', () => {
  it('returns all 50 cards for apprentice', () => {
    expect(getCardsByTier('apprentice')).toHaveLength(50);
  });

  it('returns 0 cards for alchemist and archmage (no cards yet)', () => {
    expect(getCardsByTier('alchemist')).toHaveLength(0);
    expect(getCardsByTier('archmage')).toHaveLength(0);
  });
});
