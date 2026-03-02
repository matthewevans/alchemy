import { describe, it, expect } from 'vitest';
import { calculateBoardCardSize } from './boardSizing';

describe('calculateBoardCardSize', () => {
  it('grows beyond base size when space allows', () => {
    const size = calculateBoardCardSize({
      containerWidth: 900,
      containerHeight: 320,
      slotCount: 5,
      baseWidth: 120,
      baseHeight: 168,
    });

    // Cards should fill available height, not be capped at base size
    expect(size.width).toBeGreaterThan(120);
    expect(size.height).toBeGreaterThan(168);
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

  it('caps at 2x base size to prevent extreme scaling', () => {
    const size = calculateBoardCardSize({
      containerWidth: 2000,
      containerHeight: 1000,
      slotCount: 1,
      baseWidth: 120,
      baseHeight: 168,
    });

    expect(size.width).toBeLessThanOrEqual(240);
  });
});
