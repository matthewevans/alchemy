import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../gameInit';
import type { GameInitConfig } from '../gameInit';
import { TIER_CONFIGS } from '../ruleset';
import { CARD_REGISTRY } from '../cards';
import { createRNG } from '../prng';

// ─── Helpers ───

const FIRE_CARDS = [
  'fire_ember_sprite',
  'fire_flame_fox',
  'fire_lava_hound',
  'fire_fire_dancer',
  'fire_magma_golem',
  'fire_phoenix_chick',
  'fire_dragon_whelp',
  'fire_fireball',
  'fire_eruption',
  'fire_blazing_speed',
];

const WATER_CARDS = [
  'water_tide_sprite',
  'water_shell_crab',
  'water_river_otter',
  'water_coral_guardian',
  'water_storm_turtle',
  'water_frost_serpent',
  'water_tidal_whale',
  'water_splash',
  'water_tidal_wave',
  'water_healing_rain',
];

/** 20-card apprentice fire deck (2 copies of each). */
function makeFireDeck(): string[] {
  return [...FIRE_CARDS, ...FIRE_CARDS];
}

/** 20-card apprentice water deck (2 copies of each). */
function makeWaterDeck(): string[] {
  return [...WATER_CARDS, ...WATER_CARDS];
}

/** Build a deck with a mix of costs — some low (1-2) and some high (3+). */
function makeMixedCostDeck(): string[] {
  return makeFireDeck();
}

function makeConfig(overrides?: Partial<GameInitConfig>): GameInitConfig {
  return {
    ruleset: TIER_CONFIGS.apprentice,
    player1Deck: makeFireDeck(),
    player2Deck: makeWaterDeck(),
    rng: createRNG(42),
    ...overrides,
  };
}

// ─── Tests ───

describe('createInitialGameState', () => {
  it('returns a GameState in mulligan phase', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.phase.type).toBe('mulligan');
  });

  it('mulligan phase targets starting player', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.phase).toEqual({ type: 'mulligan', player: 'player1' });
  });

  it('both players have hands of startingHandSize', () => {
    const config = makeConfig();
    const state = createInitialGameState(config);
    expect(state.players.player1.hand).toHaveLength(
      config.ruleset.startingHandSize,
    );
    expect(state.players.player2.hand).toHaveLength(
      config.ruleset.startingHandSize,
    );
  });

  it('both players have deck.length = deckSize - startingHandSize', () => {
    const config = makeConfig();
    const state = createInitialGameState(config);
    const expectedDeckSize =
      config.ruleset.deckSize - config.ruleset.startingHandSize;
    expect(state.players.player1.deck).toHaveLength(expectedDeckSize);
    expect(state.players.player2.deck).toHaveLength(expectedDeckSize);
  });

  it('both players start with 0 energy', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.players.player1.maxEnergy).toBe(0);
    expect(state.players.player1.currentEnergy).toBe(0);
    expect(state.players.player2.maxEnergy).toBe(0);
    expect(state.players.player2.currentEnergy).toBe(0);
  });

  it('both players start with correct starting health', () => {
    const config = makeConfig();
    const state = createInitialGameState(config);
    expect(state.players.player1.health).toBe(config.ruleset.startingHealth);
    expect(state.players.player2.health).toBe(config.ruleset.startingHealth);
  });

  it('board has maxBoardSize null slots per player', () => {
    const config = makeConfig();
    const state = createInitialGameState(config);
    expect(state.players.player1.board).toHaveLength(
      config.ruleset.maxBoardSize,
    );
    expect(state.players.player2.board).toHaveLength(
      config.ruleset.maxBoardSize,
    );
    expect(state.players.player1.board.every((slot) => slot === null)).toBe(
      true,
    );
    expect(state.players.player2.board.every((slot) => slot === null)).toBe(
      true,
    );
  });

  it('turn starts at 0', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.turn).toBe(0);
  });

  it('active player matches startingPlayer config', () => {
    const state = createInitialGameState(
      makeConfig({ startingPlayer: 'player2' }),
    );
    expect(state.activePlayer).toBe('player2');
    expect(state.phase).toEqual({ type: 'mulligan', player: 'player2' });
  });

  it('default starting player is player1', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.activePlayer).toBe('player1');
  });

  it('both players start with empty discard piles', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.players.player1.discard).toHaveLength(0);
    expect(state.players.player2.discard).toHaveLength(0);
  });

  it('both players start with fatigueDamage 0', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.players.player1.fatigueDamage).toBe(0);
    expect(state.players.player2.fatigueDamage).toBe(0);
  });

  it('both players start with mulliganUsed false', () => {
    const state = createInitialGameState(makeConfig());
    expect(state.players.player1.mulliganUsed).toBe(false);
    expect(state.players.player2.mulliganUsed).toBe(false);
  });

  it('ruleset is preserved from config', () => {
    const config = makeConfig();
    const state = createInitialGameState(config);
    expect(state.ruleset).toBe(config.ruleset);
  });

  it('total cards (hand + deck) equals deckSize per player', () => {
    const config = makeConfig();
    const state = createInitialGameState(config);
    const p1Total =
      state.players.player1.hand.length + state.players.player1.deck.length;
    const p2Total =
      state.players.player2.hand.length + state.players.player2.deck.length;
    expect(p1Total).toBe(config.ruleset.deckSize);
    expect(p2Total).toBe(config.ruleset.deckSize);
  });

  it('opening hand smoothing guarantees a low-cost card with mixed deck', () => {
    // Run with several seeds to verify the guarantee holds
    for (let seed = 0; seed < 20; seed++) {
      const config = makeConfig({
        player1Deck: makeMixedCostDeck(),
        player2Deck: makeMixedCostDeck(),
        rng: createRNG(seed),
      });
      const state = createInitialGameState(config);

      const p1HasLowCost = state.players.player1.hand.some(
        (c) => CARD_REGISTRY[c.cardId].cost <= 2,
      );
      const p2HasLowCost = state.players.player2.hand.some(
        (c) => CARD_REGISTRY[c.cardId].cost <= 2,
      );
      expect(p1HasLowCost).toBe(true);
      expect(p2HasLowCost).toBe(true);
    }
  });

  it('works with alchemist ruleset', () => {
    const alchemistCards = Object.values(CARD_REGISTRY)
      .filter((c) => c.tier === 'apprentice')
      .map((c) => c.id);
    // Build a 30-card deck for alchemist (3 copies allowed)
    const deck: string[] = [];
    for (const id of alchemistCards) {
      deck.push(id);
      if (deck.length >= 30) break;
    }

    const config = makeConfig({
      ruleset: TIER_CONFIGS.alchemist,
      player1Deck: deck,
      player2Deck: deck,
    });
    const state = createInitialGameState(config);
    expect(state.players.player1.hand).toHaveLength(5);
    expect(state.players.player1.deck).toHaveLength(25);
    expect(state.players.player1.health).toBe(25);
    expect(state.players.player1.board).toHaveLength(6);
  });
});
