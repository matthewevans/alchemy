import { useCallback } from 'react';
import type { GameAction, GameState, PlayerId } from '@engine/types';
import { getActionFeedback } from '@game/feedbackMessages';
import { useUIStore } from '@game/uiStore';

/**
 * Returns a function that shows kid-friendly feedback when an action is invalid.
 * Call from any component with a state, action, player, and DOM element.
 */
export function useActionFeedback() {
  const showFeedback = useUIStore((s) => s.showFeedback);

  return useCallback(
    (
      state: GameState,
      action: GameAction,
      actingPlayer: PlayerId,
      element: HTMLElement | null,
    ) => {
      const message = getActionFeedback(state, action, actingPlayer);
      if (message && element) {
        const rect = element.getBoundingClientRect();
        showFeedback(message, rect.left + rect.width / 2, rect.top, 'warning');
      }
    },
    [showFeedback],
  );
}
