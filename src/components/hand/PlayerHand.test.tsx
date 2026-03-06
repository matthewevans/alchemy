import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTestGameState, makeCardInstance, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { createRNG } from '@engine/prng';
import { GameDispatchProvider } from '@game/GameDispatchContext';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { PlayerHand } from './PlayerHand';

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 44_100;
  destination = {} as AudioDestinationNode;

  createGain(): GainNode {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      connect: () => {},
    } as unknown as GainNode;
  }

  createBuffer(): AudioBuffer {
    return {} as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
    } as unknown as AudioBufferSourceNode;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}

describe('PlayerHand', () => {
  beforeEach(() => {
    resetTestCounters();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      writable: true,
      value: MockAudioContext,
    });
    useUIStore.getState().clearUI();
    useGameStore.setState({
      state: createTestGameState({
        phase: { type: 'play' },
        player1: {
          maxEnergy: 3,
          currentEnergy: 3,
          hand: [makeCardInstance('fire_ember_sprite')],
        },
      }),
      legalActions: [{ type: 'PLAY_CARD', cardIndex: 0 }],
      humanPlayer: 'player1',
      events: [],
      rng: createRNG(123),
      gameId: null,
      player1DeckIds: [],
      player2DeckIds: [],
      aiConfig: null,
      sessionMeta: null,
    });
  });

  it('plays a card when dropped over opponent battlefield area', () => {
    const opponentBoard = document.createElement('div');
    opponentBoard.setAttribute('data-board-player', 'player2');
    document.body.appendChild(opponentBoard);

    const originalElementFromPoint = document.elementFromPoint;
    const elementFromPointMock = vi.fn(() => opponentBoard);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPointMock,
    });

    render(
      <GameDispatchProvider controller={null}>
        <PlayerHand />
      </GameDispatchProvider>,
    );

    const handCard = screen.getByTestId('hand-card-0').firstElementChild as HTMLElement;

    fireEvent.pointerDown(handCard, { clientX: 100, clientY: 300 });
    fireEvent.pointerMove(document, { clientX: 100, clientY: 260 });
    fireEvent.pointerUp(handCard, { clientX: 100, clientY: 260 });

    expect(elementFromPointMock).toHaveBeenCalledWith(100, 260);
    expect(useGameStore.getState().state?.players.player1.hand).toHaveLength(0);

    opponentBoard.remove();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: originalElementFromPoint,
    });
  });

  it('shows combat instant surcharge cost in hand with hover explanation', () => {
    useGameStore.setState({
      state: createTestGameState({
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
          maxEnergy: 10,
          currentEnergy: 10,
          hand: [makeCardInstance('fire_fireball')],
        },
      }),
      legalActions: [{ type: 'PLAY_CARD', cardIndex: 0 }, { type: 'PASS_PRIORITY' }],
    });

    render(
      <GameDispatchProvider controller={null}>
        <PlayerHand />
      </GameDispatchProvider>,
    );

    expect(screen.getByTestId('hand-card-cost')).toHaveTextContent('×3');
    const cost = screen.getByTestId('hand-card-cost');
    fireEvent.mouseEnter(cost);
    expect(screen.getByTestId('hand-card-cost-tooltip')).toHaveTextContent('2 base + 1 surcharge = 3');
  });
});
