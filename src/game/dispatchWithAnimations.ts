import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import { useGameStore } from './gameStore';
import { groupEventsIntoSteps, getPositions, useAnimationStore } from './animationStore';

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
  const state = useGameStore.getState().state;
  const cardIdMap = new Map<string, string>();
  if (state) {
    for (const player of Object.values(state.players)) {
      for (const perm of player.board) {
        if (perm) {
          cardIdMap.set(perm.permanentId, perm.cardId);
        }
      }
    }
  }

  const events = useGameStore.getState().dispatch(action, actingPlayer);

  onLocalAction?.(action, actingPlayer);

  const steps = groupEventsIntoSteps(events, positions, cardIdMap);
  if (steps.length > 0) {
    useAnimationStore.getState().enqueueSteps(steps);
  }

  return events;
}

