import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTestGameState } from '@engine/__tests__/__fixtures__/testHelpers';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { BlockAssignmentLines } from './BlockAssignmentLines';

describe('BlockAssignmentLines', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      positions: new Map(),
      queue: [],
      activeStep: null,
      isAnimating: false,
    });
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
    useAnimationStore.setState({
      positions: new Map([
        ['blk-1', { x: 100, y: 250, width: 70, height: 100 }],
        ['atk-1', { x: 260, y: 130, width: 70, height: 100 }],
      ]),
    });

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
});
