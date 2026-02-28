import type { Tier } from '@engine/types';
import { ALL_CARDS } from '@engine/cards';
import { TIER_ORDER } from '@engine/ruleset';

/**
 * Encodes a deck (array of card IDs, with duplicates for copies) into a
 * compact share code string.
 *
 * Format (version 1):
 *   Byte 0: upper 4 bits = version (1), lower 4 bits = tier index
 *   Bytes 1+: 2 bits per card, packed left-to-right, indexed by ALL_CARDS order
 *
 * Result: Base64url-encoded, ~19 characters.
 */
export function encodeDeck(cardIds: string[], tier: Tier): string {
  const tierIndex = TIER_ORDER.indexOf(tier);
  const counts = cardCountsFromIds(cardIds);

  // Version nibble (1) | tier nibble
  const versionByte = (1 << 4) | tierIndex;

  // Pack 2 bits per card: 4 cards per byte
  const dataBytes = Math.ceil(ALL_CARDS.length / 4);
  const bytes = new Uint8Array(1 + dataBytes);
  bytes[0] = versionByte;

  for (let i = 0; i < ALL_CARDS.length; i++) {
    const count = counts[i];
    const byteIndex = 1 + Math.floor(i / 4);
    const bitShift = 6 - (i % 4) * 2;
    bytes[byteIndex] |= (count & 0b11) << bitShift;
  }

  return toBase64Url(bytes);
}

/**
 * Decodes a share code back into a deck (array of card IDs) and tier.
 * Returns null if the code is invalid.
 */
export function decodeDeck(code: string): { cardIds: string[]; tier: Tier } | null {
  try {
    const bytes = fromBase64Url(code);
    if (bytes.length < 2) return null;

    const version = bytes[0] >> 4;
    if (version !== 1) return null;

    const tierIndex = bytes[0] & 0x0f;
    if (tierIndex < 0 || tierIndex >= TIER_ORDER.length) return null;
    const tier = TIER_ORDER[tierIndex];

    const cardIds: string[] = [];
    for (let i = 0; i < ALL_CARDS.length; i++) {
      const byteIndex = 1 + Math.floor(i / 4);
      if (byteIndex >= bytes.length) break;
      const bitShift = 6 - (i % 4) * 2;
      const count = (bytes[byteIndex] >> bitShift) & 0b11;
      for (let c = 0; c < count; c++) {
        cardIds.push(ALL_CARDS[i].id);
      }
    }

    return { cardIds, tier };
  } catch {
    return null;
  }
}

// ─── Helpers ───

function cardCountsFromIds(cardIds: string[]): number[] {
  const countMap = new Map<string, number>();
  for (const id of cardIds) {
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }
  return ALL_CARDS.map((card) => countMap.get(card.id) ?? 0);
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
