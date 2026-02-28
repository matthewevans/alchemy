import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import type { PeerSession } from '@network/peer';
import type { OpponentController } from './types';

interface StoreAccessor {
  dispatch: (action: GameAction, actingPlayer: PlayerId) => GameEvent[];
}

export function createNetworkController(
  session: PeerSession,
  store: StoreAccessor,
): OpponentController {
  let sendSeq = 0;
  let receiveSeq = 0;
  let disposed = false;

  session.onMessage((msg) => {
    if (disposed) return;
    if (msg.type === 'action') {
      // Validate sequence number — detect gaps or duplicates
      if (msg.seq !== receiveSeq) {
        console.warn(`Sequence mismatch: expected ${receiveSeq}, got ${msg.seq}`);
        // Still apply the action to stay in sync, but log the anomaly
      }
      receiveSeq = msg.seq + 1;

      // Remote action: dispatch directly to store (no broadcast back)
      try {
        store.dispatch(msg.action, msg.actingPlayer);
      } catch (e) {
        console.warn('Failed to dispatch remote action:', e);
      }
    }
  });

  return {
    onOpponentPhase() {
      // Network controller is passive — waits for messages from peer
    },

    onLocalAction(action, actingPlayer) {
      if (disposed) return;
      session.send({
        type: 'action',
        action,
        actingPlayer,
        seq: sendSeq++,
      });
    },

    dispose() {
      disposed = true;
      session.close();
    },
  };
}
