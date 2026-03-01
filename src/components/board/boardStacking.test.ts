import { describe, it, expect, beforeEach } from 'vitest';
import { makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { groupIntoStacks } from './boardStacking';

beforeEach(() => {
  resetTestCounters();
});

describe('groupIntoStacks', () => {
  it('returns empty array for empty board', () => {
    expect(groupIntoStacks([])).toEqual([]);
  });

  it('preserves null slots', () => {
    const result = groupIntoStacks([null, null]);
    expect(result).toEqual([null, null]);
  });

  it('does not stack a single permanent', () => {
    const p = makePermanent('fire_ember_sprite', 'player1');
    const result = groupIntoStacks([p]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cardId: 'fire_ember_sprite',
      permanents: [p],
      slotIndices: [0],
    });
  });

  it('stacks two identical permanents', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1');
    const p2 = makePermanent('fire_ember_sprite', 'player1');
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(1);
    expect(result[0]!.permanents).toEqual([p1, p2]);
    expect(result[0]!.slotIndices).toEqual([0, 1]);
  });

  it('stacks non-adjacent identical permanents', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1');
    const pOther = makePermanent('water_splash', 'player1');
    const p2 = makePermanent('fire_ember_sprite', 'player1');

    const result = groupIntoStacks([p1, pOther, p2]);

    expect(result).toHaveLength(2);
    // First stack: both fire_ember_sprites
    expect(result[0]!.cardId).toBe('fire_ember_sprite');
    expect(result[0]!.permanents).toEqual([p1, p2]);
    expect(result[0]!.slotIndices).toEqual([0, 2]);
    // Second entry: the other card
    expect(result[1]!.cardId).toBe('water_splash');
    expect(result[1]!.permanents).toEqual([pOther]);
  });

  it('does not stack permanents with different cardIds', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1');
    const p2 = makePermanent('water_splash', 'player1');
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(2);
    expect(result[0]!.permanents).toEqual([p1]);
    expect(result[1]!.permanents).toEqual([p2]);
  });

  it('does not stack same cardId with different tapped state', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1', { isTapped: false });
    const p2 = makePermanent('fire_ember_sprite', 'player1', { isTapped: true });
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(2);
    expect(result[0]!.permanents).toEqual([p1]);
    expect(result[1]!.permanents).toEqual([p2]);
  });

  it('does not stack same cardId with different damage', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1', { damage: 0 });
    const p2 = makePermanent('fire_ember_sprite', 'player1', { damage: 1 });
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(2);
  });

  it('does not stack when summoning sickness differs', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1', { summonedThisTurn: false });
    const p2 = makePermanent('fire_ember_sprite', 'player1', { summonedThisTurn: true });
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(2);
  });

  it('does not stack when attack bonus differs', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1', { temporaryAttackBonus: 0 });
    const p2 = makePermanent('fire_ember_sprite', 'player1', { temporaryAttackBonus: 2 });
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(2);
  });

  it('does not stack when cantAttackThisTurn differs', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1', { cantAttackThisTurn: false });
    const p2 = makePermanent('fire_ember_sprite', 'player1', { cantAttackThisTurn: true });
    const result = groupIntoStacks([p1, p2]);

    expect(result).toHaveLength(2);
  });

  it('handles mixed nulls and permanents', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1');
    const p2 = makePermanent('fire_ember_sprite', 'player1');
    const result = groupIntoStacks([null, p1, null, p2, null]);

    expect(result).toHaveLength(4); // null, stack(p1+p2), null, null
    expect(result[0]).toBeNull();
    expect(result[1]!.permanents).toEqual([p1, p2]);
    expect(result[1]!.slotIndices).toEqual([1, 3]);
    expect(result[2]).toBeNull();
    expect(result[3]).toBeNull();
  });

  it('stacks three identical permanents', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1');
    const p2 = makePermanent('fire_ember_sprite', 'player1');
    const p3 = makePermanent('fire_ember_sprite', 'player1');
    const result = groupIntoStacks([p1, p2, p3]);

    expect(result).toHaveLength(1);
    expect(result[0]!.permanents).toHaveLength(3);
    expect(result[0]!.slotIndices).toEqual([0, 1, 2]);
  });

  it('stateKey is deterministic for identical visual state', () => {
    const p1 = makePermanent('fire_ember_sprite', 'player1');
    const p2 = makePermanent('fire_ember_sprite', 'player1');
    const result = groupIntoStacks([p1, p2]);

    expect(result[0]!.stateKey).toBeTruthy();
    // Both should be in the same stack (same stateKey)
    expect(result).toHaveLength(1);
  });
});
