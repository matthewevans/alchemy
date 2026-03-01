import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTestGameState, makeCardInstance, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
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

  it('suppresses context menu interactions on the game surface', () => {
    const { container } = render(
      <GameDispatchProvider controller={null}>
        <GameBoard />
      </GameDispatchProvider>,
    );

    const surface = container.querySelector('.game-surface');
    expect(surface).toBeTruthy();

    const prevented = !fireEvent.contextMenu(surface!);
    expect(prevented).toBe(true);
  });

  it('opens graveyard viewer when discard pile is tapped', () => {
    useGameStore.setState({
      state: createTestGameState({
        phase: { type: 'play' },
        player1: {
          discard: [makeCardInstance('water_healing_rain'), makeCardInstance('water_healing_rain')],
        },
      }),
      legalActions: [],
      humanPlayer: 'player1',
      events: [],
      gameId: 'test-game',
      player1DeckIds: [],
      player2DeckIds: [],
    });

    render(
      <GameDispatchProvider controller={null}>
        <GameBoard />
      </GameDispatchProvider>,
    );

    fireEvent.click(screen.getByTestId('discard-pile-player1'));
    expect(screen.getByText('Your Graveyard')).toBeInTheDocument();
    expect(screen.getByText('Healing Rain')).toBeInTheDocument();
  });
});
