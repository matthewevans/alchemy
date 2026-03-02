import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTestGameState } from '@engine/__tests__/__fixtures__/testHelpers';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore, registerPosition, unregisterPosition } from '@game/animationStore';
import { BlockAssignmentLines } from './BlockAssignmentLines';

describe('BlockAssignmentLines', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      queue: [],
      activeStep: null,
      isAnimating: false,
    });
    // Clear position registry
    unregisterPosition('blk-1');
    unregisterPosition('atk-1');
  });

  it('renders link lines for blocker assignments', () => {
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
    registerPosition('blk-1', { x: 100, y: 250, width: 70, height: 100 });
    registerPosition('atk-1', { x: 260, y: 130, width: 70, height: 100 });

    render(<BlockAssignmentLines />);
    expect(screen.getAllByTestId('block-assignment-line')).toHaveLength(1);
    expect(screen.getByTestId('block-assignment-overlay')).toHaveStyle({ zIndex: '100' });
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

  it('retains positions when an old component unregisters after a new one registers (AnimatePresence race)', () => {
    // Simulate: old stacked card registers position, new fanned card overwrites it,
    // then old card's cleanup tries to unregister — should NOT remove the new entry.
    const oldToken = {};
    const newToken = {};

    registerPosition('atk-1', { x: 50, y: 50, width: 70, height: 100 }, oldToken);
    // New mount overwrites with its own token
    registerPosition('atk-1', { x: 260, y: 130, width: 70, height: 100 }, newToken);
    // Old exit cleanup tries to remove — should be a no-op
    unregisterPosition('atk-1', oldToken);

    registerPosition('blk-1', { x: 100, y: 250, width: 70, height: 100 });

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
});
