import { describe, it, expect, beforeEach } from 'vitest';
import { reduce } from '../reducer';
import { enumerateLegalActions } from '../validation';
import { createTestGameState, makeCardInstance, makePermanent, resetTestCounters } from './__fixtures__/testHelpers';
import { createRNG } from '../prng';
import type { Phase, RNG } from '../types';

let rng: RNG;

beforeEach(() => {
  resetTestCounters();
  rng = createRNG(42);
});

// ─── Mulligan Flow ───

describe('KEEP_HAND', () => {
  it('transitions from player1 mulligan to player2 mulligan', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player1' },
      turn: 0,
    });

    const { newState } = reduce(state, { type: 'KEEP_HAND' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'mulligan', player: 'player2' });
    expect(newState.players.player1.mulliganUsed).toBe(true);
  });

  it('transitions from player2 mulligan to turn 1 draw phase', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player2' },
      turn: 0,
      player1: { mulliganUsed: true },
    });

    const { newState, events } = reduce(state, { type: 'KEEP_HAND' }, 'player2', rng);

    expect(newState.phase).toEqual({ type: 'draw' });
    expect(newState.turn).toBe(1);
    expect(newState.players.player2.mulliganUsed).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({ type: 'TURN_STARTED', turn: 1 }));
  });

  it('throws when wrong player tries to keep hand', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player1' },
    });

    expect(() => reduce(state, { type: 'KEEP_HAND' }, 'player2', rng)).toThrow();
  });
});

describe('MULLIGAN_CARDS', () => {
  it('replaces selected cards and keeps hand size', () => {
    const hand = [
      makeCardInstance('fire_ember_sprite'),
      makeCardInstance('fire_flame_fox'),
      makeCardInstance('fire_lava_hound'),
      makeCardInstance('fire_magma_golem'),
    ];
    const deck = [
      makeCardInstance('water_tide_sprite'),
      makeCardInstance('water_shell_crab'),
    ];

    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player1' },
      turn: 0,
      player1: { hand, deck },
    });

    const { newState } = reduce(
      state,
      { type: 'MULLIGAN_CARDS', cardIndices: [0, 1] },
      'player1',
      rng,
    );

    expect(newState.players.player1.hand).toHaveLength(4);
    expect(newState.players.player1.mulliganUsed).toBe(true);
    // Original cards at indices 2 and 3 should be kept
    expect(newState.players.player1.hand).toContainEqual(hand[2]);
    expect(newState.players.player1.hand).toContainEqual(hand[3]);
  });
});

// ─── Draw Phase ───

describe('ADVANCE_PHASE from draw', () => {
  it('draws a card on turn > 1', () => {
    const deckCard = makeCardInstance('fire_ember_sprite');
    const state = createTestGameState({
      phase: { type: 'draw' },
      turn: 2,
      player1: {
        deck: [deckCard],
        maxEnergy: 1,
        currentEnergy: 1,
      },
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'energy' });
    expect(newState.players.player1.hand).toContainEqual(deckCard);
    expect(newState.players.player1.deck).toHaveLength(0);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'CARD_DRAWN',
      player: 'player1',
    }));
  });

  it('skips draw on turn 1', () => {
    const deckCard = makeCardInstance('fire_ember_sprite');
    const state = createTestGameState({
      phase: { type: 'draw' },
      turn: 1,
      player1: { deck: [deckCard] },
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'energy' });
    expect(newState.players.player1.hand).toHaveLength(0);
    expect(newState.players.player1.deck).toHaveLength(1);
    expect(events.filter((e) => e.type === 'CARD_DRAWN')).toHaveLength(0);
  });

  it('applies fatigue damage when deck is empty', () => {
    const state = createTestGameState({
      phase: { type: 'draw' },
      turn: 2,
      player1: { deck: [], health: 20, fatigueDamage: 0 },
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.players.player1.fatigueDamage).toBe(1);
    expect(newState.players.player1.health).toBe(19);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'FATIGUE_DAMAGE',
      player: 'player1',
      amount: 1,
    }));
  });

  it('escalates fatigue damage each time', () => {
    const state = createTestGameState({
      phase: { type: 'draw' },
      turn: 5,
      player1: { deck: [], health: 20, fatigueDamage: 2 },
    });

    const { newState } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.players.player1.fatigueDamage).toBe(3);
    expect(newState.players.player1.health).toBe(17);
  });

  it('triggers game over when fatigue kills player', () => {
    const state = createTestGameState({
      phase: { type: 'draw' },
      turn: 5,
      player1: { deck: [], health: 1, fatigueDamage: 0 },
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'game_over', winner: 'player2' });
    expect(events).toContainEqual(expect.objectContaining({ type: 'GAME_OVER', winner: 'player2' }));
  });
});

// ─── Energy Phase ───

describe('ADVANCE_PHASE from energy', () => {
  it('increases maxEnergy and refills', () => {
    const state = createTestGameState({
      phase: { type: 'energy' },
      turn: 1,
      player1: { maxEnergy: 0, currentEnergy: 0 },
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'play' });
    expect(newState.players.player1.maxEnergy).toBe(1);
    expect(newState.players.player1.currentEnergy).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'ENERGY_GAINED',
      newMax: 1,
    }));
  });

  it('caps energy at energyCap', () => {
    const state = createTestGameState({
      phase: { type: 'energy' },
      turn: 6,
      player1: { maxEnergy: 5, currentEnergy: 2 },
      ruleset: { energyCap: 5 },
    });

    const { newState } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.players.player1.maxEnergy).toBe(5);
    expect(newState.players.player1.currentEnergy).toBe(5);
  });
});

// ─── Play Creature ───

describe('PLAY_CARD (creature)', () => {
  it('places creature on board and deducts energy', () => {
    const card = makeCardInstance('fire_lava_hound');
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player1.hand).toHaveLength(0);
    expect(newState.players.player1.currentEnergy).toBe(1); // 3 - 2 cost
    const placed = newState.players.player1.board.find((p) => p !== null);
    expect(placed).toBeTruthy();
    expect(placed!.cardId).toBe('fire_lava_hound');
    expect(placed!.attack).toBe(2);
    expect(placed!.health).toBe(3);
    expect(placed!.summonedThisTurn).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({ type: 'CARD_PLAYED' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'CREATURE_ENTERED' }));
  });

  it('uses targetSlot when specified', () => {
    const card = makeCardInstance('fire_ember_sprite');
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 2,
        maxEnergy: 2,
      },
    });

    const { newState } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0, targetSlot: 3 },
      'player1',
      rng,
    );

    expect(newState.players.player1.board[3]).toBeTruthy();
    expect(newState.players.player1.board[3]!.cardId).toBe('fire_ember_sprite');
  });

  it('can append a creature when board has no empty slots', () => {
    const card = makeCardInstance('fire_ember_sprite');
    const filledBoard = [
      makePermanent('fire_flame_fox', 'player1', { attack: 2, health: 1 }),
      makePermanent('fire_lava_hound', 'player1', { attack: 2, health: 3 }),
    ];
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 2,
        maxEnergy: 2,
        board: filledBoard,
      },
    });

    const { newState } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0, targetSlot: filledBoard.length },
      'player1',
      rng,
    );

    expect(newState.players.player1.board).toHaveLength(3);
    expect(newState.players.player1.board[2]?.cardId).toBe('fire_ember_sprite');
  });
});

// ─── ETB Keywords ───

describe('PLAY_CARD with blast keyword', () => {
  it('deals 1 damage to all enemy creatures', () => {
    const card = makeCardInstance('fire_fire_dancer'); // blast, cost 2
    const enemyPerm = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 3,
    });

    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
      },
      player2: {
        board: [enemyPerm, null, null, null, null],
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    const enemy = newState.players.player2.board[0];
    expect(enemy).toBeTruthy();
    expect(enemy!.damage).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'KEYWORD_TRIGGERED',
      keyword: 'blast',
    }));
  });

  it('kills enemy creature with 1 health', () => {
    const card = makeCardInstance('fire_fire_dancer');
    const enemyPerm = makePermanent('fire_flame_fox', 'player2', {
      attack: 2,
      health: 1,
    });

    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
      },
      player2: {
        board: [enemyPerm, null, null, null, null],
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player2.board[0]).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: 'CREATURE_DIED' }));
  });
});

describe('PLAY_CARD with heal keyword', () => {
  it('heals owner hero for 2', () => {
    const card = makeCardInstance('earth_mushroom_guard'); // heal, cost 2
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
        health: 15,
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player1.health).toBe(17);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'KEYWORD_TRIGGERED',
      keyword: 'heal',
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'PLAYER_HEALED',
      amount: 2,
    }));
  });

  it('can heal above starting health', () => {
    const card = makeCardInstance('earth_mushroom_guard');
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
        health: 20,
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player1.health).toBe(22);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'PLAYER_HEALED',
      amount: 2,
    }));
  });
});

describe('Heal effects can exceed starting health', () => {
  it('spell healing is not capped at 20', () => {
    const card = makeCardInstance('water_healing_rain');
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
        health: 20,
      },
    });

    const { newState } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player1.health).toBe(24);
  });

  it('lifesteal can heal above starting health', () => {
    const lifestealAttacker = makePermanent('shadow_vampire_lord', 'player1', {
      attack: 4,
      health: 3,
    });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [lifestealAttacker.permanentId],
        tentativeBlockers: {},
      },
      player1: {
        board: [{ ...lifestealAttacker, isTapped: true }, null, null, null, null],
        health: 20,
      },
      player2: {
        health: 20,
      },
    });

    const { newState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    expect(newState.players.player1.health).toBe(24);
  });
});

describe('PLAY_CARD with draw keyword', () => {
  it('draws 1 card', () => {
    const card = makeCardInstance('water_tide_sprite'); // draw, cost 1
    const deckCard = makeCardInstance('fire_ember_sprite');
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        deck: [deckCard],
        currentEnergy: 2,
        maxEnergy: 2,
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player1.hand).toHaveLength(1);
    expect(newState.players.player1.hand[0]).toEqual(deckCard);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'KEYWORD_TRIGGERED',
      keyword: 'draw',
    }));
  });
});

// ─── Play Spell ───

describe('PLAY_CARD (untargeted spell)', () => {
  it('resolves immediately and goes to discard', () => {
    const card = makeCardInstance('water_splash'); // draw 2, no targeting
    const deckCards = [
      makeCardInstance('fire_ember_sprite'),
      makeCardInstance('fire_flame_fox'),
    ];
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        deck: deckCards,
        currentEnergy: 2,
        maxEnergy: 2,
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.phase).toEqual({ type: 'play' });
    expect(newState.players.player1.hand).toHaveLength(2);
    expect(newState.players.player1.discard).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'SPELL_RESOLVED' }));
  });
});

describe('PLAY_CARD (targeted spell)', () => {
  it('transitions to targeting phase', () => {
    const card = makeCardInstance('fire_fireball'); // targeted, cost 2
    const enemyPerm = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 3,
    });

    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
      },
      player2: {
        board: [enemyPerm, null, null, null, null],
      },
    });

    const { newState } = reduce(
      state,
      { type: 'PLAY_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.phase.type).toBe('targeting');
    if (newState.phase.type === 'targeting') {
      expect(newState.phase.effectId).toBe('fireball');
      expect(newState.phase.casterId).toBe('player1');
      expect(newState.phase.validTargets).toHaveLength(1);
    }
    expect(newState.players.player1.hand).toHaveLength(0);
    expect(newState.players.player1.currentEnergy).toBe(1);
  });
});

// ─── Select Target ───

describe('SELECT_TARGET', () => {
  it('resolves spell effect and returns to play phase', () => {
    const enemyPerm = makePermanent('earth_mountain_giant', 'player2', {
      attack: 4,
      health: 6,
    });

    const state = createTestGameState({
      phase: {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [{ type: 'creature', permanentId: enemyPerm.permanentId }],
      },
      player2: {
        board: [enemyPerm, null, null, null, null],
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: enemyPerm.permanentId } },
      'player1',
      rng,
    );

    expect(newState.phase).toEqual({ type: 'play' });
    const enemy = newState.players.player2.board[0];
    expect(enemy).toBeTruthy();
    expect(enemy!.damage).toBe(3); // fireball deals 3, creature survives with 6 health
    expect(events).toContainEqual(expect.objectContaining({ type: 'SPELL_RESOLVED' }));
  });

  it('kills creature when damage exceeds health', () => {
    const enemyPerm = makePermanent('fire_flame_fox', 'player2', {
      attack: 2,
      health: 1,
    });

    const state = createTestGameState({
      phase: {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [{ type: 'creature', permanentId: enemyPerm.permanentId }],
      },
      player2: {
        board: [enemyPerm, null, null, null, null],
      },
    });

    const { newState, events } = reduce(
      state,
      { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: enemyPerm.permanentId } },
      'player1',
      rng,
    );

    expect(newState.players.player2.board[0]).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: 'CREATURE_DIED' }));
  });

  it('entangle prevents attacking on the target creature next turn only', () => {
    const enemyPerm = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 3,
    });

    const state = createTestGameState({
      turn: 3,
      activePlayer: 'player1',
      phase: {
        type: 'targeting',
        effectId: 'entangle',
        casterId: 'player1',
        sourceCardId: 'earth_entangle',
        validTargets: [{ type: 'creature', permanentId: enemyPerm.permanentId }],
      },
      player2: {
        board: [enemyPerm, null, null, null, null],
      },
    });

    const { newState: afterEntangle } = reduce(
      state,
      { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: enemyPerm.permanentId } },
      'player1',
      rng,
    );
    expect(afterEntangle.players.player2.board[0]?.cantAttackThisTurn).toBe(true);

    const { newState: p1Battle } = reduce(afterEntangle, { type: 'ADVANCE_PHASE' }, 'player1', rng);
    const { newState: p1PostCombat } = reduce(p1Battle, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    const { newState: p1End } = reduce(p1PostCombat, { type: 'ADVANCE_PHASE' }, 'player1', rng);
    const { newState: p2Draw } = reduce(p1End, { type: 'ADVANCE_PHASE' }, 'player1', rng);
    const { newState: p2Energy } = reduce(p2Draw, { type: 'ADVANCE_PHASE' }, 'player2', rng);
    const { newState: p2Play } = reduce(p2Energy, { type: 'ADVANCE_PHASE' }, 'player2', rng);
    const { newState: p2Battle } = reduce(p2Play, { type: 'ADVANCE_PHASE' }, 'player2', rng);

    expect(() => reduce(
      p2Battle,
      { type: 'DECLARE_ATTACKER', permanentId: enemyPerm.permanentId },
      'player2',
      rng,
    )).toThrow();

    const { newState: p2PostCombat } = reduce(p2Battle, { type: 'CONFIRM_ATTACKERS' }, 'player2', rng);
    const { newState: p2End } = reduce(p2PostCombat, { type: 'ADVANCE_PHASE' }, 'player2', rng);
    const { newState: nextTurn } = reduce(p2End, { type: 'ADVANCE_PHASE' }, 'player2', rng);
    expect(nextTurn.players.player2.board[0]?.cantAttackThisTurn).toBe(false);
  });
});

// ─── Cancel Targeting ───

describe('CANCEL_TARGETING', () => {
  it('returns card to hand and refunds energy', () => {
    const state = createTestGameState({
      phase: {
        type: 'targeting',
        effectId: 'fireball',
        casterId: 'player1',
        sourceCardId: 'fire_fireball',
        validTargets: [],
      },
      player1: {
        hand: [],
        currentEnergy: 1,
        maxEnergy: 3,
      },
    });

    const { newState } = reduce(state, { type: 'CANCEL_TARGETING' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'play' });
    expect(newState.players.player1.hand).toHaveLength(1);
    expect(newState.players.player1.hand[0].cardId).toBe('fire_fireball');
    expect(newState.players.player1.currentEnergy).toBe(3); // 1 + 2 cost
  });
});

// ─── Battle Phase ───

describe('ADVANCE_PHASE from play', () => {
  it('transitions to battle declare_attackers', () => {
    const state = createTestGameState({ phase: { type: 'play' } });

    const { newState } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.phase).toEqual({
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [],
    });
  });
});

describe('DECLARE_ATTACKER / UNDECLARE_ATTACKER', () => {
  it('adds and removes attackers from tentative list', () => {
    const perm = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
    });

    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      player1: {
        board: [perm, null, null, null, null],
      },
    });

    const { newState: s1 } = reduce(
      state,
      { type: 'DECLARE_ATTACKER', permanentId: perm.permanentId },
      'player1',
      rng,
    );

    expect((s1.phase as Extract<Phase, { step: 'declare_attackers' }>).tentativeAttackers)
      .toContain(perm.permanentId);

    const { newState: s2 } = reduce(
      s1,
      { type: 'UNDECLARE_ATTACKER', permanentId: perm.permanentId },
      'player1',
      rng,
    );

    expect((s2.phase as Extract<Phase, { step: 'declare_attackers' }>).tentativeAttackers)
      .not.toContain(perm.permanentId);
  });
});

// ─── Combat: Skip (no attackers) ───

describe('CONFIRM_ATTACKERS with no attackers', () => {
  it('skips combat and goes to end-of-turn', () => {
    const state = createTestGameState({
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
    });

    const { newState } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'play', postCombat: true });
  });
});

// ─── Combat: Unblocked ───

describe('Combat - unblocked attacker', () => {
  it('damages defending player when no blockers available (auto-skips blockers)', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: {
        board: [attacker, null, null, null, null],
      },
      player2: { health: 20 },
    });

    // Confirm attackers — blockers auto-skipped (no defender creatures)
    const { newState, events } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);

    expect(newState.players.player2.health).toBe(18); // 20 - 2
    expect(newState.phase).toEqual({ type: 'play', postCombat: true });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'PLAYER_DAMAGED',
      player: 'player2',
      amount: 2,
    }));
  });

  it('damages defending player when blockers decline to block', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
    });
    const defender = makePermanent('water_tidal_sprite', 'player2', {
      attack: 1,
      health: 2,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: {
        board: [attacker, null, null, null, null],
      },
      player2: { health: 20, board: [defender, null, null, null, null] },
    });

    // Confirm attackers — goes to declare_blockers since defender has creatures
    const { newState: s1 } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    expect(s1.phase.type).toBe('battle');

    // Confirm blockers (none assigned)
    const { newState: s2, events } = reduce(s1, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(s2.players.player2.health).toBe(18); // 20 - 2
    expect(s2.phase).toEqual({ type: 'play', postCombat: true });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'PLAYER_DAMAGED',
      player: 'player2',
      amount: 2,
    }));
  });
});

// ─── Combat: Blocked ───

describe('Combat - blocked attacker', () => {
  it('creatures trade damage', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    const blocker = makePermanent('earth_treant_sapling', 'player2', {
      attack: 2,
      health: 5,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    // Blocker took 3 damage from attacker
    const blockerAfter = newState.players.player2.board[0];
    expect(blockerAfter).toBeTruthy();
    expect(blockerAfter!.damage).toBe(3);

    // Attacker took 2 damage from blocker
    const attackerAfter = newState.players.player1.board[0];
    expect(attackerAfter).toBeTruthy();
    expect(attackerAfter!.damage).toBe(2);

    expect(events.filter((e) => e.type === 'DAMAGE_DEALT')).toHaveLength(2);
  });

  it('full flow: assigned blocker prevents face damage', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    const blocker = makePermanent('earth_treant_sapling', 'player2', {
      attack: 2,
      health: 5,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: {
        board: [attacker, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
        health: 20,
      },
    });

    const { newState: s1 } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    const { newState: s2 } = reduce(
      s1,
      {
        type: 'ASSIGN_BLOCKER',
        blockerPermanentId: blocker.permanentId,
        attackerPermanentId: attacker.permanentId,
      },
      'player2',
      rng,
    );
    const { newState: s3 } = reduce(s2, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(s3.players.player2.health).toBe(20);
    expect(s3.players.player2.board[0]?.damage).toBe(3);
    expect(s3.players.player1.board[0]?.damage).toBe(2);
  });

  it('full flow: blocker can be removed before combat', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
    });
    const blocker = makePermanent('earth_treant_sapling', 'player2', {
      attack: 2,
      health: 5,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: {
        board: [attacker, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
        health: 20,
      },
    });

    const { newState: s1 } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    const { newState: s2 } = reduce(
      s1,
      {
        type: 'ASSIGN_BLOCKER',
        blockerPermanentId: blocker.permanentId,
        attackerPermanentId: attacker.permanentId,
      },
      'player2',
      rng,
    );
    const { newState: s3 } = reduce(
      s2,
      { type: 'REMOVE_BLOCKER', blockerPermanentId: blocker.permanentId },
      'player2',
      rng,
    );
    const { newState: s4 } = reduce(s3, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(s4.players.player2.health).toBe(18);
  });
});

// ─── Combat: Double Block (two blockers on two different attackers) ───

describe('Combat - double block', () => {
  it('two blockers can be assigned to two different attackers', () => {
    const attacker1 = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    const attacker2 = makePermanent('fire_flame_fox', 'player1', {
      attack: 1,
      health: 1,
    });
    const blocker1 = makePermanent('earth_treant_sapling', 'player2', {
      attack: 2,
      health: 5,
    });
    const blocker2 = makePermanent('earth_pebble_pup', 'player2', {
      attack: 1,
      health: 1,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker1.permanentId, attacker2.permanentId],
      },
      player1: {
        board: [attacker1, attacker2, null, null, null],
      },
      player2: {
        board: [blocker1, blocker2, null, null, null],
        health: 20,
      },
    });

    // Confirm attackers → goes to declare_blockers
    const { newState: s1 } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    expect(s1.phase.type).toBe('battle');
    expect((s1.phase as { step: string }).step).toBe('declare_blockers');

    // Assign first blocker (treant → magma golem)
    const { newState: s2 } = reduce(
      s1,
      {
        type: 'ASSIGN_BLOCKER',
        blockerPermanentId: blocker1.permanentId,
        attackerPermanentId: attacker1.permanentId,
      },
      'player2',
      rng,
    );

    // Verify first block is in tentativeBlockers
    const phase2 = s2.phase as { tentativeBlockers: Record<string, string> };
    expect(phase2.tentativeBlockers[blocker1.permanentId]).toBe(attacker1.permanentId);

    // Enumerate legal actions — should still include ASSIGN_BLOCKER for blocker2
    const legalAfterBlock1 = enumerateLegalActions(s2, 'player2');
    const assignActions = legalAfterBlock1.filter(
      (a) => a.type === 'ASSIGN_BLOCKER',
    );
    expect(assignActions.length).toBeGreaterThan(0);
    expect(assignActions).toContainEqual({
      type: 'ASSIGN_BLOCKER',
      blockerPermanentId: blocker2.permanentId,
      attackerPermanentId: attacker2.permanentId,
    });

    // Assign second blocker (pebble pup → flame fox)
    const { newState: s3 } = reduce(
      s2,
      {
        type: 'ASSIGN_BLOCKER',
        blockerPermanentId: blocker2.permanentId,
        attackerPermanentId: attacker2.permanentId,
      },
      'player2',
      rng,
    );

    // Verify both blocks are in tentativeBlockers
    const phase3 = s3.phase as { tentativeBlockers: Record<string, string> };
    expect(phase3.tentativeBlockers[blocker1.permanentId]).toBe(attacker1.permanentId);
    expect(phase3.tentativeBlockers[blocker2.permanentId]).toBe(attacker2.permanentId);

    // Confirm blockers — combat resolves with no face damage
    const { newState: s4 } = reduce(s3, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    expect(s4.players.player2.health).toBe(20); // No face damage — both attackers blocked
  });
});

// ─── Combat: Multi-Block (multiple blockers on one attacker) ───

describe('Combat - multi-block', () => {
  it('two blockers on one attacker both deal damage', () => {
    // Attacker: 4/6. Blocker1: 2/3, Blocker2: 1/2
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 4,
      health: 6,
    });
    const blocker1 = makePermanent('earth_treant_sapling', 'player2', {
      attack: 2,
      health: 3,
    });
    const blocker2 = makePermanent('earth_pebble_pup', 'player2', {
      attack: 1,
      health: 2,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {
          [blocker1.permanentId]: attacker.permanentId,
          [blocker2.permanentId]: attacker.permanentId,
        },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker1, blocker2, null, null, null],
        health: 20,
      },
    });

    const { newState: orderState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    expect(orderState.phase.type).toBe('battle');
    expect(orderState.phase).toMatchObject({ step: 'order_blockers' });

    const { newState, events } = reduce(orderState, { type: 'CONFIRM_BLOCKER_ORDER' }, 'player1', rng);

    // No face damage — attacker was fully blocked
    expect(newState.players.player2.health).toBe(20);

    // Attacker takes 2+1=3 damage from both blockers → 6-3=3 HP remaining
    const attackerAfter = newState.players.player1.board.find(
      (p) => p?.permanentId === attacker.permanentId,
    );
    expect(attackerAfter).toBeTruthy();
    expect(attackerAfter!.damage).toBe(3);

    // Blocker1 takes up to 3 (its HP) from attacker's 4 damage → dies
    // Blocker2 takes remaining 1 → 2-1=1 HP remaining
    const blocker1Alive = newState.players.player2.board.some(
      (p) => p?.permanentId === blocker1.permanentId,
    );
    expect(blocker1Alive).toBe(false); // died

    const blocker2After = newState.players.player2.board.find(
      (p) => p?.permanentId === blocker2.permanentId,
    );
    expect(blocker2After).toBeTruthy();
    expect(blocker2After!.damage).toBe(1);

    // Both blockers' DAMAGE_DEALT events have different sources
    const dmgToAttacker = events.filter(
      (e) => e.type === 'DAMAGE_DEALT' && e.targetId === attacker.permanentId,
    );
    expect(dmgToAttacker).toHaveLength(2);
  });

  it('multi-block with no excess damage does not deal face damage', () => {
    // Attacker: 2/2. Blocker1: 1/3, Blocker2: 1/3
    const attacker = makePermanent('fire_flame_fox', 'player1', {
      attack: 2,
      health: 2,
    });
    const blocker1 = makePermanent('earth_treant_sapling', 'player2', {
      attack: 1,
      health: 3,
    });
    const blocker2 = makePermanent('earth_pebble_pup', 'player2', {
      attack: 1,
      health: 3,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {
          [blocker1.permanentId]: attacker.permanentId,
          [blocker2.permanentId]: attacker.permanentId,
        },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker1, blocker2, null, null, null],
        health: 20,
      },
    });

    const { newState: orderState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    expect(orderState.phase.type).toBe('battle');
    expect(orderState.phase).toMatchObject({ step: 'order_blockers' });

    const { newState } = reduce(orderState, { type: 'CONFIRM_BLOCKER_ORDER' }, 'player1', rng);

    expect(newState.players.player2.health).toBe(20);

    // Attacker takes 1+1=2 total blocker damage → 2-2=0 → dies
    const attackerAfter = newState.players.player1.board.find(
      (p) => p?.permanentId === attacker.permanentId,
    );
    expect(attackerAfter).toBeUndefined();

    // Blocker1 takes 2 damage (all of attacker's damage since 2 < blocker1's 3 HP)
    const b1After = newState.players.player2.board.find(
      (p) => p?.permanentId === blocker1.permanentId,
    );
    expect(b1After).toBeTruthy();
    expect(b1After!.damage).toBe(2);

    // Blocker2 takes 0 damage (no overflow)
    const b2After = newState.players.player2.board.find(
      (p) => p?.permanentId === blocker2.permanentId,
    );
    expect(b2After).toBeTruthy();
    expect(b2After!.damage).toBe(0);
  });

  it('multi-block deathtouch only kills blockers that take post-armor damage', () => {
    const attacker = makePermanent('shadow_deaths_hand', 'player1', {
      attack: 1,
      health: 4,
    });
    const blocker1 = makePermanent('fire_forge_guardian', 'player2', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });
    const blocker2 = makePermanent('water_pearl_turtle', 'player2', {
      attack: 0,
      health: 3,
      armorUsedThisTurn: false,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {
          [blocker1.permanentId]: attacker.permanentId,
          [blocker2.permanentId]: attacker.permanentId,
        },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker1, blocker2, null, null, null],
      },
    });

    const { newState: orderState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    const { newState, events } = reduce(orderState, { type: 'CONFIRM_BLOCKER_ORDER' }, 'player1', rng);

    const b1After = newState.players.player2.board.find((p) => p?.permanentId === blocker1.permanentId);
    const b2After = newState.players.player2.board.find((p) => p?.permanentId === blocker2.permanentId);

    expect(b1After).toMatchObject({ damage: 0, armorUsedThisTurn: true });
    expect(b2After).toMatchObject({ damage: 0, armorUsedThisTurn: false });
    expect(events).not.toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker1.permanentId,
    }));
    expect(events).not.toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker2.permanentId,
    }));
  });

  it('multi-block deathtouch can kill an armored blocker when assigned damage penetrates armor', () => {
    const attacker = makePermanent('shadow_deaths_hand', 'player1', {
      attack: 2,
      health: 4,
    });
    const blocker1 = makePermanent('fire_forge_guardian', 'player2', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });
    const blocker2 = makePermanent('water_pearl_turtle', 'player2', {
      attack: 0,
      health: 3,
      armorUsedThisTurn: false,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {
          [blocker1.permanentId]: attacker.permanentId,
          [blocker2.permanentId]: attacker.permanentId,
        },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker1, blocker2, null, null, null],
      },
    });

    const { newState: orderState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    const { newState, events } = reduce(orderState, { type: 'CONFIRM_BLOCKER_ORDER' }, 'player1', rng);

    const b2After = newState.players.player2.board.find((p) => p?.permanentId === blocker2.permanentId);

    expect(newState.players.player2.board[0]).toBeNull();
    expect(b2After).toMatchObject({ damage: 0, armorUsedThisTurn: false });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker1.permanentId,
    }));
    expect(events).not.toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker2.permanentId,
    }));
  });

  it('attacker can reorder blockers before combat resolves', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 5,
    });
    const blockerA = makePermanent('earth_treant_sapling', 'player2', {
      attack: 1,
      health: 3,
    });
    const blockerB = makePermanent('earth_pebble_pup', 'player2', {
      attack: 1,
      health: 1,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {
          [blockerA.permanentId]: attacker.permanentId,
          [blockerB.permanentId]: attacker.permanentId,
        },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blockerA, blockerB, null, null, null],
      },
    });

    const { newState: orderState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);
    const { newState: reordered } = reduce(
      orderState,
      {
        type: 'SET_BLOCKER_ORDER',
        attackerPermanentId: attacker.permanentId,
        blockerPermanentIds: [blockerB.permanentId, blockerA.permanentId],
      },
      'player1',
      rng,
    );
    const { newState } = reduce(reordered, { type: 'CONFIRM_BLOCKER_ORDER' }, 'player1', rng);

    const bAAfter = newState.players.player2.board.find((p) => p?.permanentId === blockerA.permanentId);
    const bBAfter = newState.players.player2.board.find((p) => p?.permanentId === blockerB.permanentId);

    expect(bBAfter).toBeUndefined(); // blockerB dies first
    expect(bAAfter).toBeTruthy();
    expect(bAAfter!.damage).toBe(2); // remaining overflow damage after blockerB dies
  });
});

// ─── Combat: Creature Dies ───

describe('Combat - creature dies', () => {
  it('removes dead creature from board', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });
    const blocker = makePermanent('fire_flame_fox', 'player2', {
      attack: 2,
      health: 1,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    // Blocker should be dead (1 health, 3 damage)
    expect(newState.players.player2.board[0]).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker.permanentId,
    }));

    // Attacker survived (4 health, 2 damage)
    expect(newState.players.player1.board[0]).toBeTruthy();
  });

  it('does not kill an armored blocker when armor prevents all deathtouch damage', () => {
    const attacker = makePermanent('fire_cinder_viper', 'player1', {
      attack: 1,
      health: 1,
    });
    const blocker = makePermanent('fire_forge_guardian', 'player2', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(newState.players.player2.board[0]).toMatchObject({
      permanentId: blocker.permanentId,
      damage: 0,
      armorUsedThisTurn: true,
    });
    expect(events).not.toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker.permanentId,
    }));
  });

  it('kills an armored blocker when deathtouch damage penetrates armor', () => {
    const attacker = makePermanent('shadow_deaths_hand', 'player1', {
      attack: 2,
      health: 4,
    });
    const blocker = makePermanent('fire_forge_guardian', 'player2', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(newState.players.player2.board[0]).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: blocker.permanentId,
    }));
  });

  it('does not kill an armored attacker when armor prevents all deathtouch blocker damage', () => {
    const attacker = makePermanent('fire_forge_guardian', 'player1', {
      attack: 1,
      health: 4,
      armorUsedThisTurn: false,
    });
    const blocker = makePermanent('fire_cinder_viper', 'player2', {
      attack: 1,
      health: 1,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: {
        board: [blocker, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(newState.players.player1.board[0]).toMatchObject({
      permanentId: attacker.permanentId,
      damage: 0,
      armorUsedThisTurn: true,
    });
    expect(events).not.toContainEqual(expect.objectContaining({
      type: 'CREATURE_DIED',
      permanentId: attacker.permanentId,
    }));
  });
});

// ─── Game Over on Lethal ───

describe('Game over on lethal damage', () => {
  it('triggers game_over when player reaches 0 health', () => {
    const attacker = makePermanent('fire_dragon_whelp', 'player1', {
      attack: 5,
      health: 4,
    });

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {},
      },
      player1: {
        board: [{ ...attacker, isTapped: true }, null, null, null, null],
      },
      player2: { health: 3 },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(newState.phase).toEqual({ type: 'game_over', winner: 'player1' });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'GAME_OVER',
      winner: 'player1',
    }));
  });

  it('triggers game_over when untargeted spell kills a player', () => {
    // shadow_life_drain: 3 damage to opponent (untargeted)
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player1',
      player1: {
        hand: [makeCardInstance('shadow_life_drain')],
        currentEnergy: 5,
        maxEnergy: 5,
      },
      player2: { health: 3 },
    });

    const { newState, events } = reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'game_over', winner: 'player1' });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'GAME_OVER',
      winner: 'player1',
    }));
  });

  it('triggers game_over when targeted spell kills a player', () => {
    // air_lightning_bolt: 3 damage to any target (targeted)
    const state = createTestGameState({
      phase: {
        type: 'targeting',
        effectId: 'lightning_bolt',
        casterId: 'player1',
        sourceCardId: 'air_lightning_bolt',
        validTargets: [{ type: 'player', playerId: 'player2' }],
      },
      activePlayer: 'player1',
      player2: { health: 3 },
    });

    const { newState, events } = reduce(
      state,
      { type: 'SELECT_TARGET', targetRef: { type: 'player', playerId: 'player2' } },
      'player1',
      rng,
    );

    expect(newState.phase).toEqual({ type: 'game_over', winner: 'player1' });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'GAME_OVER',
      winner: 'player1',
    }));
  });
});

// ─── End of Turn ───

describe('ADVANCE_PHASE from end', () => {
  it('switches active player and increments turn', () => {
    const state = createTestGameState({
      phase: { type: 'end' },
      turn: 1,
      activePlayer: 'player1',
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.activePlayer).toBe('player2');
    expect(newState.turn).toBe(2);
    expect(newState.phase).toEqual({ type: 'draw' });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'TURN_STARTED',
      player: 'player2',
      turn: 2,
    }));
  });

  it('clears temporary bonuses on all permanents', () => {
    const perm = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      temporaryAttackBonus: 2,
      temporaryHealthBonus: 2,
      summonedThisTurn: true,
    });

    const state = createTestGameState({
      phase: { type: 'end' },
      turn: 1,
      activePlayer: 'player1',
      player1: {
        board: [perm, null, null, null, null],
      },
    });

    const { newState } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    const p = newState.players.player1.board[0];
    expect(p).toBeTruthy();
    expect(p!.temporaryAttackBonus).toBe(0);
    expect(p!.temporaryHealthBonus).toBe(0);
    expect(p!.summonedThisTurn).toBe(false);
  });

  it('untaps new active player creatures', () => {
    const perm = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 3,
      isTapped: true,
    });

    const state = createTestGameState({
      phase: { type: 'end' },
      turn: 1,
      activePlayer: 'player1',
      player2: {
        board: [perm, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    const p = newState.players.player2.board[0];
    expect(p!.isTapped).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'CREATURES_UNTAPPED',
      permanentIds: [perm.permanentId],
    }));
  });
});

// ─── Damage Persistence ───

describe('Damage persistence (apprentice tier)', () => {
  it('keeps damage on creatures at end of turn', () => {
    const perm = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      damage: 1,
    });

    const state = createTestGameState({
      phase: { type: 'end' },
      turn: 1,
      activePlayer: 'player1',
      player1: {
        board: [perm, null, null, null, null],
      },
      ruleset: { damagePersists: true },
    });

    const { newState } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.players.player1.board[0]!.damage).toBe(1);
  });
});

describe('Damage heals (alchemist tier)', () => {
  it('heals all creatures at end of turn', () => {
    const perm = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      damage: 2,
    });

    const state = createTestGameState({
      phase: { type: 'end' },
      turn: 1,
      activePlayer: 'player1',
      player1: {
        board: [perm, null, null, null, null],
      },
      ruleset: { damagePersists: false },
    });

    const { newState } = reduce(state, { type: 'ADVANCE_PHASE' }, 'player1', rng);

    expect(newState.players.player1.board[0]!.damage).toBe(0);
  });
});

// ─── Concede ───

describe('CONCEDE', () => {
  it('ends the game with opponent as winner', () => {
    const state = createTestGameState({ phase: { type: 'play' } });

    const { newState, events } = reduce(state, { type: 'CONCEDE' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'game_over', winner: 'player2' });
    expect(events).toContainEqual(expect.objectContaining({
      type: 'GAME_OVER',
      winner: 'player2',
    }));
  });

  it('player2 concedes, player1 wins', () => {
    const state = createTestGameState({ phase: { type: 'play' } });

    const { newState } = reduce(state, { type: 'CONCEDE' }, 'player2', rng);

    expect(newState.phase).toEqual({ type: 'game_over', winner: 'player1' });
  });
});

// ─── Discard Phase ───

describe('DISCARD_CARD', () => {
  it('removes card from hand and adds to discard', () => {
    const cards = [
      makeCardInstance('fire_ember_sprite'),
      makeCardInstance('fire_flame_fox'),
    ];

    const state = createTestGameState({
      phase: { type: 'discard', player: 'player1', mustDiscard: 1 },
      player1: { hand: cards },
    });

    const { newState } = reduce(
      state,
      { type: 'DISCARD_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.players.player1.hand).toHaveLength(1);
    expect(newState.players.player1.discard).toHaveLength(1);
    expect(newState.phase).toEqual({ type: 'end' });
  });

  it('stays in discard phase when more cards need to be discarded', () => {
    const cards = [
      makeCardInstance('fire_ember_sprite'),
      makeCardInstance('fire_flame_fox'),
      makeCardInstance('fire_lava_hound'),
    ];

    const state = createTestGameState({
      phase: { type: 'discard', player: 'player1', mustDiscard: 2 },
      player1: { hand: cards },
    });

    const { newState } = reduce(
      state,
      { type: 'DISCARD_CARD', cardIndex: 0 },
      'player1',
      rng,
    );

    expect(newState.phase).toEqual({ type: 'discard', player: 'player1', mustDiscard: 1 });
  });
});

// ─── Hand Size Overflow → Discard Phase ───

describe('End-of-turn with hand overflow', () => {
  it('enters discard phase when hand exceeds maxHandSize', () => {
    const cards = Array.from({ length: 9 }, () =>
      makeCardInstance('fire_ember_sprite'),
    );

    const state = createTestGameState({
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [],
      },
      player1: { hand: cards },
      ruleset: { maxHandSize: 7 },
    });

    // No attackers → post-combat play phase
    const { newState: postCombat } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    expect(postCombat.phase).toEqual({ type: 'play', postCombat: true });

    // Advance from post-combat play → triggers discard check
    const { newState } = reduce(postCombat, { type: 'ADVANCE_PHASE' }, 'player1', rng);
    expect(newState.phase).toEqual({
      type: 'discard',
      player: 'player1',
      mustDiscard: 2,
    });
  });
});

// ─── Validation Errors ───

describe('Validation', () => {
  it('throws on invalid action', () => {
    const state = createTestGameState({ phase: { type: 'play' } });

    expect(() => reduce(state, { type: 'KEEP_HAND' }, 'player1', rng))
      .toThrow('KEEP_HAND is only valid during mulligan phase');
  });

  it('throws when playing a card you cannot afford', () => {
    const card = makeCardInstance('fire_dragon_whelp'); // cost 5
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 2,
        maxEnergy: 2,
      },
    });

    expect(() => reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng))
      .toThrow('Not enough energy');
  });
});

// ─── Integration: Dark Bolt with same card on both sides ───

describe('Dark Bolt integration — both players share same creature card', () => {
  it('damages the opponent creature, not the caster creature with the same cardId', () => {
    // Both players have fire_lava_hound (4 health) on board — with player-prefixed IDs.
    const p1Sprite = makePermanent('fire_lava_hound', 'player1', {
      permanentId: 'p1:fire_lava_hound#0',
      attack: 2, health: 4,
    });
    const p2Sprite = makePermanent('fire_lava_hound', 'player2', {
      permanentId: 'p2:fire_lava_hound#0',
      attack: 2, health: 4,
    });

    // Player1 casts Dark Bolt (costs 1, deals 2 to selected, 1 to self hero)
    const state = createTestGameState({
      phase: {
        type: 'play' as const,
      },
      player1: {
        hand: [{ instanceId: 'p1:shadow_dark_bolt#0', cardId: 'shadow_dark_bolt' }],
        board: [p1Sprite, null, null, null, null],
        currentEnergy: 3,
        maxEnergy: 3,
      },
      player2: {
        board: [p2Sprite, null, null, null, null],
      },
    });

    // Play Dark Bolt → enters targeting phase
    const { newState: s1 } = reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng);
    expect(s1.phase.type).toBe('targeting');

    // Verify valid targets only include opponent's creature
    const targetPhase = s1.phase as { validTargets: { type: string; permanentId: string }[] };
    const creatureTargets = targetPhase.validTargets.filter((t) => t.type === 'creature');
    expect(creatureTargets).toHaveLength(1);
    expect(creatureTargets[0].permanentId).toBe(p2Sprite.permanentId);

    // Select opponent's sprite as target
    const { newState: s2 } = reduce(
      s1,
      { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: p2Sprite.permanentId } },
      'player1',
      rng,
    );

    // Player2's sprite took 2 damage
    const p2Perm = s2.players.player2.board.find((s) => s !== null);
    expect(p2Perm).toBeTruthy();
    expect(p2Perm!.damage).toBe(2);

    // Player1's sprite is unharmed (only hero takes the self-damage)
    const p1Perm = s2.players.player1.board.find((s) => s !== null);
    expect(p1Perm).toBeTruthy();
    expect(p1Perm!.damage).toBe(0);

    // Player1 hero took 1 self-damage from Dark Bolt's second step
    expect(s2.players.player1.health).toBe(19);
  });
});

// ─── Blocker assignment with shared card IDs ───

describe('Blocker assignment with shared card IDs', () => {
  it('second blocker remains valid when attackers and defenders share card IDs', () => {
    // Both players have creatures from the same card — same permanentId pattern
    const attacker = makePermanent('fire_ember_sprite', 'player1', { attack: 1, health: 2 });
    const blocker1 = makePermanent('fire_ember_sprite', 'player2', { attack: 1, health: 2 });
    const blocker2 = makePermanent('fire_flame_fox', 'player2', { attack: 1, health: 1 });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {},
      },
      player1: {
        board: [attacker, null, null, null, null],
      },
      player2: {
        board: [blocker1, blocker2, null, null, null],
      },
    });

    // Assign first blocker
    const { newState: s1 } = reduce(
      state,
      {
        type: 'ASSIGN_BLOCKER',
        blockerPermanentId: blocker1.permanentId,
        attackerPermanentId: attacker.permanentId,
      },
      'player2',
      rng,
    );

    // Blocker2 should still be assignable
    const legal = enumerateLegalActions(s1, 'player2');
    const assignActions = legal.filter(
      (a) => a.type === 'ASSIGN_BLOCKER',
    );
    expect(assignActions).toContainEqual({
      type: 'ASSIGN_BLOCKER',
      blockerPermanentId: blocker2.permanentId,
      attackerPermanentId: attacker.permanentId,
    });
  });
});

// ─── Derived Stats ───

describe('Derived stats', () => {
  it('credits damageDealt and damageReceived on unblocked combat damage', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 3,
      health: 3,
      isTapped: true,
    });
    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: {},
      },
      player1: { board: [attacker, null, null, null, null] },
      player2: { board: [null, null, null, null, null], health: 20 },
    });

    const { newState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(newState.stats.player1.damageDealt).toBe(3);
    expect(newState.stats.player2.damageReceived).toBe(3);
  });

  it('credits creaturesDefeated to the opponent when a creature dies', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 3,
      health: 3,
      isTapped: true,
    });
    const blocker = makePermanent('water_shell_crab', 'player2', {
      attack: 1,
      health: 1,
    });

    const state = createTestGameState({
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: [attacker.permanentId],
        tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
      },
      player1: { board: [attacker, null, null, null, null] },
      player2: { board: [blocker, null, null, null, null] },
    });

    const { newState } = reduce(state, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(newState.stats.player1.creaturesDefeated).toBe(1);
  });
});

// ─── Archmage Combat Priority Stack ───

describe('Archmage combat priority stack', () => {
  it('enters post-attackers priority window when combat tricks are enabled', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      summonedThisTurn: false,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'battle',
        step: 'declare_attackers',
        tentativeAttackers: [attacker.permanentId],
      },
      player1: {
        currentEnergy: 1,
        maxEnergy: 1,
        hand: [makeCardInstance('fire_blazing_speed')],
        board: [attacker, null, null, null, null],
      },
      player2: { board: [null, null, null, null, null] },
    });

    const { newState, events } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    expect(newState.phase.type).toBe('combat_priority');
    if (newState.phase.type !== 'combat_priority') return;

    expect(newState.phase.window).toBe('post_attackers');
    expect(newState.phase.priorityPlayer).toBe('player1');
    expect(newState.phase.passCount).toBe(0);
    expect(newState.phase.stack).toEqual([]);
    expect(newState.phase.confirmedAttackers).toEqual([attacker.permanentId]);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'ATTACKERS_DECLARED',
      attackerIds: [attacker.permanentId],
    }));
  });

  it('closes post-attackers priority into blocker declaration after pass-pass with empty stack', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      summonedThisTurn: false,
      isTapped: true,
    });
    const blocker = makePermanent('water_shell_crab', 'player2', {
      attack: 0,
      health: 4,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: [attacker.permanentId],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [],
      },
      player1: { board: [attacker, null, null, null, null] },
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [makeCardInstance('air_blessing')],
        board: [blocker, null, null, null, null],
      },
    });

    const { newState: afterFirstPass } = reduce(state, { type: 'PASS_PRIORITY' }, 'player1', rng);
    expect(afterFirstPass.phase.type).toBe('combat_priority');
    if (afterFirstPass.phase.type !== 'combat_priority') return;
    expect(afterFirstPass.phase.priorityPlayer).toBe('player2');
    expect(afterFirstPass.phase.passCount).toBe(1);

    const { newState: afterSecondPass } = reduce(afterFirstPass, { type: 'PASS_PRIORITY' }, 'player2', rng);
    expect(afterSecondPass.phase).toEqual({
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [attacker.permanentId],
      tentativeBlockers: {},
    });
  });

  it('does not hold priority for targetless instant options', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      summonedThisTurn: false,
      isTapped: true,
    });
    const blocker = makePermanent('water_shell_crab', 'player2', {
      attack: 0,
      health: 4,
    });

    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: [attacker.permanentId],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [],
      },
      player1: {
        currentEnergy: 4,
        maxEnergy: 4,
        hand: [makeCardInstance('fire_fireball')], // no enemy creature targets
        board: [attacker, null, null, null, null],
      },
      player2: { board: [blocker, null, null, null, null] },
    });

    const { newState } = reduce(state, { type: 'PASS_PRIORITY' }, 'player1', rng);
    expect(newState.phase).toEqual({
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [attacker.permanentId],
      tentativeBlockers: {},
    });
  });

  it('resolves combat once from post-blockers after pass-pass with an empty stack', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 3,
      health: 3,
      summonedThisTurn: false,
      isTapped: true,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_blockers',
        confirmedAttackers: [attacker.permanentId],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [],
      },
      player1: { board: [attacker, null, null, null, null] },
      player2: { board: [null, null, null, null, null], health: 20 },
    });

    const { newState, events } = reduce(state, { type: 'PASS_PRIORITY' }, 'player1', rng);

    expect(newState.phase).toEqual({ type: 'play', postCombat: true });
    expect(newState.players.player2.health).toBe(17);
    expect(events.filter((e) => e.type === 'PLAYER_DAMAGED')).toHaveLength(1);
  });

  it('auto-passes through priority and resolves the stack in LIFO order', () => {
    const target = makePermanent('water_tide_sprite', 'player2', {
      attack: 1,
      health: 2,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_blockers',
        confirmedAttackers: [],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [
          {
            stackId: 'stack_fireball',
            cardId: 'fire_fireball',
            effectId: 'fireball',
            casterId: 'player1',
            selectedTarget: { type: 'creature', permanentId: target.permanentId },
            surchargePaid: 1,
          },
          {
            stackId: 'stack_blessing',
            cardId: 'air_blessing',
            effectId: 'blessing',
            casterId: 'player2',
            selectedTarget: { type: 'creature', permanentId: target.permanentId },
            surchargePaid: 0,
          },
        ],
      },
      player1: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [],
      },
      player2: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [],
        board: [target, null, null, null, null],
      },
    });

    const { newState, events } = reduce(state, { type: 'PASS_PRIORITY' }, 'player1', rng);
    expect(newState.phase).toEqual({ type: 'play', postCombat: true });

    const spellResolvedEvents = events.filter((event) => event.type === 'SPELL_RESOLVED');
    expect(spellResolvedEvents).toHaveLength(2);
    expect(spellResolvedEvents[0]).toEqual(expect.objectContaining({ cardId: 'air_blessing' }));
    expect(spellResolvedEvents[1]).toEqual(expect.objectContaining({ cardId: 'fire_fireball' }));

    const survivingTarget = newState.players.player2.board.find((p) => p?.permanentId === target.permanentId);
    expect(survivingTarget).toBeTruthy();
    expect(survivingTarget!.damage).toBe(3);
    expect(survivingTarget!.temporaryHealthBonus).toBe(3);
  });

  it('refunds and resumes priority when targeting is cancelled during combat priority', () => {
    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      summonedThisTurn: false,
      isTapped: true,
    });
    const target = makePermanent('water_tide_sprite', 'player2', {
      attack: 1,
      health: 2,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: [attacker.permanentId],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [],
      },
      player1: {
        currentEnergy: 4,
        maxEnergy: 4,
        hand: [makeCardInstance('fire_fireball')],
        board: [attacker, null, null, null, null],
      },
      player2: {
        board: [target, null, null, null, null],
      },
    });

    const { newState: targetingState } = reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng);
    expect(targetingState.phase.type).toBe('targeting');
    expect(targetingState.players.player1.currentEnergy).toBe(1);

    const { newState } = reduce(targetingState, { type: 'CANCEL_TARGETING' }, 'player1', rng);
    expect(newState.phase.type).toBe('combat_priority');
    if (newState.phase.type !== 'combat_priority') return;

    expect(newState.phase.window).toBe('post_attackers');
    expect(newState.phase.priorityPlayer).toBe('player1');
    expect(newState.phase.passCount).toBe(0);
    expect(newState.phase.stack).toEqual([]);
    expect(newState.players.player1.currentEnergy).toBe(4);
    expect(newState.players.player1.hand.some((card) => card.cardId === 'fire_fireball')).toBe(true);
  });
});

// ─── Combat Priority Stack ───

describe('combat priority stack', () => {
  it('targeted instant enters targeting with stackOnResolve during combat_priority', () => {
    const target = makePermanent('water_tide_sprite', 'player2', {
      attack: 1,
      health: 2,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: [],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [],
      },
      player1: {
        currentEnergy: 4,
        maxEnergy: 4,
        hand: [makeCardInstance('fire_fireball')],
      },
      player2: {
        board: [target, null, null, null, null],
      },
    });

    const { newState } = reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng);
    expect(newState.phase.type).toBe('targeting');
    if (newState.phase.type !== 'targeting') return;
    expect(newState.phase.sourceCardId).toBe('fire_fireball');
  });

  it('SELECT_TARGET during combat targeting auto-resolves the spell', () => {
    const target = makePermanent('water_tide_sprite', 'player2', {
      attack: 1,
      health: 2,
    });
    const ownCreature = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 3,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: [],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [],
      },
      player1: {
        currentEnergy: 4,
        maxEnergy: 4,
        hand: [makeCardInstance('fire_fireball')],
      },
      player2: {
        currentEnergy: 4,
        maxEnergy: 4,
        hand: [makeCardInstance('air_blessing')],
        board: [target, ownCreature, null, null, null],
      },
    });

    // Play the card -> enters targeting
    const { newState: targetingState } = reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng);
    expect(targetingState.phase.type).toBe('targeting');

    // Select target -> spell auto-resolves (stack doesn't pause for caster confirmation)
    const { newState: afterSelect, events } = reduce(
      targetingState,
      { type: 'SELECT_TARGET', targetRef: { type: 'creature', permanentId: target.permanentId } },
      'player1',
      rng,
    );
    // Spell resolved — target should have taken damage
    expect(events.some((e) => e.type === 'SPELL_RESOLVED' && e.cardId === 'fire_fireball')).toBe(true);
    // Stack should be empty after auto-resolution
    expect(afterSelect.phase.type).toBe('combat_priority');
    if (afterSelect.phase.type !== 'combat_priority') return;
    expect(afterSelect.phase.stack).toHaveLength(0);
  });

  it('PASS_PRIORITY with auto-pass resolves stacked spell when opponent has no instants', () => {
    const target = makePermanent('earth_mountain_giant', 'player2', {
      attack: 4,
      health: 6,
    });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      activePlayer: 'player1',
      phase: {
        type: 'combat_priority',
        window: 'post_blockers',
        confirmedAttackers: [],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player1',
        passCount: 0,
        stack: [
          {
            stackId: 'stack_fireball',
            cardId: 'fire_fireball',
            effectId: 'fireball',
            casterId: 'player1',
            selectedTarget: { type: 'creature', permanentId: target.permanentId },
            surchargePaid: 1,
          },
        ],
      },
      player1: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [],
      },
      player2: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [],
        board: [target, null, null, null, null],
      },
    });

    // Player1 passes; player2 has no instants so auto-pass triggers,
    // reaching passCount 2 which resolves the stack and exits priority
    const { newState, events } = reduce(state, { type: 'PASS_PRIORITY' }, 'player1', rng);
    expect(newState.phase).toEqual({ type: 'play', postCombat: true });
    const spellResolved = events.filter((e) => e.type === 'SPELL_RESOLVED');
    expect(spellResolved).toHaveLength(1);
    expect(spellResolved[0]).toEqual(expect.objectContaining({ cardId: 'fire_fireball' }));
    // Verify the target took 3 damage from the fireball but survived (6 health)
    const survivingTarget = newState.players.player2.board.find((p) => p?.permanentId === target.permanentId);
    expect(survivingTarget).toBeTruthy();
    expect(survivingTarget!.damage).toBe(3);
  });
});

// ─── Immutability ───

describe('Immutability', () => {
  it('does not mutate the original state', () => {
    const card = makeCardInstance('fire_lava_hound');
    const state = createTestGameState({
      phase: { type: 'play' },
      player1: {
        hand: [card],
        currentEnergy: 3,
        maxEnergy: 3,
      },
    });

    const originalHand = [...state.players.player1.hand];
    const originalEnergy = state.players.player1.currentEnergy;

    reduce(state, { type: 'PLAY_CARD', cardIndex: 0 }, 'player1', rng);

    expect(state.players.player1.hand).toEqual(originalHand);
    expect(state.players.player1.currentEnergy).toBe(originalEnergy);
  });
});
