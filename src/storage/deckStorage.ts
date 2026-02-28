import type { Tier } from '@engine/types';

// ─── Types ───

export interface SavedDeck {
  id: string;
  name: string;
  tier: Tier;
  cardIds: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Storage Key ───

const DECKS_KEY = 'alchemy:savedDecks';

// ─── CRUD ───

export function loadSavedDecks(): SavedDeck[] {
  const raw = localStorage.getItem(DECKS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDeck(deck: SavedDeck): void {
  const decks = loadSavedDecks();
  const existingIndex = decks.findIndex((d) => d.id === deck.id);
  if (existingIndex >= 0) {
    decks[existingIndex] = deck;
  } else {
    decks.push(deck);
  }
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function deleteDeck(deckId: string): void {
  const decks = loadSavedDecks().filter((d) => d.id !== deckId);
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}
