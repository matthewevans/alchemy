import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIER_CONFIGS } from '@engine/ruleset';
import { createRNG } from '@engine/prng';
import { useGameStore } from './gameStore';
import { saveGame } from '@storage/persistence';

vi.mock('@storage/persistence', () => ({
  saveGame: vi.fn(),
  clearSavedGame: vi.fn(),
  saveActiveGameId: vi.fn(),
}));

const TEST_DECK = Array.from({ length: 20 }, () => 'fire_ember_sprite');

function initTestGame() {
  useGameStore.getState().initGame(
    {
      ruleset: TIER_CONFIGS.apprentice,
      player1Deck: TEST_DECK,
      player2Deck: TEST_DECK,
      rng: createRNG(7),
    },
    'player1',
  );
}

describe('gameStore autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useGameStore.getState().suspend();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useGameStore.getState().suspend();
  });

  it('debounces rapid dispatch autosaves into a single save', () => {
    initTestGame();
    vi.mocked(saveGame).mockClear(); // Ignore init save

    useGameStore.getState().dispatch({ type: 'KEEP_HAND' }, 'player1');
    useGameStore.getState().dispatch({ type: 'KEEP_HAND' }, 'player2');

    expect(saveGame).not.toHaveBeenCalled();

    vi.advanceTimersByTime(249);
    expect(saveGame).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(saveGame).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending autosave when game transitions to game_over', () => {
    initTestGame();
    vi.mocked(saveGame).mockClear(); // Ignore init save

    useGameStore.getState().dispatch({ type: 'KEEP_HAND' }, 'player1'); // schedules autosave
    useGameStore.getState().dispatch({ type: 'CONCEDE' }, 'player2'); // game over cancels autosave

    vi.runAllTimers();
    expect(saveGame).not.toHaveBeenCalled();
  });
});
