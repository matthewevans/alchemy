import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { useGameStore } from '@game/gameStore';
import { LearningChallengeOverlay } from './LearningChallengeOverlay';

const dispatchSpy = vi.fn();

vi.mock('@game/GameDispatchContext', () => ({
  useGameDispatch: () => dispatchSpy,
}));

describe('LearningChallengeOverlay', () => {
  beforeEach(() => {
    resetTestCounters();
    dispatchSpy.mockReset();

    const attacker = makePermanent('fire_lava_hound', 'player1', {
      attack: 2,
      health: 3,
      summonedThisTurn: false,
    });

    useGameStore.setState({
      state: createTestGameState({
        activePlayer: 'player1',
        phase: {
          type: 'learning',
          player: 'player1',
          suspendedPhase: {
            type: 'battle',
            step: 'declare_attackers',
            tentativeAttackers: [attacker.permanentId],
          },
          resumeAction: { type: 'CONFIRM_ATTACKERS' },
          prompt: {
            id: 'prompt-ui-test',
            domain: 'reading',
            kind: 'missing_letter',
            prompt: 'Pick the missing letter: c_t',
            options: [
              { id: 'letter:a', text: 'A' },
              { id: 'letter:o', text: 'O' },
              { id: 'letter:u', text: 'U' },
            ],
            correctOptionId: 'letter:a',
          },
          reward: {
            permanentId: attacker.permanentId,
            attackBonus: 1,
            healthBonus: 0,
          },
        },
        player1: { board: [attacker, null, null, null, null, null] },
      }),
      legalActions: [
        { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'letter:a' },
        { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'letter:o' },
        { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'letter:u' },
        { type: 'SKIP_LEARNING_CHALLENGE' },
      ],
      humanPlayer: 'player1',
      events: [],
      gameId: 'game-overlay-test',
      player1DeckIds: [],
      player2DeckIds: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows reward details for the target creature', () => {
    render(<LearningChallengeOverlay />);

    expect(screen.getByText('Bonus Locked On')).toBeInTheDocument();
    expect(screen.getByText('Lava Hound')).toBeInTheDocument();
    expect(screen.getByText('+1 ATK')).toBeInTheDocument();
    expect(screen.getByText('+0 HP')).toBeInTheDocument();
  });

  it('renders the redesigned math prompt card', () => {
    useGameStore.setState((current) => {
      if (!current.state || current.state.phase.type !== 'learning') return current;
      return {
        ...current,
        state: {
          ...current.state,
          phase: {
            ...current.state.phase,
            prompt: {
              id: 'prompt-ui-test-math',
              domain: 'math',
              kind: 'addition',
              prompt: '7 + ? = 10',
              options: [
                { id: 'math:2', text: '2' },
                { id: 'math:3', text: '3' },
                { id: 'math:4', text: '4' },
                { id: 'math:5', text: '5' },
              ],
              correctOptionId: 'math:3',
            },
          },
        },
        legalActions: [
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'math:2' },
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'math:3' },
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'math:4' },
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'math:5' },
        ],
      };
    });

    render(<LearningChallengeOverlay />);
    expect(screen.getByText('Solve this math problem')).toBeInTheDocument();
    expect(screen.getByText('Equation')).toBeInTheDocument();
  });

  it('renders the redesigned word-to-picture prompt card', () => {
    useGameStore.setState((current) => {
      if (!current.state || current.state.phase.type !== 'learning') return current;
      return {
        ...current,
        state: {
          ...current.state,
          phase: {
            ...current.state.phase,
            prompt: {
              id: 'prompt-ui-test-word',
              domain: 'reading',
              kind: 'word_to_picture',
              prompt: 'Pick the picture for: cat',
              options: [
                { id: 'picture:cat', text: 'Picture 1', imageId: '/img/cat.webp' },
                { id: 'picture:dog', text: 'Picture 2', imageId: '/img/dog.webp' },
                { id: 'picture:hat', text: 'Picture 3', imageId: '/img/hat.webp' },
                { id: 'picture:bat', text: 'Picture 4', imageId: '/img/bat.webp' },
              ],
              correctOptionId: 'picture:cat',
            },
          },
        },
        legalActions: [
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'picture:cat' },
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'picture:dog' },
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'picture:hat' },
          { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'picture:bat' },
        ],
      };
    });

    render(<LearningChallengeOverlay />);
    expect(screen.getByText('Find the matching picture')).toBeInTheDocument();
    expect(screen.getByText('Target Word')).toBeInTheDocument();
    expect(screen.getByText('CAT')).toBeInTheDocument();
  });

  it('shows immediate success feedback and dispatches after three seconds', () => {
    vi.useFakeTimers();
    render(<LearningChallengeOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'A' }));

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Correct! Lava Hound gets +1/+0 until end of turn.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'letter:a' },
      'player1',
    );
  });

  it('shows immediate failure feedback and dispatches after three seconds', () => {
    vi.useFakeTimers();
    render(<LearningChallengeOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'O' }));

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Not quite. No bonus this time.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'O' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      { type: 'ANSWER_LEARNING_CHALLENGE', optionId: 'letter:o' },
      'player1',
    );
  });
});
