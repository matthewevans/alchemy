import type { RNG } from './types';

/**
 * A seeded RNG that is callable as `RNG` and exposes its internal state
 * for serialization. Call `getState()` to snapshot, `restoreRNG(s)` to resume.
 */
export interface SeededRNG {
  (): number;
  getState: () => number;
}

/** mulberry32 — a fast 32-bit seeded PRNG producing deterministic [0, 1) floats. */
export function createRNG(seed: number): SeededRNG {
  return _buildRNG(seed | 0);
}

/** Restore a previously serialized RNG from its internal state value. */
export function restoreRNG(state: number): SeededRNG {
  return _buildRNG(state);
}

function _buildRNG(initialState: number): SeededRNG {
  let s = initialState;
  const rng = (() => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as SeededRNG;
  rng.getState = () => s;
  return rng;
}

/** Type guard: is this RNG a SeededRNG with serializable state? */
export function isSeededRNG(rng: RNG): rng is SeededRNG {
  return typeof (rng as SeededRNG).getState === 'function';
}

/** Fisher-Yates shuffle using the provided RNG. Mutates array in-place. */
export function shuffle<T>(array: T[], rng: RNG): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
