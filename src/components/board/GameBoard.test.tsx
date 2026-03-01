import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createTestGameState, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { GameDispatchProvider } from '@game/GameDispatchContext';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { GameBoard } from './GameBoard';

describe('GameBoard', () => {
  beforeEach(() => {
    resetTestCounters();
    useUIStore.getState().clearUI();
    useGameStore.setState({
      state: createTestGameState({
        phase: { type: 'play' },
      }),
      legalActions: [],
      humanPlayer: 'player1',
      events: [],
      gameId: 'test-game',
      player1DeckIds: [],
      player2DeckIds: [],
    });
    document.body.classList.remove('game-active');
  });

  it('applies and removes the game-active body class for text-selection lock', () => {
    const { unmount } = render(
      <GameDispatchProvider controller={null}>
        <GameBoard />
      </GameDispatchProvider>,
    );

    expect(document.body).toHaveClass('game-active');
    unmount();
    expect(document.body).not.toHaveClass('game-active');
  });
});

