import { describe, it, expect } from 'vitest';
import { calculateBoardCardSize } from './boardSizing';

describe('calculateBoardCardSize', () => {
  it('keeps base size when space is sufficient', () => {
    const size = calculateBoardCardSize({
      containerWidth: 900,
      containerHeight: 320,
      slotCount: 5,
      baseWidth: 120,
      baseHeight: 168,
    });

    expect(size.width).toBe(120);
    expect(size.height).toBe(168);
  });

  it('shrinks cards as slot count increases', () => {
    const fiveSlots = calculateBoardCardSize({
      containerWidth: 900,
      containerHeight: 320,
      slotCount: 5,
      baseWidth: 120,
      baseHeight: 168,
    });
    const eightSlots = calculateBoardCardSize({
      containerWidth: 900,
      containerHeight: 320,
      slotCount: 8,
      baseWidth: 120,
      baseHeight: 168,
    });

    expect(eightSlots.width).toBeLessThan(fiveSlots.width);
    expect(eightSlots.height).toBeLessThan(fiveSlots.height);
  });
});
