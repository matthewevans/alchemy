import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTestGameState } from '@engine/__tests__/__fixtures__/testHelpers';
import { useGameStore } from '@game/gameStore';
import { CardPreview } from './CardPreview';

describe('CardPreview', () => {
  beforeEach(() => {
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
      }),
    });
  });

  it('renders preview from HandCard verbose and keeps surcharge presentation consistent', () => {
    render(<CardPreview cardId="fire_fireball" onDismiss={() => {}} />);

    expect(screen.getByLabelText('Fireball details')).toBeInTheDocument();
    expect(screen.getByTestId('hand-card-type-label')).toHaveTextContent('Spell');
    expect(screen.getByTestId('hand-card-cost')).toHaveTextContent('×3');

    fireEvent.mouseEnter(screen.getByTestId('hand-card-cost'));
    expect(screen.getByTestId('hand-card-cost-tooltip')).toHaveTextContent('2 base + 1 surcharge = 3');
  });
});

