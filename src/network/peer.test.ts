import { describe, it, expect, vi } from 'vitest';
import { createPeerSession } from './peer';
import { encodeMessage } from './protocol';

type DataHandler = (data: unknown) => void;
type VoidHandler = () => void;
type ErrorHandler = (err: Error) => void;

/** Minimal fake matching PeerJS DataConnection API surface used by createPeerSession */
class FakeDataConnection {
  open = true;
  sent: string[] = [];

  private dataHandlers = new Set<DataHandler>();
  private closeHandlers = new Set<VoidHandler>();
  private errorHandlers = new Set<ErrorHandler>();

  send(data: unknown) {
    if (!this.open) throw new Error('Connection is closed');
    this.sent.push(data as string);
  }

  on(event: string, handler: (...args: unknown[]) => void): this {
    if (event === 'data') this.dataHandlers.add(handler as DataHandler);
    else if (event === 'close') this.closeHandlers.add(handler as VoidHandler);
    else if (event === 'error') this.errorHandlers.add(handler as ErrorHandler);
    return this;
  }

  off(event: string, handler: (...args: unknown[]) => void): this {
    if (event === 'data') this.dataHandlers.delete(handler as DataHandler);
    else if (event === 'close') this.closeHandlers.delete(handler as VoidHandler);
    else if (event === 'error') this.errorHandlers.delete(handler as ErrorHandler);
    return this;
  }

  // Test helpers
  simulateData(data: string) {
    for (const h of this.dataHandlers) h(data);
  }

  simulateClose() {
    this.open = false;
    for (const h of this.closeHandlers) h();
  }
}

function createTestSession() {
  const conn = new FakeDataConnection();
  const destroyPeer = vi.fn();
  // Cast to satisfy DataConnection type — we only use the subset FakeDataConnection implements
  const session = createPeerSession(conn as never, destroyPeer);
  return { conn, destroyPeer, session };
}

describe('createPeerSession', () => {
  it('buffers messages while no listeners are attached, then flushes when a listener is added', () => {
    const { conn, session } = createTestSession();

    const actionMessage = {
      type: 'action' as const,
      action: { type: 'ADVANCE_PHASE' as const },
      actingPlayer: 'player1' as const,
      seq: 0,
    };

    conn.simulateData(encodeMessage(actionMessage));

    const handler = vi.fn();
    session.onMessage(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(actionMessage);
    session.close();
  });

  it('buffers messages again after temporary listener is removed', () => {
    const { conn, session } = createTestSession();

    const temporaryHandler = vi.fn();
    const unsubscribeTemporary = session.onMessage(temporaryHandler);
    unsubscribeTemporary();

    const actionMessage = {
      type: 'action' as const,
      action: { type: 'ADVANCE_PHASE' as const },
      actingPlayer: 'player2' as const,
      seq: 1,
    };

    conn.simulateData(encodeMessage(actionMessage));

    const gameHandler = vi.fn();
    session.onMessage(gameHandler);

    expect(temporaryHandler).not.toHaveBeenCalled();
    expect(gameHandler).toHaveBeenCalledTimes(1);
    expect(gameHandler).toHaveBeenCalledWith(actionMessage);
    session.close();
  });

  it('invokes disconnect listeners immediately if they subscribe after disconnect', () => {
    const { destroyPeer, session } = createTestSession();

    session.close('Peer closed');

    const handler = vi.fn();
    session.onDisconnect(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('Peer closed');
    expect(destroyPeer).toHaveBeenCalledTimes(1);
  });
});
