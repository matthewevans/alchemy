import { describe, it, expect } from 'vitest';
import { getBattlefieldBackground, getDeckPrimaryElement } from './cardUtils';
import type { Element } from '@engine/types';

describe('getBattlefieldBackground', () => {
  it('returns a background for fire element', () => {
    expect(getBattlefieldBackground('fire')).toBeTruthy();
  });

  it('returns a background for shadow element (fallback)', () => {
    const bg = getBattlefieldBackground('shadow');
    expect(bg).toBeTruthy();
    expect(bg).toContain('battlefield/landscape/');
  });

  it('returns a valid background for every element', () => {
    const elements: Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];
    for (const el of elements) {
      const bg = getBattlefieldBackground(el);
      expect(bg, `Expected background for ${el}`).toBeTruthy();
    }
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
