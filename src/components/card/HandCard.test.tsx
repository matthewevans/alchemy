import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HandCard } from './HandCard';

describe('HandCard layout metadata', () => {
  it('renders cost gem as the right-most item in header', () => {
    render(
      <HandCard
        cardInstance={{ instanceId: 'c1', cardId: 'fire_fireball' }}
        isPlayable
        isSelected={false}
        onClick={() => {}}
        onHover={() => {}}
      />,
    );

    const header = screen.getByTestId('hand-card-header');
    const cost = screen.getByTestId('hand-card-cost');
    expect(header.lastElementChild).toBe(cost);
  });

  it('shows an explicit card type label in verbose (preview) mode', () => {
    render(
      <HandCard
        cardInstance={{ instanceId: 'c2', cardId: 'earth_mushroom_guard' }}
        isPlayable
        isSelected={false}
        verbose
        onClick={() => {}}
        onHover={() => {}}
      />,
    );

    expect(screen.getByTestId('hand-card-type-label')).toHaveTextContent('Creature');
  });
});

