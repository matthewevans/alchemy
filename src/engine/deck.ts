import type { CardInstance, RNG, RulesetConfig } from './types';
import { CARD_REGISTRY } from './cards';
import { shuffle } from './prng';
import { TIER_ORDER } from './ruleset';

/** Build a shuffled deck of CardInstances from an array of card IDs. */
export function buildDeck(cardIds: string[], rng: RNG): CardInstance[] {
  const copyCount = new Map<string, number>();

  const instances: CardInstance[] = cardIds.map((cardId) => {
    if (!CARD_REGISTRY[cardId]) {
      throw new Error(`Unknown card ID: "${cardId}"`);
    }
    const index = copyCount.get(cardId) ?? 0;
    copyCount.set(cardId, index + 1);
    return { instanceId: `${cardId}#${index}`, cardId };
  });

  return shuffle([...instances], rng);
}

/** Draw cards from the top of the deck. Pure function. */
export function drawCards(
  deck: CardInstance[],
  count: number,
): { drawn: CardInstance[]; remaining: CardInstance[] } {
  const actual = Math.min(count, deck.length);
  return {
    drawn: deck.slice(0, actual),
    remaining: deck.slice(actual),
  };
}

/**
 * Draw an opening hand with smoothing: guarantees at least 1 card
 * costing 1-2 energy. Reshuffles up to 3 times if no low-cost card
 * is found.
 */
export function drawOpeningHand(
  deck: CardInstance[],
  handSize: number,
  rng: RNG,
): { hand: CardInstance[]; remaining: CardInstance[] } {
  let currentDeck = [...deck];
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { drawn, remaining } = drawCards(currentDeck, handSize);

    const hasLowCost = drawn.some((card) => {
      const def = CARD_REGISTRY[card.cardId];
      return def.cost <= 2;
    });

    if (hasLowCost || attempt === maxAttempts - 1) {
      return { hand: drawn, remaining };
    }

    // Shuffle drawn cards back and try again
    currentDeck = shuffle([...drawn, ...remaining], rng);
  }

  // Unreachable, but satisfies TypeScript
  const { drawn, remaining } = drawCards(currentDeck, handSize);
  return { hand: drawn, remaining };
}

/** Put selected cards back into the deck, shuffle, and draw replacements. */
export function performMulligan(
  hand: CardInstance[],
  deck: CardInstance[],
  cardIndices: number[],
  rng: RNG,
): { hand: CardInstance[]; deck: CardInstance[] } {
  const kept: CardInstance[] = [];
  const returned: CardInstance[] = [];

  for (let i = 0; i < hand.length; i++) {
    if (cardIndices.includes(i)) {
      returned.push(hand[i]);
    } else {
      kept.push(hand[i]);
    }
  }

  const newDeck = shuffle([...returned, ...deck], rng);
  const { drawn, remaining } = drawCards(newDeck, returned.length);

  return {
    hand: [...kept, ...drawn],
    deck: remaining,
  };
}

/** Validate a deck against a ruleset. */
export function validateDeck(
  cardIds: string[],
  ruleset: RulesetConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const rulesetTierIndex = TIER_ORDER.indexOf(ruleset.tier);

  if (cardIds.length !== ruleset.deckSize) {
    errors.push(
      `Deck has ${cardIds.length} cards, expected ${ruleset.deckSize}`,
    );
  }

  const counts = new Map<string, number>();
  for (const cardId of cardIds) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }

  for (const [cardId, count] of counts) {
    if (count > ruleset.maxCopiesPerCard) {
      errors.push(
        `Card "${cardId}" appears ${count} times, max is ${ruleset.maxCopiesPerCard}`,
      );
    }
  }

  for (const cardId of new Set(cardIds)) {
    const def = CARD_REGISTRY[cardId];
    if (!def) {
      errors.push(`Unknown card ID: "${cardId}"`);
      continue;
    }
    const cardTierIndex = TIER_ORDER.indexOf(def.tier);
    if (cardTierIndex > rulesetTierIndex) {
      errors.push(
        `Card "${cardId}" is tier "${def.tier}", which exceeds ruleset tier "${ruleset.tier}"`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
