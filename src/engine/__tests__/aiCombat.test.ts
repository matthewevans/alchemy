import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCombatDamage,
  estimateDamageToCreature,
  canKillInCombat,
  evaluateSingleBlockOutcome,
  resolveAttackerPermanents,
} from '../aiCombat';
import {
  createTestGameState,
  makePermanent,
  resetTestCounters,
} from './__fixtures__/testHelpers';

beforeEach(() => {
  resetTestCounters();
});

// ─── getCombatDamage ───

describe('getCombatDamage', () => {
  it('returns base attack for a normal creature', () => {
    const creature = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    expect(getCombatDamage(creature)).toBe(3);
  });

  it('doubles damage for a fury creature', () => {
    // fire_fury_hound has keyword 'fury'
    const creature = makePermanent('fire_fury_hound', 'player1', {
      attack: 2,
      health: 3,
    });
    expect(getCombatDamage(creature)).toBe(4);
  });

  it('returns 0 for a 0-attack creature', () => {
    const creature = makePermanent('water_shell_crab', 'player1', {
      attack: 0,
      health: 4,
    });
    expect(getCombatDamage(creature)).toBe(0);
  });

  it('accounts for temporary attack bonus', () => {
    const creature = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
      temporaryAttackBonus: 2,
    });
    expect(getCombatDamage(creature)).toBe(5);
  });
});

// ─── estimateDamageToCreature ───

describe('estimateDamageToCreature', () => {
  it('returns raw damage for a normal creature', () => {
    const creature = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    expect(estimateDamageToCreature(creature, 3)).toBe(3);
  });

  it('reduces damage by 1 for armor (minimum 0)', () => {
    // fire_forge_guardian has keyword 'armor'
    const creature = makePermanent('fire_forge_guardian', 'player1', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });
    expect(estimateDamageToCreature(creature, 3)).toBe(2);
  });

  it('clamps armor reduction to 0', () => {
    const creature = makePermanent('fire_forge_guardian', 'player1', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });
    expect(estimateDamageToCreature(creature, 1)).toBe(0);
  });

  it('does not reduce when armor already used this turn', () => {
    const creature = makePermanent('fire_forge_guardian', 'player1', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: true,
    });
    expect(estimateDamageToCreature(creature, 3)).toBe(3);
  });

  it('returns 0 for 0 raw damage', () => {
    const creature = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    expect(estimateDamageToCreature(creature, 0)).toBe(0);
  });
});

// ─── canKillInCombat ───

describe('canKillInCombat', () => {
  it('returns true when attacker damage >= defender health', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    const defender = makePermanent('fire_ember_sprite', 'player2', {
      attack: 1,
      health: 2,
      damage: 0,
    });
    expect(canKillInCombat(attacker, defender)).toBe(true);
  });

  it('returns false when attacker damage < defender health', () => {
    const attacker = makePermanent('fire_ember_sprite', 'player1', {
      attack: 1,
      health: 2,
    });
    const defender = makePermanent('fire_magma_golem', 'player2', {
      attack: 3,
      health: 4,
      damage: 0,
    });
    expect(canKillInCombat(attacker, defender)).toBe(false);
  });

  it('returns true with deathtouch regardless of damage', () => {
    // fire_cinder_viper has keyword 'deathtouch'
    const attacker = makePermanent('fire_cinder_viper', 'player1', {
      attack: 1,
      health: 1,
    });
    const defender = makePermanent('earth_mountain_giant', 'player2', {
      attack: 4,
      health: 6,
      damage: 0,
    });
    expect(canKillInCombat(attacker, defender)).toBe(true);
  });

  it('accounts for existing damage on defender', () => {
    const attacker = makePermanent('fire_ember_sprite', 'player1', {
      attack: 1,
      health: 2,
    });
    const defender = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 3,
      damage: 2,
    });
    // defender current health = 3 - 2 = 1, attacker damage = 1
    expect(canKillInCombat(attacker, defender)).toBe(true);
  });
});

// ─── evaluateSingleBlockOutcome ───

describe('evaluateSingleBlockOutcome', () => {
  it('returns positive score for favorable trade (blocker dies, attacker survives)', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 5,
      damage: 0,
    });
    const blocker = makePermanent('fire_ember_sprite', 'player2', {
      attack: 1,
      health: 2,
      damage: 0,
    });
    // attacker deals 3 to blocker (health 2, dies), blocker deals 1 to attacker (health 5, survives)
    const score = evaluateSingleBlockOutcome(attacker, blocker);
    expect(score).toBeGreaterThan(0);
  });

  it('returns negative score for unfavorable trade (attacker dies, blocker survives)', () => {
    const attacker = makePermanent('fire_ember_sprite', 'player1', {
      attack: 1,
      health: 2,
      damage: 0,
    });
    const blocker = makePermanent('earth_mountain_giant', 'player2', {
      attack: 4,
      health: 6,
      damage: 0,
    });
    // attacker deals 1 to blocker (health 6, survives), blocker deals 4 to attacker (health 2, dies)
    const score = evaluateSingleBlockOutcome(attacker, blocker);
    expect(score).toBeLessThan(0);
  });

  it('returns -25 for mutual kill', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 3,
      damage: 0,
    });
    const blocker = makePermanent('fire_magma_golem', 'player2', {
      attack: 3,
      health: 3,
      damage: 0,
    });
    expect(evaluateSingleBlockOutcome(attacker, blocker)).toBe(-25);
  });

  it('returns -5 when neither dies', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 1,
      health: 5,
      damage: 0,
    });
    const blocker = makePermanent('fire_magma_golem', 'player2', {
      attack: 1,
      health: 5,
      damage: 0,
    });
    expect(evaluateSingleBlockOutcome(attacker, blocker)).toBe(-5);
  });
});

// ─── resolveAttackerPermanents ───

describe('resolveAttackerPermanents', () => {
  it('maps permanentIds to Permanents from the board', () => {
    const creature1 = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    const creature2 = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
    });

    const state = createTestGameState({
      player1: {
        board: [creature1, creature2, null, null, null],
      },
    });

    const result = resolveAttackerPermanents(
      state,
      [creature1.permanentId, creature2.permanentId],
      'player1',
    );
    expect(result).toHaveLength(2);
    expect(result[0].permanentId).toBe(creature1.permanentId);
    expect(result[1].permanentId).toBe(creature2.permanentId);
  });

  it('filters out missing permanentIds', () => {
    const creature = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });

    const state = createTestGameState({
      player1: {
        board: [creature, null, null, null, null],
      },
    });

    const result = resolveAttackerPermanents(
      state,
      [creature.permanentId, 'nonexistent_id'],
      'player1',
    );
    expect(result).toHaveLength(1);
    expect(result[0].permanentId).toBe(creature.permanentId);
  });
});
