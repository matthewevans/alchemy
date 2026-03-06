import { describe, it, expect, beforeEach } from 'vitest';
import { validateAction, enumerateLegalActions } from '../validation';
import {
  createTestGameState,
  makeCardInstance,
  makePermanent,
  resetTestCounters,
} from './__fixtures__/testHelpers';
import type { Phase } from '../types';

beforeEach(() => {
  resetTestCounters();
});

// ─── validateAction ───

describe('validateAction', () => {
  // ─── KEEP_HAND ───

  describe('KEEP_HAND', () => {
    it('is valid in mulligan phase for the correct player', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
      });
      const result = validateAction(state, { type: 'KEEP_HAND' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is invalid outside mulligan phase', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(state, { type: 'KEEP_HAND' }, 'player1');
      expect(result.valid).toBe(false);
    });

    it('is invalid for the wrong player', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
      });
      const result = validateAction(state, { type: 'KEEP_HAND' }, 'player2');
      expect(result.valid).toBe(false);
    });
  });

  // ─── MULLIGAN_CARDS ───

  describe('MULLIGAN_CARDS', () => {
    it('is valid in mulligan phase with valid indices', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
        player1: {
          hand: [
            makeCardInstance('fire_ember_sprite'),
            makeCardInstance('fire_flame_fox'),
            makeCardInstance('fire_lava_hound'),
          ],
        },
      });
      const result = validateAction(
        state,
        { type: 'MULLIGAN_CARDS', cardIndices: [0, 2] },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid if already mulliganed', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
        player1: {
          mulliganUsed: true,
          hand: [makeCardInstance('fire_ember_sprite')],
        },
      });
      const result = validateAction(
        state,
        { type: 'MULLIGAN_CARDS', cardIndices: [0] },
        'player1',
      );
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('already');
    });

    it('is invalid with out-of-range card index', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
        player1: {
          hand: [makeCardInstance('fire_ember_sprite')],
        },
      });
      const result = validateAction(
        state,
        { type: 'MULLIGAN_CARDS', cardIndices: [5] },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid outside mulligan phase', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(
        state,
        { type: 'MULLIGAN_CARDS', cardIndices: [0] },
        'player1',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── ADVANCE_PHASE ───

  describe('ADVANCE_PHASE', () => {
    it('is valid in play phase', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is valid in draw phase', () => {
      const state = createTestGameState({ phase: { type: 'draw' } });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is valid in energy phase', () => {
      const state = createTestGameState({ phase: { type: 'energy' } });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is valid in end phase', () => {
      const state = createTestGameState({ phase: { type: 'end' } });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is invalid in mulligan phase', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
      });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result.valid).toBe(false);
    });

    it('is invalid in battle phase', () => {
      const state = createTestGameState({
        phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result.valid).toBe(false);
    });

    it('is invalid in game_over phase', () => {
      const state = createTestGameState({
        phase: { type: 'game_over', winner: 'player1' },
      });
      const result = validateAction(state, { type: 'ADVANCE_PHASE' }, 'player1');
      expect(result.valid).toBe(false);
    });
  });

  // ─── PLAY_CARD ───

  describe('PLAY_CARD', () => {
    it('is valid with enough energy and empty board slot', () => {
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 3,
          maxEnergy: 3,
          hand: [makeCardInstance('fire_magma_golem')], // cost 3
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid with insufficient energy', () => {
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 1,
          maxEnergy: 1,
          hand: [makeCardInstance('fire_magma_golem')], // cost 3
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('energy');
    });

    it('is valid when board has no empty slots (append is allowed)', () => {
      const board = Array(5)
        .fill(null)
        .map(() => makePermanent('fire_ember_sprite', 'player1'));
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 3,
          maxEnergy: 3,
          hand: [makeCardInstance('fire_magma_golem')],
          board,
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid outside play phase', () => {
      const state = createTestGameState({
        phase: { type: 'draw' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 5,
          hand: [makeCardInstance('fire_ember_sprite')],
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid for non-active player', () => {
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player2: {
          currentEnergy: 5,
          hand: [makeCardInstance('fire_ember_sprite')],
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0 },
        'player2',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid with out-of-range card index', () => {
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 5,
          hand: [makeCardInstance('fire_ember_sprite')],
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 3 },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is valid for a spell with targeting', () => {
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 5,
          hand: [makeCardInstance('fire_fireball')], // targeted spell
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is valid for creature when specific target slot is empty', () => {
      const board: (ReturnType<typeof makePermanent> | null)[] = [
        makePermanent('fire_ember_sprite', 'player1'),
        null,
        null,
        null,
        null,
      ];
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 3,
          maxEnergy: 3,
          hand: [makeCardInstance('fire_magma_golem')],
          board,
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0, targetSlot: 1 },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid when specific target slot is occupied', () => {
      const board: (ReturnType<typeof makePermanent> | null)[] = [
        makePermanent('fire_ember_sprite', 'player1'),
        null,
        null,
        null,
        null,
      ];
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 3,
          maxEnergy: 3,
          hand: [makeCardInstance('fire_magma_golem')],
          board,
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0, targetSlot: 0 },
        'player1',
      );
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('occupied');
    });

    it('is valid when target slot equals current board length', () => {
      const board: (ReturnType<typeof makePermanent> | null)[] = [
        makePermanent('fire_ember_sprite', 'player1'),
        makePermanent('fire_flame_fox', 'player1'),
      ];
      const state = createTestGameState({
        phase: { type: 'play' },
        activePlayer: 'player1',
        player1: {
          currentEnergy: 3,
          maxEnergy: 3,
          hand: [makeCardInstance('fire_magma_golem')],
          board,
        },
      });
      const result = validateAction(
        state,
        { type: 'PLAY_CARD', cardIndex: 0, targetSlot: board.length },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });
  });

  describe('combat priority windows', () => {
    const combatPriorityPhase: Phase = {
      type: 'combat_priority',
      window: 'post_attackers',
      confirmedAttackers: ['atk_1'],
      blockers: {},
      attackerBlockerOrder: {},
      priorityPlayer: 'player1',
      passCount: 0,
      stack: [],
    };

    it('allows instant spells in combat priority for the priority player', () => {
      const state = createTestGameState({
        phase: combatPriorityPhase,
        ruleset: { allowCombatTricks: true },
        player1: {
          currentEnergy: 4,
          maxEnergy: 4,
          hand: [makeCardInstance('fire_fireball')],
        },
      });

      const result = validateAction(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('blocks sorcery-speed spells in combat priority', () => {
      const state = createTestGameState({
        phase: combatPriorityPhase,
        ruleset: { allowCombatTricks: true },
        player1: {
          currentEnergy: 5,
          maxEnergy: 5,
          hand: [makeCardInstance('fire_eruption')],
        },
      });

      const result = validateAction(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1');
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('instant');
    });

    it('enforces instant surcharge energy checks in combat priority', () => {
      const state = createTestGameState({
        phase: combatPriorityPhase,
        ruleset: { allowCombatTricks: true },
        player1: {
          currentEnergy: 2,
          maxEnergy: 2,
          hand: [makeCardInstance('fire_fireball')], // 2 base + 1 surcharge
        },
      });

      const result = validateAction(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1');
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('energy');
    });

    it('validates PASS_PRIORITY for the priority player only', () => {
      const state = createTestGameState({
        phase: combatPriorityPhase,
        ruleset: { allowCombatTricks: true },
      });

      expect(validateAction(state, { type: 'PASS_PRIORITY' }, 'player1')).toEqual({ valid: true });
      expect(validateAction(state, { type: 'PASS_PRIORITY' }, 'player2').valid).toBe(false);
    });

    it('enumerates PASS_PRIORITY and instant-only PLAY_CARD actions', () => {
      const state = createTestGameState({
        phase: combatPriorityPhase,
        ruleset: { allowCombatTricks: true },
        player1: {
          currentEnergy: 4,
          maxEnergy: 4,
          hand: [
            makeCardInstance('fire_fireball'), // instant, affordable with surcharge
            makeCardInstance('fire_eruption'), // sorcery
            makeCardInstance('fire_lava_hound'), // creature
          ],
        },
      });

      const actions = enumerateLegalActions(state, 'player1');
      expect(actions).toContainEqual({ type: 'PASS_PRIORITY' });
      expect(actions).toContainEqual({ type: 'PLAY_CARD', cardIndex: 0 });
      expect(actions).not.toContainEqual({ type: 'PLAY_CARD', cardIndex: 1 });
      expect(actions).not.toContainEqual({ type: 'PLAY_CARD', cardIndex: 2 });
    });
  });

  // ─── SELECT_TARGET ───

  describe('SELECT_TARGET', () => {
    it('is valid for a valid target in targeting phase', () => {
      const phase: Phase = {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [{ type: 'creature', permanentId: 'perm_1' }],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: 'perm_1' } },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for a target not in valid targets', () => {
      const phase: Phase = {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [{ type: 'creature', permanentId: 'perm_1' }],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: 'perm_999' } },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid for non-caster player', () => {
      const phase: Phase = {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [{ type: 'creature', permanentId: 'perm_1' }],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: 'perm_1' } },
        'player2',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── CANCEL_TARGETING ───

  describe('CANCEL_TARGETING', () => {
    it('is valid for the caster in targeting phase', () => {
      const phase: Phase = {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(state, { type: 'CANCEL_TARGETING' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for non-caster', () => {
      const phase: Phase = {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(state, { type: 'CANCEL_TARGETING' }, 'player2');
      expect(result.valid).toBe(false);
    });
  });

  // ─── DECLARE_ATTACKER ───

  describe('DECLARE_ATTACKER', () => {
    it('is valid for an untapped, non-summoning-sick creature', () => {
      const perm = makePermanent('fire_lava_hound', 'player1');
      const board: (ReturnType<typeof makePermanent> | null)[] = [perm, null, null, null, null];
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for a tapped creature', () => {
      const perm = makePermanent('fire_lava_hound', 'player1', { isTapped: true });
      const board: (ReturnType<typeof makePermanent> | null)[] = [perm, null, null, null, null];
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player1',
      );
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('Tapped');
    });

    it('is invalid for a summoning-sick creature without swift', () => {
      const perm = makePermanent('fire_lava_hound', 'player1', { summonedThisTurn: true });
      const board: (ReturnType<typeof makePermanent> | null)[] = [perm, null, null, null, null];
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player1',
      );
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('summoning sickness');
    });

    it('is valid for a swift creature summoned this turn', () => {
      // fire_ember_sprite has keywords: ['swift']
      const perm = makePermanent('fire_ember_sprite', 'player1', { summonedThisTurn: true });
      const board: (ReturnType<typeof makePermanent> | null)[] = [perm, null, null, null, null];
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for a creature with cantAttackThisTurn', () => {
      const perm = makePermanent('fire_lava_hound', 'player1', { cantAttackThisTurn: true });
      const board: (ReturnType<typeof makePermanent> | null)[] = [perm, null, null, null, null];
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid for a creature already in tentativeAttackers', () => {
      const perm = makePermanent('fire_lava_hound', 'player1');
      const board: (ReturnType<typeof makePermanent> | null)[] = [perm, null, null, null, null];
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [perm.permanentId],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid for non-active player', () => {
      const perm = makePermanent('fire_lava_hound', 'player2');
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player2: { board: [perm, null, null, null, null] },
      });
      const result = validateAction(
        state,
        { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
        'player2',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── UNDECLARE_ATTACKER ───

  describe('UNDECLARE_ATTACKER', () => {
    it('is valid for a tentative attacker', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: ['perm_1'],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'UNDECLARE_ATTACKER', permanentId: 'perm_1' },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for a non-tentative attacker', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'UNDECLARE_ATTACKER', permanentId: 'perm_1' },
        'player1',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── CONFIRM_ATTACKERS ───

  describe('CONFIRM_ATTACKERS', () => {
    it('is valid in declare_attackers step', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(state, { type: 'CONFIRM_ATTACKERS' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is valid with zero attackers (skip combat)', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      };
      const state = createTestGameState({ phase });
      const result = validateAction(state, { type: 'CONFIRM_ATTACKERS' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is invalid outside declare_attackers step', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(state, { type: 'CONFIRM_ATTACKERS' }, 'player1');
      expect(result.valid).toBe(false);
    });
  });

  // ─── ASSIGN_BLOCKER ───

  describe('ASSIGN_BLOCKER', () => {
    it('is valid for an untapped defender creature against a confirmed attacker', () => {
      const blocker = makePermanent('water_coral_guardian', 'player2');
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1'],
        tentativeBlockers: {},
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player2: { board: [blocker, null, null, null, null] },
      });
      const result = validateAction(
        state,
        {
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: blocker.permanentId,
          attackerPermanentId: 'atk_1',
        },
        'player2',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for a tapped creature', () => {
      const blocker = makePermanent('water_coral_guardian', 'player2', { isTapped: true });
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1'],
        tentativeBlockers: {},
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player2: { board: [blocker, null, null, null, null] },
      });
      const result = validateAction(
        state,
        {
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: blocker.permanentId,
          attackerPermanentId: 'atk_1',
        },
        'player2',
      );
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('Tapped');
    });

    it('is invalid for the attacking player', () => {
      const blocker = makePermanent('fire_lava_hound', 'player1');
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1'],
        tentativeBlockers: {},
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player1: { board: [blocker, null, null, null, null] },
      });
      const result = validateAction(
        state,
        {
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: blocker.permanentId,
          attackerPermanentId: 'atk_1',
        },
        'player1',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid for a creature already assigned as a blocker', () => {
      const blocker = makePermanent('water_coral_guardian', 'player2');
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1', 'atk_2'],
        tentativeBlockers: { [blocker.permanentId]: 'atk_1' },
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player2: { board: [blocker, null, null, null, null] },
      });
      const result = validateAction(
        state,
        {
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: blocker.permanentId,
          attackerPermanentId: 'atk_2',
        },
        'player2',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid when attacker is not confirmed', () => {
      const blocker = makePermanent('water_coral_guardian', 'player2');
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1'],
        tentativeBlockers: {},
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
        player2: { board: [blocker, null, null, null, null] },
      });
      const result = validateAction(
        state,
        {
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: blocker.permanentId,
          attackerPermanentId: 'atk_99',
        },
        'player2',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── REMOVE_BLOCKER ───

  describe('REMOVE_BLOCKER', () => {
    it('is valid for an assigned blocker', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1'],
        tentativeBlockers: { blocker_1: 'atk_1' },
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'REMOVE_BLOCKER', blockerPermanentId: 'blocker_1' },
        'player2',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for a non-assigned blocker', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: ['atk_1'],
        tentativeBlockers: {},
      };
      const state = createTestGameState({ phase });
      const result = validateAction(
        state,
        { type: 'REMOVE_BLOCKER', blockerPermanentId: 'blocker_1' },
        'player2',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── CONFIRM_BLOCKERS ───

  describe('CONFIRM_BLOCKERS', () => {
    it('is valid in declare_blockers step', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [],
        tentativeBlockers: {},
      };
      const state = createTestGameState({ phase });
      const result = validateAction(state, { type: 'CONFIRM_BLOCKERS' }, 'player2');
      expect(result).toEqual({ valid: true });
    });

    it('is invalid outside declare_blockers step', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(state, { type: 'CONFIRM_BLOCKERS' }, 'player2');
      expect(result.valid).toBe(false);
    });
  });

  describe('order blockers actions', () => {
    it('SET_BLOCKER_ORDER is valid for the active attacker in order_blockers', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'order_blockers',
        confirmedAttackers: ['atk_1'],
        blockers: { blk_1: 'atk_1', blk_2: 'atk_1' },
        attackerBlockerOrder: { atk_1: ['blk_1', 'blk_2'] },
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
      });
      const result = validateAction(
        state,
        {
          type: 'SET_BLOCKER_ORDER',
          attackerPermanentId: 'atk_1',
          blockerPermanentIds: ['blk_2', 'blk_1'],
        },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('CONFIRM_BLOCKER_ORDER is invalid for the defending player', () => {
      const phase: Phase = {
        type: 'battle',
        step: 'order_blockers',
        confirmedAttackers: ['atk_1'],
        blockers: { blk_1: 'atk_1', blk_2: 'atk_1' },
        attackerBlockerOrder: { atk_1: ['blk_1', 'blk_2'] },
      };
      const state = createTestGameState({
        phase,
        activePlayer: 'player1',
      });
      const result = validateAction(state, { type: 'CONFIRM_BLOCKER_ORDER' }, 'player2');
      expect(result.valid).toBe(false);
    });
  });

  // ─── DISCARD_CARD ───

  describe('DISCARD_CARD', () => {
    it('is valid in discard phase for the correct player', () => {
      const state = createTestGameState({
        phase: { type: 'discard', player: 'player1', mustDiscard: 1 },
        player1: {
          hand: [makeCardInstance('fire_ember_sprite'), makeCardInstance('fire_flame_fox')],
        },
      });
      const result = validateAction(
        state,
        { type: 'DISCARD_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result).toEqual({ valid: true });
    });

    it('is invalid for the wrong player', () => {
      const state = createTestGameState({
        phase: { type: 'discard', player: 'player1', mustDiscard: 1 },
      });
      const result = validateAction(
        state,
        { type: 'DISCARD_CARD', cardIndex: 0 },
        'player2',
      );
      expect(result.valid).toBe(false);
    });

    it('is invalid outside discard phase', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(
        state,
        { type: 'DISCARD_CARD', cardIndex: 0 },
        'player1',
      );
      expect(result.valid).toBe(false);
    });
  });

  // ─── CONCEDE ───

  describe('CONCEDE', () => {
    it('is valid in play phase', () => {
      const state = createTestGameState({ phase: { type: 'play' } });
      const result = validateAction(state, { type: 'CONCEDE' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is valid in mulligan phase', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
      });
      const result = validateAction(state, { type: 'CONCEDE' }, 'player2');
      expect(result).toEqual({ valid: true });
    });

    it('is valid in battle phase', () => {
      const state = createTestGameState({
        phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      });
      const result = validateAction(state, { type: 'CONCEDE' }, 'player1');
      expect(result).toEqual({ valid: true });
    });

    it('is invalid in game_over phase', () => {
      const state = createTestGameState({
        phase: { type: 'game_over', winner: 'player1' },
      });
      const result = validateAction(state, { type: 'CONCEDE' }, 'player2');
      expect(result.valid).toBe(false);
    });
  });
});

// ─── enumerateLegalActions ───

describe('enumerateLegalActions', () => {
  it('in play phase, returns PLAY_CARD for affordable cards and ADVANCE_PHASE', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player1',
      player1: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [
          makeCardInstance('fire_ember_sprite'), // cost 1
          makeCardInstance('fire_lava_hound'),   // cost 2
          makeCardInstance('fire_magma_golem'),   // cost 3 — too expensive
        ],
      },
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'ADVANCE_PHASE' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });

    // Should have PLAY_CARD for the two affordable cards × 6 empty slots
    const playActions = actions.filter((a) => a.type === 'PLAY_CARD');
    // Ember Sprite (cost 1): 6 slots, Lava Hound (cost 2): 6 slots = 12
    expect(playActions).toHaveLength(12);

    // Should NOT contain the expensive card
    const expensivePlays = playActions.filter(
      (a) => a.type === 'PLAY_CARD' && a.cardIndex === 2,
    );
    expect(expensivePlays).toHaveLength(0);
  });

  it('in play phase with no affordable cards, still returns ADVANCE_PHASE', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player1',
      player1: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [makeCardInstance('fire_magma_golem')], // cost 3
      },
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'ADVANCE_PHASE' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });
    const playActions = actions.filter((a) => a.type === 'PLAY_CARD');
    expect(playActions).toHaveLength(0);
  });

  it('in mulligan phase, returns KEEP_HAND and MULLIGAN_CARDS options', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player1' },
      player1: {
        hand: [
          makeCardInstance('fire_ember_sprite'),
          makeCardInstance('fire_flame_fox'),
        ],
      },
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'KEEP_HAND' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });

    const mulliganActions = actions.filter((a) => a.type === 'MULLIGAN_CARDS');
    // 2 cards = 3 non-empty subsets: [0], [1], [0,1]
    expect(mulliganActions).toHaveLength(3);
  });

  it('in mulligan phase with mulliganUsed, returns only KEEP_HAND', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player1' },
      player1: {
        mulliganUsed: true,
        hand: [makeCardInstance('fire_ember_sprite')],
      },
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'KEEP_HAND' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });
    const mulliganActions = actions.filter((a) => a.type === 'MULLIGAN_CARDS');
    expect(mulliganActions).toHaveLength(0);
  });

  it('in declare_attackers, returns eligible attackers + CONFIRM_ATTACKERS', () => {
    const eligible = makePermanent('fire_lava_hound', 'player1');
    const tapped = makePermanent('fire_flame_fox', 'player1', { isTapped: true });
    const sick = makePermanent('fire_magma_golem', 'player1', { summonedThisTurn: true });
    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [],
    };
    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player1: { board: [eligible, tapped, sick, null, null] },
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'CONFIRM_ATTACKERS' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });

    const attackActions = actions.filter((a) => a.type === 'DECLARE_ATTACKER');
    expect(attackActions).toHaveLength(1);
    expect(attackActions[0]).toEqual({
      type: 'DECLARE_ATTACKER',
      permanentId: eligible.permanentId,
    });
  });

  it('in declare_attackers, returns UNDECLARE_ATTACKER for tentative attackers', () => {
    const perm = makePermanent('fire_lava_hound', 'player1');
    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [perm.permanentId],
    };
    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player1: { board: [perm, null, null, null, null] },
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({
      type: 'UNDECLARE_ATTACKER',
      permanentId: perm.permanentId,
    });
  });

  it('returns only CONCEDE for non-active player in play phase', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player1',
      player2: {
        currentEnergy: 5,
        hand: [makeCardInstance('fire_ember_sprite')],
      },
    });
    const actions = enumerateLegalActions(state, 'player2');

    expect(actions).toEqual([{ type: 'CONCEDE' }]);
  });

  it('in declare_blockers, returns blocker assignments for defender', () => {
    const blocker1 = makePermanent('water_coral_guardian', 'player2');
    const blocker2 = makePermanent('water_storm_turtle', 'player2');
    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: ['atk_1', 'atk_2'],
      tentativeBlockers: {},
    };
    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player2: { board: [blocker1, blocker2, null, null, null] },
    });
    const actions = enumerateLegalActions(state, 'player2');

    expect(actions).toContainEqual({ type: 'CONFIRM_BLOCKERS' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });

    const assignActions = actions.filter((a) => a.type === 'ASSIGN_BLOCKER');
    // 2 blockers × 2 attackers = 4 assignments
    expect(assignActions).toHaveLength(4);
  });

  it('in declare_blockers, returns REMOVE_BLOCKER for assigned blockers', () => {
    const blocker = makePermanent('water_coral_guardian', 'player2');
    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: ['atk_1'],
      tentativeBlockers: { [blocker.permanentId]: 'atk_1' },
    };
    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player2: { board: [blocker, null, null, null, null] },
    });
    const actions = enumerateLegalActions(state, 'player2');

    expect(actions).toContainEqual({
      type: 'REMOVE_BLOCKER',
      blockerPermanentId: blocker.permanentId,
    });

    // Blocker is already assigned, so no ASSIGN_BLOCKER for it
    const assignActions = actions.filter((a) => a.type === 'ASSIGN_BLOCKER');
    expect(assignActions).toHaveLength(0);
  });

  it('in order_blockers, returns confirm + reorder actions for active attacker', () => {
    const phase: Phase = {
      type: 'battle',
      step: 'order_blockers',
      confirmedAttackers: ['atk_1'],
      blockers: { blk_1: 'atk_1', blk_2: 'atk_1' },
      attackerBlockerOrder: { atk_1: ['blk_1', 'blk_2'] },
    };
    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
    });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'CONFIRM_BLOCKER_ORDER' });
    expect(actions).toContainEqual({
      type: 'SET_BLOCKER_ORDER',
      attackerPermanentId: 'atk_1',
      blockerPermanentIds: ['blk_2', 'blk_1'],
    });
  });

  it('in discard phase, returns DISCARD_CARD for each card in hand', () => {
    const state = createTestGameState({
      phase: { type: 'discard', player: 'player1', mustDiscard: 1 },
      player1: {
        hand: [
          makeCardInstance('fire_ember_sprite'),
          makeCardInstance('fire_flame_fox'),
          makeCardInstance('fire_lava_hound'),
        ],
      },
    });
    const actions = enumerateLegalActions(state, 'player1');

    const discardActions = actions.filter((a) => a.type === 'DISCARD_CARD');
    expect(discardActions).toHaveLength(3);
    expect(discardActions).toContainEqual({ type: 'DISCARD_CARD', cardIndex: 0 });
    expect(discardActions).toContainEqual({ type: 'DISCARD_CARD', cardIndex: 1 });
    expect(discardActions).toContainEqual({ type: 'DISCARD_CARD', cardIndex: 2 });
  });

  it('returns empty array in game_over phase', () => {
    const state = createTestGameState({
      phase: { type: 'game_over', winner: 'player1' },
    });
    const actions = enumerateLegalActions(state, 'player1');
    expect(actions).toHaveLength(0);
  });

  it('in targeting phase, returns SELECT_TARGET and CANCEL_TARGETING for caster', () => {
    const phase: Phase = {
      type: 'targeting',
      effectId: 'fireball',
      casterId: 'player1',
      sourceCardId: 'fire_fireball',
      validTargets: [
        { type: 'creature', permanentId: 'perm_1' },
        { type: 'creature', permanentId: 'perm_2' },
      ],
    };
    const state = createTestGameState({ phase });
    const actions = enumerateLegalActions(state, 'player1');

    expect(actions).toContainEqual({ type: 'CANCEL_TARGETING' });
    expect(actions).toContainEqual({ type: 'CONCEDE' });

    const selectActions = actions.filter((a) => a.type === 'SELECT_TARGET');
    expect(selectActions).toHaveLength(2);
  });

  it('in targeting phase, non-caster gets only CONCEDE', () => {
    const phase: Phase = {
      type: 'targeting',
      effectId: 'fireball',
      casterId: 'player1',
      sourceCardId: 'fire_fireball',
      validTargets: [{ type: 'creature', permanentId: 'perm_1' }],
    };
    const state = createTestGameState({ phase });
    const actions = enumerateLegalActions(state, 'player2');

    expect(actions).toEqual([{ type: 'CONCEDE' }]);
  });

  it('play phase enumerates spells without targetSlot', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player1',
      player1: {
        currentEnergy: 5,
        maxEnergy: 5,
        hand: [makeCardInstance('fire_fireball')], // spell, cost 2
      },
    });
    const actions = enumerateLegalActions(state, 'player1');
    const playActions = actions.filter((a) => a.type === 'PLAY_CARD');

    // Spell should have exactly 1 action (no slot variants)
    expect(playActions).toHaveLength(1);
    expect(playActions[0]).toEqual({ type: 'PLAY_CARD', cardIndex: 0 });
  });

  it('play phase includes append slot for creatures when no empty slot exists', () => {
    const board = [
      makePermanent('fire_ember_sprite', 'player1'),
      makePermanent('fire_flame_fox', 'player1'),
    ];
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player1',
      player1: {
        currentEnergy: 5,
        maxEnergy: 5,
        hand: [makeCardInstance('fire_magma_golem')],
        board,
      },
    });

    const actions = enumerateLegalActions(state, 'player1');
    expect(actions).toContainEqual({
      type: 'PLAY_CARD',
      cardIndex: 0,
      targetSlot: board.length,
    });
  });
});
