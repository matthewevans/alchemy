import type { GameAction, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';

export interface OpponentController {
  /** Called when it's the opponent's phase. Controller eventually dispatches. */
  onOpponentPhase(): void;
  /** Called after any local player action. For multiplayer: broadcasts to peer. */
  onLocalAction(action: GameAction, actingPlayer: PlayerId): void;
  /** Cleanup timers, listeners, connections. */
  dispose(): void;
}

/** Determines if the given player should act in the current phase. Shared by all controllers. */
export function isOpponentPhase(
  state: { phase: { type: string; player?: string; casterId?: string; step?: string }; activePlayer: string },
  opponentPlayer: string,
): boolean {
  const { phase } = state;

  switch (phase.type) {
    case 'mulligan':
      return phase.player === opponentPlayer;
    case 'discard':
      return phase.player === opponentPlayer;
    case 'targeting':
      return phase.casterId === opponentPlayer;
    case 'battle':
      if (phase.step === 'declare_attackers') {
        return state.activePlayer === opponentPlayer;
      }
      if (phase.step === 'declare_blockers') {
        return getOpponent(state.activePlayer as 'player1' | 'player2') === opponentPlayer;
      }
      return false;
    case 'game_over':
      return false;
    default:
      return state.activePlayer === opponentPlayer;
  }
}
