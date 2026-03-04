import { describe, expect, it } from 'vitest';
import { CARD_REGISTRY } from '../cards';
import { validateDeck } from '../deck';
import { TIER_CONFIGS, TIER_ORDER } from '../ruleset';
import { STARTER_DECKS, buildStarterDeck } from '../starterDecks';
import type { Tier } from '../types';

const TIERS: Tier[] = ['apprentice', 'alchemist', 'archmage'];

describe('STARTER_DECKS', () => {
  it('every starter deck validates for each tier', () => {
    for (const tier of TIERS) {
      for (const deck of STARTER_DECKS) {
        const cardIds = buildStarterDeck(deck, tier);
        const result = validateDeck(cardIds, TIER_CONFIGS[tier]);
        expect(
          result.valid,
          `${deck.name} (${tier}) invalid: ${result.errors.join('; ')}`,
        ).toBe(true);
      }
    }
  });

  it('only uses cards at or below the selected tier', () => {
    for (const tier of TIERS) {
      const maxTierIndex = TIER_ORDER.indexOf(tier);
      for (const deck of STARTER_DECKS) {
        const cardIds = buildStarterDeck(deck, tier);
        for (const cardId of cardIds) {
          const card = CARD_REGISTRY[cardId];
          expect(TIER_ORDER.indexOf(card.tier)).toBeLessThanOrEqual(maxTierIndex);
        }
      }
    }
  });

  it('only uses cards from the deck declared element(s)', () => {
    for (const tier of TIERS) {
      for (const deck of STARTER_DECKS) {
        const cardIds = buildStarterDeck(deck, tier);
        for (const cardId of cardIds) {
          const card = CARD_REGISTRY[cardId];
          expect(deck.elements).toContain(card.element);
        }
      }
    }
  });
});
