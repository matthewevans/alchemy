import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import { useGameStore } from './gameStore';
import { groupEventsIntoSteps, getPositions, useAnimationStore, STEP_DURATIONS } from './animationStore';
import type { AnimationStep, BoardSnapshot } from './animationStore';

type LocalActionHandler = (action: GameAction, actingPlayer: PlayerId) => void;

export function dispatchWithAnimations(
  action: GameAction,
  actingPlayer: PlayerId,
  onLocalAction?: LocalActionHandler,
): GameEvent[] {
  // Read positions before dispatch so dying creatures still have entries.
  const positions = getPositions();

  // Snapshot permanentId → cardId before dispatch so we can resolve
  // the attacking creature's element even after it dies in combat.
  const { state, humanPlayer } = useGameStore.getState();
  const cardIdMap = new Map<string, string>();
  let preDispatchBoard: BoardSnapshot | null = null;
  if (state) {
    for (const player of Object.values(state.players)) {
      for (const perm of player.board) {
        if (perm) {
          cardIdMap.set(perm.permanentId, perm.cardId);
        }
      }
    }
    preDispatchBoard = {
      player1: [...state.players.player1.board],
      player2: [...state.players.player2.board],
    };
  }

  const events = useGameStore.getState().dispatch(action, actingPlayer);

  onLocalAction?.(action, actingPlayer);

  const steps = groupEventsIntoSteps(events, positions, cardIdMap);

  // Prepend a card reveal step when the opponent plays a card,
  // so the human player can see what was played before effects resolve.
  if (actingPlayer !== humanPlayer) {
    const cardPlayedEvent = events.find((e) => e.type === 'CARD_PLAYED');
    if (cardPlayedEvent && cardPlayedEvent.type === 'CARD_PLAYED') {
      const revealStep: AnimationStep = {
        effects: [{ type: 'card_reveal', cardId: cardPlayedEvent.cardId }],
        durationMs: STEP_DURATIONS.cardReveal,
      };
      steps.unshift(revealStep);
    }
  }

  if (steps.length > 0) {
    // Preserve pre-dispatch board when deaths occur so dying creatures
    // remain visible during combat animations preceding the death step.
    const hasDeaths = steps.some((s) => s.effects.some((e) => e.type === 'death'));
    if (hasDeaths && preDispatchBoard) {
      useAnimationStore.getState().setBoardSnapshot(preDispatchBoard);
    }

    // Initialize display health overlay so player HP updates per-step during animations
    // instead of jumping to the final value immediately.
    const hasHealthEffects = steps.some((s) =>
      s.effects.some((e) => e.type === 'player_damage' || e.type === 'player_heal'),
    );
    if (hasHealthEffects && state) {
      useAnimationStore.getState().setDisplayHealth({
        player1: state.players.player1.health,
        player2: state.players.player2.health,
      });
    }

    useAnimationStore.getState().enqueueSteps(steps);
  }

  return events;
}

