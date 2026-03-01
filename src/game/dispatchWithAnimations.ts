import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import { useGameStore } from './gameStore';
import { groupEventsIntoSteps, useAnimationStore } from './animationStore';

type LocalActionHandler = (action: GameAction, actingPlayer: PlayerId) => void;

export function dispatchWithAnimations(
  action: GameAction,
  actingPlayer: PlayerId,
  onLocalAction?: LocalActionHandler,
): GameEvent[] {
  // Read positions before dispatch so dying creatures still have entries.
  const positions = useAnimationStore.getState().positions;
  const events = useGameStore.getState().dispatch(action, actingPlayer);

  onLocalAction?.(action, actingPlayer);

  const steps = groupEventsIntoSteps(events, positions);
  if (steps.length > 0) {
    useAnimationStore.getState().enqueueSteps(steps);
  }

  return events;
}

