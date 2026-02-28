import { describe, it, expect } from 'vitest';
import { ELEMENT_META, ELEMENTS, ALLIED_PAIRS } from '../elements';

describe('ELEMENT_META', () => {
  it('defines metadata for all five elements', () => {
    expect(ELEMENTS).toHaveLength(5);
    for (const el of ELEMENTS) {
      const meta = ELEMENT_META[el];
      expect(meta.name).toBeTruthy();
      expect(meta.color).toBeTruthy();
      expect(meta.philosophy).toBeTruthy();
      expect(meta.strengths.length).toBeGreaterThan(0);
    }
  });
});

describe('ALLIED_PAIRS', () => {
  it('has five allied pairs (color wheel)', () => {
    expect(ALLIED_PAIRS).toHaveLength(5);
  });

  it('each element appears in exactly two allied pairs', () => {
    for (const el of ELEMENTS) {
      const count = ALLIED_PAIRS.filter(([a, b]) => a === el || b === el).length;
      expect(count).toBe(2);
    }
  });

  it('pairs contain only valid elements', () => {
    for (const [a, b] of ALLIED_PAIRS) {
      expect(ELEMENTS).toContain(a);
      expect(ELEMENTS).toContain(b);
      expect(a).not.toBe(b);
    }
  });
});
