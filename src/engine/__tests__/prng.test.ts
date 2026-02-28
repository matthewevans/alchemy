import { describe, it, expect } from 'vitest';
import { createRNG, shuffle } from '../prng';

describe('createRNG', () => {
  it('produces values in [0, 1)', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const a = createRNG(12345);
    const b = createRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = createRNG(1);
    const b = createRNG(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const copy = [...items];
    shuffle(copy, createRNG(99));
    expect(copy.sort((a, b) => a - b)).toEqual(items);
  });

  it('is deterministic with the same RNG seed', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [1, 2, 3, 4, 5];
    shuffle(a, createRNG(42));
    shuffle(b, createRNG(42));
    expect(a).toEqual(b);
  });

  it('actually reorders elements (not identity)', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const original = [...items];
    shuffle(items, createRNG(7));
    expect(items).not.toEqual(original);
  });
});
