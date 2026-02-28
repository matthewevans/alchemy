import type { PeerConnection } from './connection';
import type { NetworkMessage } from './protocol';
import { encodeMessage, decodeMessage } from './protocol';

export interface PeerSession {
  /** Send a message. Returns false if the message was dropped (channel closed). */
  send(msg: NetworkMessage): boolean;
  onMessage(handler: (msg: NetworkMessage) => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  close(reason?: string): void;
}

export function createPeerSession(conn: PeerConnection): PeerSession {
  const { pc, channel } = conn;
  let messageHandler: ((msg: NetworkMessage) => void) | null = null;
  let disconnectHandler: ((reason: string) => void) | null = null;
  let closed = false;

  // Queues messages received before the first handler is installed
  let pendingMessages: NetworkMessage[] | null = [];

  // Ping/pong keep-alive
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let pongTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearKeepAlive = () => {
    if (pingInterval !== null) { clearInterval(pingInterval); pingInterval = null; }
    if (pongTimeout !== null) { clearTimeout(pongTimeout); pongTimeout = null; }
  };

  const startKeepAlive = () => {
    pingInterval = setInterval(() => {
      if (channel.readyState !== 'open') return;

      // Fix #1: Clear previous pong timeout before setting a new one
      if (pongTimeout !== null) { clearTimeout(pongTimeout); pongTimeout = null; }

      try {
        channel.send(encodeMessage({ type: 'ping', timestamp: Date.now() }));
      } catch {
        // Channel closed between readyState check and send (TOCTOU)
        handleDisconnect('Channel send failed');
        return;
      }

      pongTimeout = setTimeout(() => {
        if (!closed) handleDisconnect('Ping timeout');
      }, 10_000);
    }, 5_000);
  };

  // Fix #5: Remove beforeunload in handleDisconnect (not just close())
  const beforeUnloadHandler = () => {
    if (!closed && channel.readyState === 'open') {
      try {
        channel.send(encodeMessage({ type: 'disconnect', reason: 'Page closed' }));
      } catch { /* best-effort */ }
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  const handleDisconnect = (reason: string) => {
    if (closed) return;
    closed = true;
    clearKeepAlive();
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    disconnectHandler?.(reason);
    try { pc.close(); } catch (e) {
      console.warn('Error closing RTCPeerConnection:', e);
    }
  };

  // Fix #2: Wrap message handler in try-catch so one bad message can't kill the listener
  channel.addEventListener('message', (event) => {
    let msg: NetworkMessage;
    try {
      msg = decodeMessage(event.data as string);
    } catch (e) {
      console.warn('Failed to decode message from peer:', e);
      return;
    }

    if (msg.type === 'pong') {
      if (pongTimeout !== null) { clearTimeout(pongTimeout); pongTimeout = null; }
      return;
    }

    if (msg.type === 'ping') {
      try {
        channel.send(encodeMessage({ type: 'pong', timestamp: msg.timestamp }));
      } catch { /* channel may be closing */ }
      return;
    }

    if (msg.type === 'disconnect') {
      handleDisconnect(msg.reason);
      return;
    }

    // Fix #7 (partial): Queue messages until a handler is installed
    if (messageHandler) {
      messageHandler(msg);
    } else if (pendingMessages) {
      pendingMessages.push(msg);
    }
  });

  channel.addEventListener('close', () => handleDisconnect('Channel closed'));
  pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      handleDisconnect('Connection ' + pc.connectionState);
    }
  });

  startKeepAlive();

  return {
    // Fix #4: Return boolean indicating whether the message was sent
    send(msg) {
      if (closed || channel.readyState !== 'open') return false;
      try {
        channel.send(encodeMessage(msg));
        return true;
      } catch {
        return false;
      }
    },
    onMessage(handler) {
      messageHandler = handler;
      // Flush any messages that arrived before the handler was installed
      if (pendingMessages && pendingMessages.length > 0) {
        const queued = pendingMessages;
        pendingMessages = null;
        for (const msg of queued) {
          handler(msg);
        }
      } else {
        pendingMessages = null;
      }
    },
    onDisconnect(handler) {
      disconnectHandler = handler;
    },
    close(reason = 'Left game') {
      if (!closed && channel.readyState === 'open') {
        try {
          channel.send(encodeMessage({ type: 'disconnect', reason }));
        } catch { /* closing anyway */ }
      }
      handleDisconnect(reason);
    },
  };
}
