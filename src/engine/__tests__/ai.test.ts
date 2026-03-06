import { describe, it, expect, beforeEach } from 'vitest';
import { chooseAction, runAITurn } from '../ai';
import { createRNG } from '../prng';
import { enumerateLegalActions } from '../validation';
import { reduce } from '../reducer';
import { createAIConfig, DEFAULT_AI_CONFIG, type AIConfig } from '../aiConfig';
import {
  createTestGameState,
  makeCardInstance,
  makePermanent,
  resetTestCounters,
} from './__fixtures__/testHelpers';
import type { Phase } from '../types';

const HEURISTIC_CONFIG: AIConfig = {
  difficulty: 'easy',
  personality: 'balanced',
  policy: 'heuristic',
  temperature: 0.01,
  playLookahead: false,
  combatLookahead: false,
  search: {
    enabled: false,
    maxDepth: 1,
    maxNodes: 4,
    maxBranching: 2,
    rolloutDepth: 0,
    useTransposition: false,
  },
  weights: {
    health: 1.0,
    aggression: 1.0,
    boardPresence: 1.0,
    boardPower: 1.0,
    boardDurability: 1.0,
    handSize: 0.8,
  },
};

beforeEach(() => {
  resetTestCounters();
});

// ─── Mulligan ───

describe('mulligan', () => {
  it('keeps a hand with low-cost cards', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player2' },
      player2: {
        hand: [
          makeCardInstance('fire_ember_sprite'),  // cost 1
          makeCardInstance('fire_lava_hound'),    // cost 2
          makeCardInstance('fire_magma_golem'),   // cost 3
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('KEEP_HAND');
  });

  it('mulligans an expensive hand', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player2' },
      player2: {
        hand: [
          makeCardInstance('fire_dragon_whelp'),    // cost 5
          makeCardInstance('fire_phoenix_chick'),   // cost 4
          makeCardInstance('fire_magma_golem'),     // cost 3
          makeCardInstance('earth_mountain_giant'), // cost 5
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('MULLIGAN_CARDS');
  });

  it('keeps hand if mulligan already used even with expensive cards', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player2' },
      player2: {
        mulliganUsed: true,
        hand: [
          makeCardInstance('fire_dragon_whelp'),    // cost 5
          makeCardInstance('fire_phoenix_chick'),   // cost 4
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('KEEP_HAND');
  });
});

// ─── Draw / Energy Phases ───

describe('draw and energy phases', () => {
  it('advances through draw phase', () => {
    const state = createTestGameState({
      phase: { type: 'draw' },
      activePlayer: 'player2',
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action).toEqual({ type: 'ADVANCE_PHASE' });
  });

  it('advances through energy phase', () => {
    const state = createTestGameState({
      phase: { type: 'energy' },
      activePlayer: 'player2',
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action).toEqual({ type: 'ADVANCE_PHASE' });
  });
});

// ─── Play Phase ───

describe('play phase', () => {
  it('plays the highest-cost affordable card', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 3,
        maxEnergy: 3,
        hand: [
          makeCardInstance('fire_ember_sprite'),  // cost 1
          makeCardInstance('fire_lava_hound'),    // cost 2
          makeCardInstance('fire_magma_golem'),   // cost 3
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('PLAY_CARD');
    if (action.type === 'PLAY_CARD') {
      // cardIndex 2 = fire_magma_golem (cost 3, the most expensive affordable)
      expect(action.cardIndex).toBe(2);
    }
  });

  it('advances to battle when no cards can be played', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [
          makeCardInstance('fire_magma_golem'), // cost 3
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action).toEqual({ type: 'ADVANCE_PHASE' });
  });

  it('skips targeted spells with no legal targets', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [
          makeCardInstance('fire_fireball'), // targeted spell, no enemy creatures
          makeCardInstance('water_splash'),  // untargeted spell
        ],
      },
      player1: {
        board: [null, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), HEURISTIC_CONFIG);
    expect(action.type).toBe('PLAY_CARD');
    if (action.type === 'PLAY_CARD') {
      expect(state.players.player2.hand[action.cardIndex].cardId).toBe('water_splash');
    }
  });

  it('advances when only targetless targeted spells are available', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [makeCardInstance('fire_fireball')],
      },
      player1: {
        board: [null, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action).toEqual({ type: 'ADVANCE_PHASE' });
  });

  it('prefers leftmost slot for creatures', () => {
    const board: (ReturnType<typeof makePermanent> | null)[] = [
      null,
      makePermanent('fire_ember_sprite', 'player2'),
      null,
      null,
      null,
    ];

    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [makeCardInstance('fire_lava_hound')],
        board,
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), HEURISTIC_CONFIG);
    expect(action.type).toBe('PLAY_CARD');
    if (action.type === 'PLAY_CARD') {
      expect(action.targetSlot).toBe(0);
    }
  });
});

// ─── Targeting ───

describe('targeting', () => {
  it('prioritizes the highest attack creature for prevent-attack effects on very easy', () => {
    const lowThreat = makePermanent('fire_ember_sprite', 'player1', {
      attack: 1,
      health: 2,
    });
    const highThreat = makePermanent('earth_mountain_giant', 'player1', {
      attack: 5,
      health: 6,
    });

    const state = createTestGameState({
      phase: {
        type: 'targeting',
        effectId: 'entangle',
        casterId: 'player2',
        sourceCardId: 'earth_entangle',
        validTargets: [
          { type: 'creature', permanentId: lowThreat.permanentId },
          { type: 'creature', permanentId: highThreat.permanentId },
        ],
      },
      activePlayer: 'player2',
      player1: {
        board: [lowThreat, highThreat, null, null, null],
      },
    });

    const config = createAIConfig('very_easy', createRNG(7));
    const action = chooseAction(state, 'player2', createRNG(8), config);
    expect(action.type).toBe('SELECT_TARGET');
    if (action.type === 'SELECT_TARGET') {
      expect(action.targetRef).toEqual({ type: 'creature', permanentId: highThreat.permanentId });
    }
  });

  it('prioritizes threat over low-health cleanup for mixed damage plus prevent effects', () => {
    const lowThreat = makePermanent('fire_ember_sprite', 'player1', {
      attack: 1,
      health: 1,
    });
    const highThreat = makePermanent('earth_mountain_giant', 'player1', {
      attack: 5,
      health: 6,
    });

    const state = createTestGameState({
      phase: {
        type: 'targeting',
        effectId: 'tar_pit',
        casterId: 'player2',
        sourceCardId: 'earth_tar_pit',
        validTargets: [
          { type: 'creature', permanentId: lowThreat.permanentId },
          { type: 'creature', permanentId: highThreat.permanentId },
        ],
      },
      activePlayer: 'player2',
      player1: {
        board: [lowThreat, highThreat, null, null, null],
      },
    });

    const config = createAIConfig('easy', createRNG(17));
    const action = chooseAction(state, 'player2', createRNG(18), config);
    expect(action.type).toBe('SELECT_TARGET');
    if (action.type === 'SELECT_TARGET') {
      expect(action.targetRef).toEqual({ type: 'creature', permanentId: highThreat.permanentId });
    }
  });
});

// ─── Battle: Declare Attackers ───

describe('declare attackers', () => {
  it('declares an eligible creature as attacker', () => {
    const creature = makePermanent('fire_magma_golem', 'player2', {
      attack: 3,
      health: 4,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [],
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player2: {
        board: [creature, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('DECLARE_ATTACKER');
    if (action.type === 'DECLARE_ATTACKER') {
      expect(action.permanentId).toBe(creature.permanentId);
    }
  });

  it('confirms attackers when all are declared', () => {
    const creature = makePermanent('fire_magma_golem', 'player2', {
      attack: 3,
      health: 4,
      isTapped: true, // already tapped, can't attack
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [],
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player2: {
        board: [creature, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('CONFIRM_ATTACKERS');
  });

  it('avoids suicidal attacks with combat lookahead heuristic scoring', () => {
    const attacker = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 1,
    });
    const blocker = makePermanent('earth_mountain_giant', 'player1', {
      attack: 4,
      health: 6,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [],
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player1: {
        board: [blocker, null, null, null, null],
      },
      player2: {
        board: [attacker, null, null, null, null],
      },
    });

    const heuristicCombatLookahead: AIConfig = {
      difficulty: 'hard',
      personality: 'balanced',
      policy: 'heuristic',
      temperature: 0.05,
      playLookahead: true,
      combatLookahead: true,
      search: {
        enabled: false,
        maxDepth: 1,
        maxNodes: 8,
        maxBranching: 4,
        rolloutDepth: 0,
        useTransposition: false,
      },
      weights: {
        health: 1.0,
        aggression: 1.0,
        boardPresence: 1.0,
        boardPower: 1.0,
        boardDurability: 1.0,
        handSize: 0.8,
      },
    };

    const action = chooseAction(state, 'player2', createRNG(99), heuristicCombatLookahead);
    expect(action).toEqual({ type: 'CONFIRM_ATTACKERS' });
  });

  it('medium tree search avoids suicidal attacks in battle', () => {
    const attacker = makePermanent('fire_lava_hound', 'player2', {
      attack: 2,
      health: 1,
    });
    const blocker = makePermanent('earth_mountain_giant', 'player1', {
      attack: 4,
      health: 6,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [],
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player1: {
        board: [blocker, null, null, null, null],
      },
      player2: {
        board: [attacker, null, null, null, null],
      },
    });

    const mediumSearchConfig: AIConfig = {
      difficulty: 'medium',
      personality: 'balanced',
      policy: 'tree_search',
      temperature: 0.05,
      playLookahead: true,
      combatLookahead: false,
      search: {
        enabled: true,
        maxDepth: 2,
        maxNodes: 16,
        maxBranching: 4,
        rolloutDepth: 2,
        useTransposition: true,
      },
      weights: {
        health: 1.0,
        aggression: 1.0,
        boardPresence: 1.0,
        boardPower: 1.0,
        boardDurability: 1.0,
        handSize: 0.8,
      },
    };

    const action = chooseAction(state, 'player2', createRNG(123), mediumSearchConfig);
    expect(action).toEqual({ type: 'CONFIRM_ATTACKERS' });
  });

  it('very hard confirms instead of adding low-value suicidal attackers', () => {
    const strongBlocker = makePermanent('shadow_ghost_knight', 'player1', {
      attack: 3,
      health: 4,
    });
    const smallBlocker = makePermanent('water_jellyfish_swarm', 'player1', {
      attack: 1,
      health: 2,
    });
    const priestess = makePermanent('air_priestess_of_light', 'player2', {
      attack: 1,
      health: 4,
    });
    const scribe = makePermanent('air_angelic_scribe', 'player2', {
      attack: 1,
      health: 3,
    });
    const dove = makePermanent('air_temple_dove', 'player2', {
      attack: 0,
      health: 3,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [priestess.permanentId],
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player1: {
        board: [strongBlocker, smallBlocker, null, null, null],
      },
      player2: {
        board: [priestess, scribe, dove, null, null],
      },
    });

    const config = createAIConfig('very_hard', createRNG(44));
    const action = chooseAction(state, 'player2', createRNG(45), config);
    expect(action).toEqual({ type: 'CONFIRM_ATTACKERS' });
  });

  it('hard also confirms instead of adding low-value suicidal attackers', () => {
    const strongBlocker = makePermanent('shadow_ghost_knight', 'player1', {
      attack: 3,
      health: 4,
    });
    const smallBlocker = makePermanent('water_jellyfish_swarm', 'player1', {
      attack: 1,
      health: 2,
    });
    const priestess = makePermanent('air_priestess_of_light', 'player2', {
      attack: 1,
      health: 4,
    });
    const scribe = makePermanent('air_angelic_scribe', 'player2', {
      attack: 1,
      health: 3,
    });
    const dove = makePermanent('air_temple_dove', 'player2', {
      attack: 0,
      health: 3,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_attackers',
      tentativeAttackers: [priestess.permanentId],
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player1: {
        board: [strongBlocker, smallBlocker, null, null, null],
      },
      player2: {
        board: [priestess, scribe, dove, null, null],
      },
    });

    const config = createAIConfig('hard', createRNG(54));
    const action = chooseAction(state, 'player2', createRNG(55), config);
    expect(action).toEqual({ type: 'CONFIRM_ATTACKERS' });
  });
});

// ─── Battle: Declare Blockers ───

describe('declare blockers', () => {
  it('assigns a favorable block', () => {
    const myCreature = makePermanent('fire_magma_golem', 'player2', {
      attack: 3,
      health: 5,
    });
    const enemyAttacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 3,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [enemyAttacker.permanentId],
      tentativeBlockers: {},
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player1', // player1 is attacking
      player1: {
        board: [enemyAttacker, null, null, null, null],
      },
      player2: {
        board: [myCreature, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('ASSIGN_BLOCKER');
    if (action.type === 'ASSIGN_BLOCKER') {
      expect(action.blockerPermanentId).toBe(myCreature.permanentId);
      expect(action.attackerPermanentId).toBe(enemyAttacker.permanentId);
    }
  });

  it('chump blocks a big attacker', () => {
    const mySmallCreature = makePermanent('fire_ember_sprite', 'player2', {
      attack: 1,
      health: 2,
    });
    const bigAttacker = makePermanent('fire_dragon_whelp', 'player1', {
      attack: 5,
      health: 4,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [bigAttacker.permanentId],
      tentativeBlockers: {},
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player1: {
        board: [bigAttacker, null, null, null, null],
      },
      player2: {
        board: [mySmallCreature, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('ASSIGN_BLOCKER');
  });

  it('does not block a small attacker', () => {
    const myCreature = makePermanent('fire_magma_golem', 'player2', {
      attack: 3,
      health: 4,
    });
    const smallAttacker = makePermanent('fire_ember_sprite', 'player1', {
      attack: 1,
      health: 2,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [smallAttacker.permanentId],
      tentativeBlockers: {},
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player1: {
        board: [smallAttacker, null, null, null, null],
      },
      player2: {
        board: [myCreature, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), HEURISTIC_CONFIG);
    // Should confirm without blocking (1 damage is not worth the trade)
    expect(action.type).toBe('CONFIRM_BLOCKERS');
  });

  it('confirms blockers when no creatures to block with', () => {
    const attacker = makePermanent('fire_magma_golem', 'player1', {
      attack: 3,
      health: 4,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [attacker.permanentId],
      tentativeBlockers: {},
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player1: {
        board: [attacker, null, null, null, null],
      },
      player2: {
        board: [null, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('CONFIRM_BLOCKERS');
  });

  it('blocks the highest damage attacker first when facing lethal', () => {
    const blocker = makePermanent('fire_ember_sprite', 'player2', {
      attack: 1,
      health: 2,
    });
    const highDamageAttacker = makePermanent('earth_mountain_giant', 'player1', {
      attack: 4,
      health: 6,
    });
    const lowDamageAttacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'declare_blockers',
      confirmedAttackers: [highDamageAttacker.permanentId, lowDamageAttacker.permanentId],
      tentativeBlockers: {},
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player1',
      player1: {
        board: [highDamageAttacker, lowDamageAttacker, null, null, null],
      },
      player2: {
        health: 4,
        board: [blocker, null, null, null, null],
      },
    });

    const config = createAIConfig('very_easy', createRNG(23));
    const action = chooseAction(state, 'player2', createRNG(24), config);
    expect(action.type).toBe('ASSIGN_BLOCKER');
    if (action.type === 'ASSIGN_BLOCKER') {
      expect(action.attackerPermanentId).toBe(highDamageAttacker.permanentId);
    }
  });
});

describe('order blockers', () => {
  it('confirms blocker order when reordering is not a strict improvement', () => {
    const attacker = makePermanent('earth_mountain_giant', 'player2', {
      attack: 4,
      health: 6,
      isTapped: true,
    });
    const blockerA = makePermanent('fire_magma_golem', 'player1', {
      attack: 2,
      health: 2,
    });
    const blockerB = makePermanent('water_river_otter', 'player1', {
      attack: 2,
      health: 2,
    });

    const phase: Phase = {
      type: 'battle',
      step: 'order_blockers',
      confirmedAttackers: [attacker.permanentId],
      blockers: {
        [blockerA.permanentId]: attacker.permanentId,
        [blockerB.permanentId]: attacker.permanentId,
      },
      attackerBlockerOrder: {
        [attacker.permanentId]: [blockerA.permanentId, blockerB.permanentId],
      },
    };

    const state = createTestGameState({
      phase,
      activePlayer: 'player2',
      player1: {
        board: [blockerA, blockerB, null, null, null],
      },
      player2: {
        board: [attacker, null, null, null, null],
      },
    });

    const treeSearchConfig: AIConfig = {
      difficulty: 'hard',
      personality: 'balanced',
      policy: 'tree_search',
      temperature: 0.01,
      playLookahead: true,
      combatLookahead: true,
      search: {
        enabled: true,
        maxDepth: 2,
        maxNodes: 24,
        maxBranching: 4,
        rolloutDepth: 2,
        useTransposition: true,
      },
      weights: {
        health: 1.0,
        aggression: 1.0,
        boardPresence: 1.0,
        boardPower: 1.0,
        boardDurability: 1.0,
        handSize: 0.8,
      },
    };

    const firstAction = chooseAction(state, 'player2', createRNG(4242), treeSearchConfig);
    expect(firstAction.type).toBe('CONFIRM_BLOCKER_ORDER');

    const firstResult = reduce(state, firstAction, 'player2', createRNG(7));
    expect(firstResult.newState.phase.type).not.toBe('battle');
  });
});

// ─── Combat Priority ───

describe('combat priority', () => {
  it('passes priority when no legal instant casts are available', () => {
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: ['atk_1'],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player2',
        passCount: 0,
        stack: [],
      },
      activePlayer: 'player1',
      player2: {
        currentEnergy: 10,
        maxEnergy: 10,
        hand: [makeCardInstance('fire_eruption')],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action).toEqual({ type: 'PASS_PRIORITY' });
  });

  it('casts an instant when one is legal in combat priority', () => {
    const enemy = makePermanent('fire_lava_hound', 'player1', { attack: 2, health: 3 });
    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      phase: {
        type: 'combat_priority',
        window: 'post_attackers',
        confirmedAttackers: ['atk_1'],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player2',
        passCount: 0,
        stack: [],
      },
      activePlayer: 'player1',
      player1: {
        board: [enemy, null, null, null, null],
      },
      player2: {
        currentEnergy: 4,
        maxEnergy: 4,
        hand: [makeCardInstance('fire_fireball')],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('PLAY_CARD');
  });

  it('is deterministic in combat priority with seeded RNG', () => {
    const myCreature = makePermanent('fire_lava_hound', 'player2', { attack: 2, health: 3 });
    const config: AIConfig = {
      difficulty: 'medium',
      personality: 'balanced',
      policy: 'heuristic',
      temperature: 1.1,
      playLookahead: false,
      combatLookahead: false,
      search: {
        enabled: false,
        maxDepth: 1,
        maxNodes: 8,
        maxBranching: 4,
        rolloutDepth: 0,
        useTransposition: false,
      },
      weights: {
        health: 1.0,
        aggression: 1.0,
        boardPresence: 1.0,
        boardPower: 1.0,
        boardDurability: 1.0,
        handSize: 0.8,
      },
    };

    const state = createTestGameState({
      ruleset: { allowCombatTricks: true },
      phase: {
        type: 'combat_priority',
        window: 'post_blockers',
        confirmedAttackers: ['atk_1'],
        blockers: {},
        attackerBlockerOrder: {},
        priorityPlayer: 'player2',
        passCount: 0,
        stack: [],
      },
      activePlayer: 'player1',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [
          makeCardInstance('fire_blazing_speed'),
          makeCardInstance('fire_forge_hammer'),
        ],
        board: [myCreature, null, null, null, null],
      },
    });

    const actionA = chooseAction(state, 'player2', createRNG(777), config);
    const actionB = chooseAction(state, 'player2', createRNG(777), config);
    expect(actionA).toEqual(actionB);
  });
});

// ─── Discard Phase ───

describe('discard phase', () => {
  it('discards the most expensive card', () => {
    const state = createTestGameState({
      phase: { type: 'discard', player: 'player2', mustDiscard: 1 },
      player2: {
        hand: [
          makeCardInstance('fire_ember_sprite'),  // cost 1
          makeCardInstance('fire_dragon_whelp'),  // cost 5
          makeCardInstance('fire_lava_hound'),    // cost 2
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(action.type).toBe('DISCARD_CARD');
    if (action.type === 'DISCARD_CARD') {
      expect(action.cardIndex).toBe(1); // dragon whelp is the most expensive
    }
  });
});

// ─── Tree Search Policy ───

describe('tree search policy', () => {
  const treeSearchConfig: AIConfig = {
    difficulty: 'very_hard',
    personality: 'balanced',
    policy: 'tree_search',
    temperature: 0.15,
    playLookahead: true,
    combatLookahead: true,
    search: {
      enabled: true,
      maxDepth: 2,
      maxNodes: 64,
      maxBranching: 6,
      rolloutDepth: 1,
      useTransposition: true,
    },
    weights: {
      health: 1.0,
      aggression: 1.0,
      boardPresence: 1.0,
      boardPower: 1.0,
      boardDurability: 1.0,
      handSize: 0.8,
    },
  };

  it('returns a legal non-concede action when tree search is enabled', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 3,
        maxEnergy: 3,
        hand: [
          makeCardInstance('fire_ember_sprite'),
          makeCardInstance('fire_lava_hound'),
          makeCardInstance('fire_magma_golem'),
        ],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(99), treeSearchConfig);
    const legal = enumerateLegalActions(state, 'player2').filter((a) => a.type !== 'CONCEDE');
    expect(legal).toContainEqual(action);
  });

  it('falls back to heuristic path when rng is not stateful', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [
          makeCardInstance('fire_ember_sprite'),
          makeCardInstance('fire_lava_hound'),
        ],
      },
    });

    const nonSeededRng = () => 0.42;
    const action = chooseAction(state, 'player2', nonSeededRng, treeSearchConfig);
    const legal = enumerateLegalActions(state, 'player2').filter((a) => a.type !== 'CONCEDE');
    expect(legal).toContainEqual(action);
  });

  it('never selects a target-required spell with no legal targets under tree search', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [
          makeCardInstance('fire_fireball'),
          makeCardInstance('water_splash'),
        ],
      },
      player1: {
        board: [null, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(31415), treeSearchConfig);
    expect(action.type).not.toBe('CONCEDE');
    if (action.type === 'PLAY_CARD') {
      expect(state.players.player2.hand[action.cardIndex].cardId).toBe('water_splash');
    }
  });

  it('advances when only targetless targeted spells are available under tree search', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [makeCardInstance('fire_fireball')],
      },
      player1: {
        board: [null, null, null, null, null],
      },
    });

    const action = chooseAction(state, 'player2', createRNG(27182), treeSearchConfig);
    expect(action).toEqual({ type: 'ADVANCE_PHASE' });
  });
});

// ─── Safety: Never returns invalid action ───

describe('action validity', () => {
  it('never returns an action not in the legal actions list', () => {
    const rng = createRNG(12345);

    const scenarios: { phase: Phase; activePlayer: 'player1' | 'player2' }[] = [
      {
        phase: { type: 'mulligan', player: 'player2' },
        activePlayer: 'player2',
      },
      {
        phase: { type: 'draw' },
        activePlayer: 'player2',
      },
      {
        phase: { type: 'energy' },
        activePlayer: 'player2',
      },
      {
        phase: { type: 'play' },
        activePlayer: 'player2',
      },
    ];

    for (const scenario of scenarios) {
      const state = createTestGameState({
        phase: scenario.phase,
        activePlayer: scenario.activePlayer,
        player2: {
          currentEnergy: 3,
          maxEnergy: 3,
          hand: [
            makeCardInstance('fire_ember_sprite'),
            makeCardInstance('fire_lava_hound'),
          ],
        },
      });

      const action = chooseAction(state, 'player2', rng, DEFAULT_AI_CONFIG);
      const legalActions = enumerateLegalActions(state, 'player2');

      const isLegal = legalActions.some((la) =>
        JSON.stringify(la) === JSON.stringify(action),
      );
      expect(isLegal).toBe(true);
    }
  });
});

// ─── runAITurn ───

describe('runAITurn', () => {
  it('produces a sequence of actions and the final state', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 2,
        maxEnergy: 2,
        hand: [
          makeCardInstance('fire_ember_sprite'),  // cost 1
          makeCardInstance('fire_lava_hound'),    // cost 2
        ],
      },
    });

    const result = runAITurn(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.finalState).toBeDefined();
    expect(result.events).toBeDefined();
  });

  it('does not get stuck in an infinite loop', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [],
      },
    });

    const start = Date.now();
    const result = runAITurn(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    const elapsed = Date.now() - start;

    // Should complete very quickly
    expect(elapsed).toBeLessThan(1000);
    expect(result.finalState).toBeDefined();
  });

  it('stops when the active player changes', () => {
    // Start in play phase where AI has no cards — it will advance to battle,
    // then declare/confirm attackers, then blocker phase belongs to opponent.
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        currentEnergy: 0,
        maxEnergy: 0,
        hand: [],
      },
    });

    const result = runAITurn(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    // Should have advanced phase and gone through battle
    expect(result.actions.length).toBeGreaterThanOrEqual(1);
  });

  it('handles mulligan turn', () => {
    const state = createTestGameState({
      phase: { type: 'mulligan', player: 'player2' },
      player2: {
        hand: [
          makeCardInstance('fire_ember_sprite'), // cost 1, low cost
          makeCardInstance('fire_lava_hound'),   // cost 2
        ],
      },
    });

    const result = runAITurn(state, 'player2', createRNG(42), DEFAULT_AI_CONFIG);
    expect(result.actions.length).toBe(1);
    expect(result.actions[0].type).toBe('KEEP_HAND');
  });
});
