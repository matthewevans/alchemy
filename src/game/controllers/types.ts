import type { GameAction, GameState, PlayerId } from '@engine/types';
import { getActingPlayer } from '@engine/types';

export interface OpponentController {
  /** Called when it's the opponent's phase. Controller eventually dispatches. */
  onOpponentPhase(): void;
  /** Called after any local player action. For multiplayer: broadcasts to peer. */
  onLocalAction(action: GameAction, actingPlayer: PlayerId): void;
  /** Cleanup timers, listeners, connections. */
  dispose(): void;
}

/** Determines if the given player should act in the current phase. Shared by all controllers. */
export function isOpponentPhase(state: GameState, opponentPlayer: PlayerId): boolean {
  return getActingPlayer(state) === opponentPlayer;
}
