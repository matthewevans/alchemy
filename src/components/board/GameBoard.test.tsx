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

  it('renders the right sidebar as a full-height viewport panel', () => {
    render(
      <GameDispatchProvider controller={null}>
        <GameBoard />
      </GameDispatchProvider>,
    );

    const sidebar = screen.getByTestId('right-sidebar');
    expect(sidebar).toHaveClass('fixed', 'inset-y-0', 'right-0');
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

  it('renders blocker controls with No Blocks button during declare_blockers', () => {
    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: [],
          tentativeBlockers: {},
        },
        activePlayer: 'player2',
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

    expect(screen.getByTestId('combat-controls')).toHaveClass('fixed');
    expect(screen.getByTestId('blocker-controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No Blocks' })).toBeInTheDocument();
  });

  it('renders attacker controls with No Attacks button during declare_attackers', () => {
    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_attackers',
          tentativeAttackers: [],
        },
        activePlayer: 'player1',
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

    expect(screen.getByRole('button', { name: 'No Attacks' })).toBeInTheDocument();
  });

  it('renders resolving label during combat resolution', () => {
    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'resolving',
          attackers: [],
          blockers: {},
        },
        activePlayer: 'player1',
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

    expect(screen.getByText('Resolving...')).toBeInTheDocument();
  });
});
