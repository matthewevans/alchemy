import { describe, it, expect } from 'vitest';
import { getDeckPrimaryElement } from './cardUtils';
import { getRandomBattlefield, BATTLEFIELD_MAP, BATTLEFIELDS } from '@components/board/battlefields';
import type { Element } from '@engine/types';

describe('getRandomBattlefield', () => {
  it('returns a battlefield matching the requested element', () => {
    const elements: Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];
    for (const el of elements) {
      const bf = getRandomBattlefield(el);
      expect(bf, `Expected battlefield for ${el}`).toBeTruthy();
      expect(bf.element).toBe(el);
      expect(bf.image).toContain('battlefield/landscape/');
    }
  });
});

describe('BATTLEFIELD_MAP', () => {
  it('contains all registered battlefields', () => {
    expect(Object.keys(BATTLEFIELD_MAP)).toHaveLength(BATTLEFIELDS.length);
  });
});

describe('getDeckPrimaryElement', () => {
  it('returns the most common element', () => {
    const ids = ['fire_ember_sprite', 'fire_flame_fox', 'water_splash'];
    expect(getDeckPrimaryElement(ids)).toBe('fire');
  });

  it('returns null for empty deck', () => {
    expect(getDeckPrimaryElement([])).toBeNull();
  });
});
