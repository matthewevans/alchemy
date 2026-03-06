import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createTestGameState, makeCardInstance, makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';
import { GameDispatchProvider } from '@game/GameDispatchContext';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { createRNG } from '@engine/prng';
import { useAudioStore } from '@audio/audioStore';
import { GameBoard } from './GameBoard';

describe('GameBoard', () => {
  beforeEach(() => {
    resetTestCounters();
    useUIStore.getState().clearUI();
    useAudioStore.setState({ sfxVolume: 0 });
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
    expect(screen.queryByRole('button', { name: 'Block!' })).not.toBeInTheDocument();
    expect(screen.getByTestId('skip-block-btn')).toHaveAttribute('data-armed', 'false');
  });

  it('renders combat priority controls with stack preview and pass action', () => {
    useGameStore.setState({
      state: createTestGameState({
        ruleset: { allowCombatTricks: true },
        phase: {
          type: 'combat_priority',
          window: 'post_attackers',
          confirmedAttackers: ['atk_1'],
          blockers: {},
          attackerBlockerOrder: {},
          priorityPlayer: 'player1',
          passCount: 0,
          stack: [
            {
              stackId: 'stack_1',
              cardId: 'fire_fireball',
              effectId: 'fireball',
              casterId: 'player1',
              selectedTarget: null,
              surchargePaid: 1,
            },
          ],
        },
      }),
      legalActions: [{ type: 'PASS_PRIORITY' }],
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

    expect(screen.getByText('Before Blockers')).toBeInTheDocument();
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolve Top Spell' })).toBeInTheDocument();
  });

  it('uses contextual priority copy when passing moves to blockers', () => {
    useGameStore.setState({
      state: createTestGameState({
        ruleset: { allowCombatTricks: true },
        phase: {
          type: 'combat_priority',
          window: 'post_attackers',
          confirmedAttackers: ['atk_1'],
          blockers: {},
          attackerBlockerOrder: {},
          priorityPlayer: 'player1',
          passCount: 1,
          stack: [],
        },
      }),
      legalActions: [{ type: 'PASS_PRIORITY' }],
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

    expect(screen.getByRole('button', { name: 'Proceed to Blockers' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Attack!' })).not.toBeInTheDocument();
    expect(screen.getByTestId('skip-attack-btn')).toHaveAttribute('data-armed', 'false');
  });

  it('No Attacks requires two taps when attacks are available', async () => {
    const attackerA = makePermanent('fire_ember_sprite', 'player1');

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_attackers',
          tentativeAttackers: [],
        },
        activePlayer: 'player1',
        player1: {
          board: [attackerA, null, null, null, null, null],
        },
      }),
      legalActions: [
        { type: 'CONFIRM_ATTACKERS' },
        { type: 'DECLARE_ATTACKER', permanentId: attackerA.permanentId },
      ],
      rng: createRNG(123),
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

    fireEvent.click(screen.getByRole('button', { name: 'No Attacks' }));
    expect(screen.getByRole('button', { name: 'Tap again: No Attacks' })).toBeInTheDocument();
    expect(screen.getByTestId('skip-attack-btn')).toHaveAttribute('data-armed', 'true');

    const armedPhase = useGameStore.getState().state?.phase;
    expect(armedPhase?.type).toBe('battle');
    expect(armedPhase?.type === 'battle' && armedPhase.step).toBe('declare_attackers');

    fireEvent.click(screen.getByRole('button', { name: 'Tap again: No Attacks' }));

    await waitFor(() => {
      const phase = useGameStore.getState().state?.phase;
      expect(phase).toEqual({ type: 'play', postCombat: true });
    });
  });

  it('All Attack toggles attacker selection and does not auto-confirm combat', async () => {
    const attackerA = makePermanent('fire_ember_sprite', 'player1');
    const attackerB = makePermanent('fire_lava_hound', 'player1');

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_attackers',
          tentativeAttackers: [],
        },
        activePlayer: 'player1',
        player1: {
          board: [attackerA, attackerB, null, null, null, null],
        },
      }),
      legalActions: [
        { type: 'CONFIRM_ATTACKERS' },
        { type: 'DECLARE_ATTACKER', permanentId: attackerA.permanentId },
        { type: 'DECLARE_ATTACKER', permanentId: attackerB.permanentId },
      ],
      rng: createRNG(123),
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

    fireEvent.click(screen.getByRole('button', { name: 'All Attack' }));

    await waitFor(() => {
      const phase = useGameStore.getState().state?.phase;
      expect(phase?.type).toBe('battle');
      expect(phase?.type === 'battle' && phase.step).toBe('declare_attackers');
      expect(phase?.type === 'battle' && phase.step === 'declare_attackers' && phase.tentativeAttackers.length).toBe(2);
    });

    expect(screen.getByRole('button', { name: 'Attack!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Attackers' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'No Attacks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All Attack' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Attackers' }));

    await waitFor(() => {
      const phase = useGameStore.getState().state?.phase;
      expect(phase?.type).toBe('battle');
      expect(phase?.type === 'battle' && phase.step).toBe('declare_attackers');
      expect(phase?.type === 'battle' && phase.step === 'declare_attackers' && phase.tentativeAttackers.length).toBe(0);
    });

    expect(screen.getByRole('button', { name: 'No Attacks' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Attack!' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Attack' })).toBeInTheDocument();
    expect(screen.getByTestId('skip-attack-btn')).toHaveAttribute('data-armed', 'false');
  });

  it('assigned blockers show Clear Blocks + Block! and hide No Blocks', () => {
    const attacker = makePermanent('fire_ember_sprite', 'player2');
    const blocker = makePermanent('water_coral_guardian', 'player1');

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: [attacker.permanentId],
          tentativeBlockers: { [blocker.permanentId]: attacker.permanentId },
        },
        activePlayer: 'player2',
        player1: {
          board: [blocker, null, null, null, null, null],
        },
        player2: {
          board: [attacker, null, null, null, null, null],
        },
      }),
      legalActions: [
        { type: 'CONFIRM_BLOCKERS' },
        { type: 'REMOVE_BLOCKER', blockerPermanentId: blocker.permanentId },
      ],
      rng: createRNG(123),
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

    expect(screen.getByRole('button', { name: 'Clear Blocks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Block!' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'No Blocks' })).not.toBeInTheDocument();
  });

  it('No Blocks requires two taps when blocking choices are available', async () => {
    const attacker = makePermanent('fire_ember_sprite', 'player2');
    const blocker = makePermanent('water_coral_guardian', 'player1');

    useGameStore.setState({
      state: createTestGameState({
        phase: {
          type: 'battle',
          step: 'declare_blockers',
          confirmedAttackers: [attacker.permanentId],
          tentativeBlockers: {},
        },
        activePlayer: 'player2',
        player1: {
          board: [blocker, null, null, null, null, null],
        },
        player2: {
          board: [attacker, null, null, null, null, null],
        },
      }),
      legalActions: [
        { type: 'CONFIRM_BLOCKERS' },
        {
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: blocker.permanentId,
          attackerPermanentId: attacker.permanentId,
        },
      ],
      rng: createRNG(123),
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

    fireEvent.click(screen.getByRole('button', { name: 'No Blocks' }));
    expect(screen.getByRole('button', { name: 'Tap again: No Blocks' })).toBeInTheDocument();
    expect(screen.getByTestId('skip-block-btn')).toHaveAttribute('data-armed', 'true');

    const armedPhase = useGameStore.getState().state?.phase;
    expect(armedPhase?.type).toBe('battle');
    expect(armedPhase?.type === 'battle' && armedPhase.step).toBe('declare_blockers');

    fireEvent.click(screen.getByRole('button', { name: 'Tap again: No Blocks' }));

    await waitFor(() => {
      const phase = useGameStore.getState().state?.phase;
      expect(phase).toEqual({ type: 'play', postCombat: true });
    });
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
