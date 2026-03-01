import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

/** Unambiguous characters — no 0/O, 1/I/L confusion */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const PEER_ID_PREFIX = 'alchemy-';

export interface HostResult {
  roomCode: string;
  waitForGuest: () => Promise<{ conn: DataConnection; destroyPeer: () => void }>;
  destroy: () => void;
}

export function generateRoomCode(): string {
  const chars: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    chars.push(CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]);
  }
  return chars.join('');
}

/**
 * Validate and normalize a room code from user input.
 * Returns the uppercase code or null if invalid.
 */
export function parseRoomCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return code;
}

/** Host creates a room and waits for a guest to connect. */
export function hostRoom(): HostResult {
  const roomCode = generateRoomCode();
  const peerId = PEER_ID_PREFIX + roomCode;
  const peer = new Peer(peerId);

  let destroyed = false;

  const waitForGuest = (): Promise<{ conn: DataConnection; destroyPeer: () => void }> => {
    return new Promise((resolve, reject) => {
      if (destroyed) {
        reject(new Error('Host was destroyed before a guest connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('No one joined. The room timed out.'));
        peer.destroy();
      }, 120_000);

      peer.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Connection error: ${err.message}`));
      });

      peer.on('connection', (conn) => {
        clearTimeout(timeout);
        conn.on('open', () => {
          resolve({ conn, destroyPeer: () => peer.destroy() });
        });
        conn.on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`Guest connection error: ${err.message}`));
        });
      });
    });
  };

  const destroy = () => {
    destroyed = true;
    peer.destroy();
  };

  return { roomCode, waitForGuest, destroy };
}

/** Guest joins a room by code. */
export function joinRoom(code: string): Promise<{ conn: DataConnection; destroyPeer: () => void }> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    const peerId = PEER_ID_PREFIX + code;

    peer.on('open', () => {
      const conn = peer.connect(peerId, { reliable: true });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timed out. Check the room code and try again.'));
        peer.destroy();
      }, 30_000);

      conn.on('open', () => {
        clearTimeout(timeout);
        resolve({ conn, destroyPeer: () => peer.destroy() });
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Connection error: ${err.message}`));
        peer.destroy();
      });
    });

    peer.on('error', (err) => {
      reject(new Error(`Failed to connect: ${err.message}`));
    });
  });
}
