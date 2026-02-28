import { describe, it, expect } from 'vitest';
import { getOpponent, getCurrentHealth, getEffectiveAttack } from '../types';
import type { Permanent } from '../types';

describe('getOpponent', () => {
  it('returns player2 for player1', () => {
    expect(getOpponent('player1')).toBe('player2');
  });

  it('returns player1 for player2', () => {
    expect(getOpponent('player2')).toBe('player1');
  });
});

function makePermanent(overrides: Partial<Permanent> = {}): Permanent {
  return {
    permanentId: 'p1',
    cardId: 'c1',
    ownerId: 'player1',
    attack: 3,
    health: 5,
    damage: 0,
    isTapped: false,
    summonedThisTurn: false,
    temporaryAttackBonus: 0,
    temporaryHealthBonus: 0,
    cantAttackThisTurn: false,
    armorUsedThisTurn: false,
    ...overrides,
  };
}

describe('getCurrentHealth', () => {
  it('returns base health when undamaged', () => {
    expect(getCurrentHealth(makePermanent())).toBe(5);
  });

  it('subtracts damage from health', () => {
    expect(getCurrentHealth(makePermanent({ damage: 2 }))).toBe(3);
  });

  it('includes temporary health bonus', () => {
    expect(getCurrentHealth(makePermanent({ temporaryHealthBonus: 3 }))).toBe(8);
  });

  it('combines damage and bonus correctly', () => {
    const p = makePermanent({ health: 4, damage: 3, temporaryHealthBonus: 2 });
    expect(getCurrentHealth(p)).toBe(3); // 4 + 2 - 3
  });
});

describe('getEffectiveAttack', () => {
  it('returns base attack with no bonus', () => {
    expect(getEffectiveAttack(makePermanent())).toBe(3);
  });

  it('adds temporary attack bonus', () => {
    expect(getEffectiveAttack(makePermanent({ temporaryAttackBonus: 2 }))).toBe(5);
  });
});
