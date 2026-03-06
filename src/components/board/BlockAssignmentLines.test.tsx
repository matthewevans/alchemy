import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createTestGameState } from '@engine/__tests__/__fixtures__/testHelpers';
import { useGameStore } from '@game/gameStore';
import { BlockAssignmentLines } from './BlockAssignmentLines';

/** Create a mock board card DOM element at a given position. */
function mountMockCard(permanentId: string, rect: { x: number; y: number; width: number; height: number }) {
  const el = document.createElement('div');
  el.setAttribute('data-testid', `board-card-${permanentId}`);
  el.getBoundingClientRect = () => ({ ...rect, top: rect.y, left: rect.x, right: rect.x + rect.width, bottom: rect.y + rect.height, toJSON: () => '' });
  document.body.appendChild(el);
  return el;
}

describe('BlockAssignmentLines', () => {
  const mockCards: HTMLElement[] = [];

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const el of mockCards) el.remove();
    mockCards.length = 0;
  });

  it('renders link lines for blocker assignments', () => {
    mockCards.push(
      mountMockCard('blk-1', { x: 100, y: 250, width: 70, height: 100 }),
      mountMockCard('atk-1', { x: 260, y: 130, width: 70, height: 100 }),
    );

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: ['atk-1'],
          tentativeBlockers: { 'blk-1': 'atk-1' },
        },
      }),
    });

    render(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(1);
    expect(screen.getByTestId('block-assignment-overlay')).toHaveStyle({ zIndex: '45' });
  });

  it('renders nothing outside declare_blockers phase', () => {
    useGameStore.setState({
      state: createTestGameState({
        phase: { type: 'play' },
      }),
    });

    const { container } = render(<BlockAssignmentLines />);
    expect(container.firstChild).toBeNull();
  });

  it('renders lines even when position registry has no entries (direct DOM query)', () => {
    // BlockAssignmentLines now queries the DOM directly, so it works
    // regardless of position registry state — as long as the card elements exist.
    mockCards.push(
      mountMockCard('blk-1', { x: 100, y: 250, width: 70, height: 100 }),
      mountMockCard('atk-1', { x: 260, y: 130, width: 70, height: 100 }),
    );

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: ['atk-1'],
          tentativeBlockers: { 'blk-1': 'atk-1' },
        },
      }),
    });

    render(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(1);
  });

  it('updates lines when a new blocker is assigned', () => {
    mockCards.push(
      mountMockCard('blk-1', { x: 100, y: 250, width: 70, height: 100 }),
      mountMockCard('blk-2', { x: 200, y: 250, width: 70, height: 100 }),
      mountMockCard('atk-1', { x: 260, y: 130, width: 70, height: 100 }),
      mountMockCard('atk-2', { x: 360, y: 130, width: 70, height: 100 }),
    );

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: ['atk-1', 'atk-2'],
          tentativeBlockers: { 'blk-1': 'atk-1' },
        },
      }),
    });

    const { rerender } = render(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(1);

    // Assign a second blocker
    act(() => {
      useGameStore.setState({
        state: createTestGameState({
          phase: {
            type: 'battle',
            step: 'declare_blockers',
            confirmedAttackers: ['atk-1', 'atk-2'],
            tentativeBlockers: { 'blk-1': 'atk-1', 'blk-2': 'atk-2' },
          },
        }),
      });
    });

    rerender(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(2);
  });

  it('removes the link when a blocker is unassigned', () => {
    mockCards.push(
      mountMockCard('blk-1', { x: 100, y: 250, width: 70, height: 100 }),
      mountMockCard('atk-1', { x: 260, y: 130, width: 70, height: 100 }),
    );

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: ['atk-1'],
          tentativeBlockers: { 'blk-1': 'atk-1' },
        },
      }),
    });

    const { rerender } = render(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(1);

    act(() => {
      useGameStore.setState({
        state: createTestGameState({
          phase: {
            type: 'battle',
            step: 'declare_blockers',
            confirmedAttackers: ['atk-1'],
            tentativeBlockers: {},
          },
        }),
      });
    });

    rerender(<BlockAssignmentLines />);
    expect(screen.queryByTestId('block-assignment-line')).toBeNull();
    expect(screen.queryByTestId('block-assignment-overlay')).toBeNull();
  });

  it('renders lines during post_blockers combat priority', () => {
    mockCards.push(
      mountMockCard('p1:fire_magma_sentinel#0', { x: 100, y: 250, width: 70, height: 100 }),
      mountMockCard('p2:earth_mountain_giant#1', { x: 260, y: 130, width: 70, height: 100 }),
    );

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'combat_priority',
          window: 'post_blockers',
          confirmedAttackers: ['p2:earth_mountain_giant#1'],
          blockers: { 'p1:fire_magma_sentinel#0': 'p2:earth_mountain_giant#1' },
          attackerBlockerOrder: { 'p2:earth_mountain_giant#1': ['p1:fire_magma_sentinel#0'] },
          priorityPlayer: 'player2',
          passCount: 1,
          stack: [],
        },
        activePlayer: 'player2',
      }),
    });

    render(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(1);
  });
});
