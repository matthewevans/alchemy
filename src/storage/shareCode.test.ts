import { describe, it, expect } from 'vitest';
import { encodeDeck, decodeDeck } from './shareCode';
import { ALL_CARDS } from '@engine/cards';

describe('shareCode', () => {
  it('round-trips a deck through encode/decode', () => {
    const cardIds = [
      'fire_ember_sprite',
      'fire_ember_sprite',
      'fire_flame_fox',
      'fire_lava_hound',
      'fire_lava_hound',
      'water_tide_sprite',
      'water_tide_sprite',
      'earth_pebble_pup',
      'earth_pebble_pup',
      'air_breeze_fairy',
      'air_breeze_fairy',
      'shadow_sneaky_cat',
      'shadow_sneaky_cat',
      'fire_fireball',
      'fire_fireball',
      'water_splash',
      'water_splash',
      'earth_entangle',
      'earth_entangle',
      'air_gust',
    ];

    const code = encodeDeck(cardIds, 'apprentice');
    const result = decodeDeck(code);

    expect(result).not.toBeNull();
    expect(result!.tier).toBe('apprentice');
    expect(result!.cardIds.sort()).toEqual([...cardIds].sort());
  });

  it('produces a compact string (~26 chars)', () => {
    const cardIds = ALL_CARDS.slice(0, 10).map((c) => c.id);
    const code = encodeDeck(cardIds, 'apprentice');
    // 100 cards × 2 bits = 25 data bytes + 1 header = 26 bytes → ~35 base64 chars
    expect(code.length).toBeLessThanOrEqual(40);
  });

  it('returns null for invalid codes', () => {
    expect(decodeDeck('')).toBeNull();
    expect(decodeDeck('!!invalid!!')).toBeNull();
  });

  it('returns null for unknown version', () => {
    // Version 15 (0xF0) would be invalid
    const bytes = new Uint8Array([0xf0, 0, 0]);
    const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeDeck(code)).toBeNull();
  });

  it('encodes an empty deck', () => {
    const code = encodeDeck([], 'apprentice');
    const result = decodeDeck(code);
    expect(result).not.toBeNull();
    expect(result!.cardIds).toEqual([]);
    expect(result!.tier).toBe('apprentice');
  });

  it('preserves copy counts up to 3', () => {
    const cardIds = ['fire_ember_sprite', 'fire_ember_sprite', 'fire_ember_sprite'];
    const code = encodeDeck(cardIds, 'alchemist');
    const result = decodeDeck(code);
    expect(result!.tier).toBe('alchemist');
    expect(result!.cardIds).toEqual(cardIds);
  });
});
