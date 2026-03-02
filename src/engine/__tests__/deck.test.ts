import { describe, it, expect } from 'vitest';
import {
  buildDeck,
  drawCards,
  drawOpeningHand,
  performMulligan,
  validateDeck,
} from '../deck';
import { CARD_REGISTRY } from '../cards';
import { createRNG } from '../prng';
import { TIER_CONFIGS } from '../ruleset';

// ─── Helpers ───

/** A small set of card IDs for testing. */
const FIRE_CARDS = [
  'fire_ember_sprite',
  'fire_flame_fox',
  'fire_lava_hound',
  'fire_fire_dancer',
  'fire_magma_golem',
  'fire_phoenix_chick',
  'fire_dragon_whelp',
  'fire_fireball',
  'fire_eruption',
  'fire_blazing_speed',
];

/** Build a valid 20-card apprentice deck (2 copies of each fire card). */
function makeApprenticeDeckIds(): string[] {
  return [...FIRE_CARDS, ...FIRE_CARDS];
}

/** Build a deck of only expensive cards (cost > 2) for opening hand tests. */
function makeExpensiveDeckIds(): string[] {
  const expensive = Object.values(CARD_REGISTRY)
    .filter((c) => c.cost > 2 && c.tier === 'apprentice')
    .map((c) => c.id);
  // Take enough for a deck, repeating up to 2 copies
  const ids: string[] = [];
  for (const id of expensive) {
    ids.push(id, id);
    if (ids.length >= 20) break;
  }
  return ids.slice(0, 20);
}

// ─── buildDeck ───

describe('buildDeck', () => {
  it('returns correct number of CardInstances matching input', () => {
    const ids = makeApprenticeDeckIds();
    const deck = buildDeck(ids, createRNG(42));
    expect(deck).toHaveLength(ids.length);
  });

  it('each instance has a deterministic, unique instanceId', () => {
    const ids = makeApprenticeDeckIds();
    const deck = buildDeck(ids, createRNG(42));
    const instanceIds = deck.map((c) => c.instanceId);
    expect(new Set(instanceIds).size).toBe(instanceIds.length);
  });

  it('instanceIds follow the cardId#index pattern', () => {
    const ids = ['fire_ember_sprite', 'fire_ember_sprite', 'fire_flame_fox'];
    const deck = buildDeck(ids, createRNG(42));
    const instanceIds = deck.map((c) => c.instanceId).sort();
    expect(instanceIds).toContain('fire_ember_sprite#0');
    expect(instanceIds).toContain('fire_ember_sprite#1');
    expect(instanceIds).toContain('fire_flame_fox#0');
  });

  it('deck is shuffled (not in original order)', () => {
    const ids = makeApprenticeDeckIds();
    const deck = buildDeck(ids, createRNG(42));
    const resultCardIds = deck.map((c) => c.cardId);
    expect(resultCardIds).not.toEqual(ids);
  });

  it('throws on invalid card IDs', () => {
    expect(() => buildDeck(['nonexistent_card'], createRNG(1))).toThrow(
      'Unknown card ID: "nonexistent_card"',
    );
  });

  it('same seed produces same shuffle order', () => {
    const ids = makeApprenticeDeckIds();
    const a = buildDeck(ids, createRNG(123));
    const b = buildDeck(ids, createRNG(123));
    expect(a).toEqual(b);
  });

  it('instanceIds are unique across two players with the same deck', () => {
    const ids = makeApprenticeDeckIds();
    const rng = createRNG(42);
    const deck1 = buildDeck(ids, rng, 'player1');
    const deck2 = buildDeck(ids, rng, 'player2');
    const allIds = [...deck1.map((c) => c.instanceId), ...deck2.map((c) => c.instanceId)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

// ─── drawCards ───

describe('drawCards', () => {
  const ids = makeApprenticeDeckIds();

  it('drawing N cards returns N drawn and remaining = original - N', () => {
    const deck = buildDeck(ids, createRNG(1));
    const { drawn, remaining } = drawCards(deck, 5);
    expect(drawn).toHaveLength(5);
    expect(remaining).toHaveLength(deck.length - 5);
  });

  it('drawing more than deck size returns all available', () => {
    const deck = buildDeck(ids, createRNG(1));
    const { drawn, remaining } = drawCards(deck, 100);
    expect(drawn).toHaveLength(deck.length);
    expect(remaining).toHaveLength(0);
  });

  it('drawing 0 returns empty drawn, full remaining', () => {
    const deck = buildDeck(ids, createRNG(1));
    const { drawn, remaining } = drawCards(deck, 0);
    expect(drawn).toHaveLength(0);
    expect(remaining).toHaveLength(deck.length);
  });

  it('does not mutate the input deck', () => {
    const deck = buildDeck(ids, createRNG(1));
    const originalLength = deck.length;
    const originalFirst = deck[0];
    drawCards(deck, 5);
    expect(deck).toHaveLength(originalLength);
    expect(deck[0]).toBe(originalFirst);
  });
});

// ─── drawOpeningHand ───

describe('drawOpeningHand', () => {
  it('hand has exactly handSize cards when deck is large enough', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { hand } = drawOpeningHand(deck, 4, createRNG(42));
    expect(hand).toHaveLength(4);
  });

  it('hand contains at least 1 card costing 1-2 energy with mixed deck', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { hand } = drawOpeningHand(deck, 4, createRNG(42));
    const hasLowCost = hand.some((c) => CARD_REGISTRY[c.cardId].cost <= 2);
    expect(hasLowCost).toBe(true);
  });

  it('works with deterministic RNG (same seed = same hand)', () => {
    const ids = makeApprenticeDeckIds();
    const deckA = buildDeck(ids, createRNG(10));
    const deckB = buildDeck(ids, createRNG(10));
    const resultA = drawOpeningHand(deckA, 4, createRNG(99));
    const resultB = drawOpeningHand(deckB, 4, createRNG(99));
    expect(resultA.hand).toEqual(resultB.hand);
    expect(resultA.remaining).toEqual(resultB.remaining);
  });

  it('returns whatever is available after max attempts with expensive deck', () => {
    const expensiveIds = makeExpensiveDeckIds();
    const deck = buildDeck(expensiveIds, createRNG(42));
    const { hand, remaining } = drawOpeningHand(deck, 4, createRNG(42));
    expect(hand).toHaveLength(4);
    expect(remaining).toHaveLength(deck.length - 4);
  });

  it('total cards (hand + remaining) equals original deck size', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { hand, remaining } = drawOpeningHand(deck, 4, createRNG(42));
    expect(hand.length + remaining.length).toBe(deck.length);
  });
});

// ─── performMulligan ───

describe('performMulligan', () => {
  it('returned hand has same size as original', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { drawn: hand, remaining } = drawCards(deck, 4);
    const result = performMulligan(hand, remaining, [0, 2], createRNG(99));
    expect(result.hand).toHaveLength(hand.length);
  });

  it('cards not at specified indices remain in hand', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { drawn: hand, remaining } = drawCards(deck, 4);
    const keptCards = [hand[1], hand[3]];
    const result = performMulligan(hand, remaining, [0, 2], createRNG(99));
    expect(result.hand.slice(0, 2)).toEqual(keptCards);
  });

  it('cards at specified indices are replaced', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { drawn: hand, remaining } = drawCards(deck, 4);
    const returnedCards = [hand[0], hand[2]];
    const result = performMulligan(hand, remaining, [0, 2], createRNG(99));
    const newCards = result.hand.slice(2);
    // The new cards should not be the same instances as the returned ones
    for (const newCard of newCards) {
      expect(returnedCards).not.toContainEqual(newCard);
    }
  });

  it('total card count (hand + deck) is preserved', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { drawn: hand, remaining } = drawCards(deck, 4);
    const totalBefore = hand.length + remaining.length;
    const result = performMulligan(hand, remaining, [1], createRNG(99));
    const totalAfter = result.hand.length + result.deck.length;
    expect(totalAfter).toBe(totalBefore);
  });

  it('does not mutate the input hand or deck', () => {
    const deck = buildDeck(makeApprenticeDeckIds(), createRNG(42));
    const { drawn: hand, remaining } = drawCards(deck, 4);
    const handCopy = [...hand];
    const remainingCopy = [...remaining];
    performMulligan(hand, remaining, [0], createRNG(99));
    expect(hand).toEqual(handCopy);
    expect(remaining).toEqual(remainingCopy);
  });
});

// ─── validateDeck ───

describe('validateDeck', () => {
  const apprenticeRuleset = TIER_CONFIGS.apprentice;

  it('valid deck passes validation', () => {
    const ids = makeApprenticeDeckIds();
    const result = validateDeck(ids, apprenticeRuleset);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('wrong deck size fails', () => {
    const ids = FIRE_CARDS; // Only 10 cards, need 20
    const result = validateDeck(ids, apprenticeRuleset);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('10 cards, expected 20'),
    );
  });

  it('too many copies of one card fails', () => {
    // 3 copies of ember_sprite + fill to 20
    const ids = [
      'fire_ember_sprite',
      'fire_ember_sprite',
      'fire_ember_sprite',
      ...FIRE_CARDS.slice(1).flatMap((id) => [id, id]),
    ].slice(0, 20);
    // Pad to 20 if needed
    while (ids.length < 20) ids.push('fire_flame_fox');
    const result = validateDeck(ids, apprenticeRuleset);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('fire_ember_sprite'),
    );
  });

  it('invalid card ID fails', () => {
    const ids = makeApprenticeDeckIds();
    ids[0] = 'totally_fake_card';
    const result = validateDeck(ids, apprenticeRuleset);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('Unknown card ID: "totally_fake_card"'),
    );
  });

  it('returns multiple errors when deck has multiple problems', () => {
    const ids = ['fake_card_1', 'fake_card_2'];
    const result = validateDeck(ids, apprenticeRuleset);
    expect(result.valid).toBe(false);
    // Should have deck size error + unknown card errors
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
