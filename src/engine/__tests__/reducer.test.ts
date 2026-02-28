import { describe, it, expect, beforeEach } from 'vitest';
import { reduce } from '../reducer';
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
    const { newState: p1End } = reduce(p1Battle, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
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

    const { newState: p2End } = reduce(p2Battle, { type: 'CONFIRM_ATTACKERS' }, 'player2', rng);
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

    expect(newState.phase.type).toBe('end');
  });
});

// ─── Combat: Unblocked ───

describe('Combat - unblocked attacker', () => {
  it('damages defending player', () => {
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

    // Confirm attackers
    const { newState: s1 } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);
    expect(s1.phase.type).toBe('battle');

    // Confirm blockers (none)
    const { newState: s2, events } = reduce(s1, { type: 'CONFIRM_BLOCKERS' }, 'player2', rng);

    expect(s2.players.player2.health).toBe(18); // 20 - 2
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

    const { newState } = reduce(state, { type: 'CONFIRM_ATTACKERS' }, 'player1', rng);

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
