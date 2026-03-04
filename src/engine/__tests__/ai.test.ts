import { describe, it, expect, beforeEach } from 'vitest';
import { chooseAction, runAITurn } from '../ai';
import { createRNG } from '../prng';
import { enumerateLegalActions } from '../validation';
import type { AIConfig } from '../aiConfig';
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
    expect(action).toEqual({ type: 'ADVANCE_PHASE' });
  });

  it('advances through energy phase', () => {
    const state = createTestGameState({
      phase: { type: 'energy' },
      activePlayer: 'player2',
    });

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
    expect(action.type).toBe('PLAY_CARD');
    if (action.type === 'PLAY_CARD') {
      expect(action.targetSlot).toBe(0);
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
    expect(action.type).toBe('CONFIRM_ATTACKERS');
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

    const action = chooseAction(state, 'player2', createRNG(42));
    // Should confirm without blocking (1 damage is not >= 3)
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

    const action = chooseAction(state, 'player2', createRNG(42));
    expect(action.type).toBe('CONFIRM_BLOCKERS');
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

    const action = chooseAction(state, 'player2', createRNG(42));
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

      const action = chooseAction(state, 'player2', rng);
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

    const result = runAITurn(state, 'player2', createRNG(42));
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
    const result = runAITurn(state, 'player2', createRNG(42));
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

    const result = runAITurn(state, 'player2', createRNG(42));
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

    const result = runAITurn(state, 'player2', createRNG(42));
    expect(result.actions.length).toBe(1);
    expect(result.actions[0].type).toBe('KEEP_HAND');
  });
});
