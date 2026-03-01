import type { Permanent } from '@engine/types';

export interface CardStack {
  cardId: string;
  stateKey: string;
  permanents: Permanent[];
  slotIndices: number[];
}

/** Deterministic key from visual-affecting permanent properties. */
function getVisualStateKey(p: Permanent): string {
  return `${p.cardId}|${p.isTapped ? 1 : 0}|${p.damage}|${p.temporaryAttackBonus}|${p.temporaryHealthBonus}|${p.summonedThisTurn ? 1 : 0}|${p.cantAttackThisTurn ? 1 : 0}`;
}

/**
 * Groups board permanents into stacks of visually identical cards.
 * Returns an array matching the visual layout — null slots are preserved,
 * and each CardStack replaces one or more consecutive/matching permanents.
 *
 * Only permanents with the same cardId AND visual state are stacked together.
 */
export function groupIntoStacks(board: (Permanent | null)[]): (CardStack | null)[] {
  const stacks: (CardStack | null)[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < board.length; i++) {
    if (consumed.has(i)) continue;

    const p = board[i];
    if (!p) {
      stacks.push(null);
      continue;
    }

    const stateKey = getVisualStateKey(p);
    const stack: CardStack = {
      cardId: p.cardId,
      stateKey,
      permanents: [p],
      slotIndices: [i],
    };

    // Look ahead for matching permanents (same cardId + visual state)
    for (let j = i + 1; j < board.length; j++) {
      if (consumed.has(j)) continue;
      const other = board[j];
      if (!other) continue;
      if (other.cardId === p.cardId && getVisualStateKey(other) === stateKey) {
        stack.permanents.push(other);
        stack.slotIndices.push(j);
        consumed.add(j);
      }
    }

    stacks.push(stack);
  }

  return stacks;
}
