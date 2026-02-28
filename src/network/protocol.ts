import type { GameAction, PlayerId, Tier } from '@engine/types';

export type NetworkMessage =
  | { type: 'guest_deck'; deckIds: string[] }
  | { type: 'game_setup'; seed: number; hostDeckIds: string[]; guestDeckIds: string[]; tier: Tier }
  | { type: 'action'; action: GameAction; actingPlayer: PlayerId; seq: number }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number }
  | { type: 'disconnect'; reason: string };

const VALID_TYPES = new Set(['guest_deck', 'game_setup', 'action', 'ping', 'pong', 'disconnect']);

export function encodeMessage(msg: NetworkMessage): string {
  return JSON.stringify(msg);
}

/** Decode and structurally validate a network message. Throws on malformed data. */
export function decodeMessage(data: string): NetworkMessage {
  const parsed: unknown = JSON.parse(data);
  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
    throw new Error('Invalid message: missing type field');
  }
  const msg = parsed as { type: string };
  if (!VALID_TYPES.has(msg.type)) {
    throw new Error(`Invalid message type: ${msg.type}`);
  }
  return parsed as NetworkMessage;
}
