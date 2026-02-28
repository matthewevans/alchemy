import { describe, it, expect, vi } from 'vitest';
import { createPeerSession } from './peer';
import { encodeMessage } from './protocol';

class FakeDataChannel extends EventTarget {
  readyState: RTCDataChannelState = 'open';
  sent: string[] = [];

  send(data: string) {
    if (this.readyState !== 'open') {
      throw new Error('Data channel is closed');
    }
    this.sent.push(data);
  }
}

class FakePeerConnection extends EventTarget {
  connectionState: RTCPeerConnectionState = 'connected';
  close = vi.fn();
}

function emitMessage(channel: FakeDataChannel, data: string) {
  channel.dispatchEvent(new MessageEvent('message', { data }));
}

describe('createPeerSession', () => {
  it('buffers messages while no listeners are attached, then flushes when a listener is added', () => {
    const pc = new FakePeerConnection();
    const channel = new FakeDataChannel();
    const session = createPeerSession({
      pc: pc as unknown as RTCPeerConnection,
      channel: channel as unknown as RTCDataChannel,
    });

    const actionMessage = {
      type: 'action' as const,
      action: { type: 'ADVANCE_PHASE' as const },
      actingPlayer: 'player1' as const,
      seq: 0,
    };

    emitMessage(channel, encodeMessage(actionMessage));

    const handler = vi.fn();
    session.onMessage(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(actionMessage);
    session.close();
  });

  it('buffers messages again after temporary listener is removed', () => {
    const pc = new FakePeerConnection();
    const channel = new FakeDataChannel();
    const session = createPeerSession({
      pc: pc as unknown as RTCPeerConnection,
      channel: channel as unknown as RTCDataChannel,
    });

    const temporaryHandler = vi.fn();
    const unsubscribeTemporary = session.onMessage(temporaryHandler);
    unsubscribeTemporary();

    const actionMessage = {
      type: 'action' as const,
      action: { type: 'ADVANCE_PHASE' as const },
      actingPlayer: 'player2' as const,
      seq: 1,
    };

    emitMessage(channel, encodeMessage(actionMessage));

    const gameHandler = vi.fn();
    session.onMessage(gameHandler);

    expect(temporaryHandler).not.toHaveBeenCalled();
    expect(gameHandler).toHaveBeenCalledTimes(1);
    expect(gameHandler).toHaveBeenCalledWith(actionMessage);
    session.close();
  });

  it('invokes disconnect listeners immediately if they subscribe after disconnect', () => {
    const pc = new FakePeerConnection();
    const channel = new FakeDataChannel();
    const session = createPeerSession({
      pc: pc as unknown as RTCPeerConnection,
      channel: channel as unknown as RTCDataChannel,
    });

    session.close('Peer closed');

    const handler = vi.fn();
    session.onDisconnect(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('Peer closed');
    expect(pc.close).toHaveBeenCalledTimes(1);
  });
});
