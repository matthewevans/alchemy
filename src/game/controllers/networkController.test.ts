import { describe, it, expect, vi } from 'vitest';
import type { PeerSession } from '@network/peer';
import { createNetworkController } from './networkController';

function createSessionMock(overrides: Partial<PeerSession> = {}): PeerSession {
  return {
    send: vi.fn(() => true),
    onMessage: vi.fn(() => () => {}),
    onDisconnect: vi.fn(() => () => {}),
    close: vi.fn(),
    ...overrides,
  };
}

describe('createNetworkController', () => {
  it('broadcasts local actions with incrementing sequence numbers', () => {
    const session = createSessionMock();
    const store = { dispatch: vi.fn(() => []) };
    const controller = createNetworkController(session, store);

    controller.onLocalAction({ type: 'ADVANCE_PHASE' }, 'player1');
    controller.onLocalAction({ type: 'ADVANCE_PHASE' }, 'player1');

    expect(session.send).toHaveBeenNthCalledWith(1, {
      type: 'action',
      action: { type: 'ADVANCE_PHASE' },
      actingPlayer: 'player1',
      seq: 0,
    });
    expect(session.send).toHaveBeenNthCalledWith(2, {
      type: 'action',
      action: { type: 'ADVANCE_PHASE' },
      actingPlayer: 'player1',
      seq: 1,
    });
  });

  it('closes the session when an action send fails', () => {
    const session = createSessionMock({ send: vi.fn(() => false) });
    const store = { dispatch: vi.fn(() => []) };
    const controller = createNetworkController(session, store);

    controller.onLocalAction({ type: 'ADVANCE_PHASE' }, 'player1');

    expect(session.close).toHaveBeenCalledWith('Connection lost while sending action');
  });

  it('closes the session when applying a remote action throws', () => {
    let onMessageHandler: ((msg: any) => void) | null = null;
    const session = createSessionMock({
      onMessage: vi.fn((handler) => {
        onMessageHandler = handler;
        return () => {};
      }),
    });
    const store = { dispatch: vi.fn(() => { throw new Error('invalid action'); }) };
    createNetworkController(session, store);

    onMessageHandler!({
      type: 'action',
      action: { type: 'ADVANCE_PHASE' },
      actingPlayer: 'player2',
      seq: 0,
    });

    expect(session.close).toHaveBeenCalledWith('Game state desynchronized');
  });
});
