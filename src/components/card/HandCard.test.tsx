import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('shows an explicit card type label in the text box', () => {
    render(
      <HandCard
        cardInstance={{ instanceId: 'c2', cardId: 'earth_mushroom_guard' }}
        isPlayable
        isSelected={false}
        onClick={() => {}}
        onHover={() => {}}
      />,
    );

    expect(screen.getByTestId('hand-card-type-label')).toHaveTextContent('Creature');
  });

  it('shows instant surcharge cost and hover explanation when provided', () => {
    render(
      <HandCard
        cardInstance={{ instanceId: 'c3', cardId: 'fire_fireball' }}
        isPlayable
        isSelected={false}
        costOverride={3}
        costHint="Combat instant cast: 2 base + 1 surcharge = 3 (before blockers)."
        highlightCost
        onClick={() => {}}
        onHover={() => {}}
      />,
    );

    expect(screen.getByTestId('hand-card-cost')).toHaveTextContent('×3');
    const cost = screen.getByTestId('hand-card-cost');
    expect(cost).toHaveAttribute('title', 'Combat instant cast: 2 base + 1 surcharge = 3 (before blockers).');
    fireEvent.mouseEnter(cost);
    expect(screen.getByTestId('hand-card-cost-tooltip')).toHaveTextContent('Combat instant cast');
  });
});
