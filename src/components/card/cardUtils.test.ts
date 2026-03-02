import { describe, it, expect } from 'vitest';
import { getDeckPrimaryElement } from './cardUtils';
import { getDefaultBattlefield, BATTLEFIELD_MAP, BATTLEFIELDS } from '@components/board/battlefields';
import type { Element } from '@engine/types';

describe('getDefaultBattlefield', () => {
  it('returns a battlefield for fire element', () => {
    const bf = getDefaultBattlefield('fire');
    expect(bf).toBeTruthy();
    expect(bf.image).toContain('battlefield/landscape/');
  });

  it('returns a battlefield for shadow element', () => {
    const bf = getDefaultBattlefield('shadow');
    expect(bf).toBeTruthy();
    expect(bf.element).toBe('shadow');
  });

  it('returns a battlefield for every element', () => {
    const elements: Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];
    for (const el of elements) {
      const bf = getDefaultBattlefield(el);
      expect(bf, `Expected battlefield for ${el}`).toBeTruthy();
      expect(bf.element).toBe(el);
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
