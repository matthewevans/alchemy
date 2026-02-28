// Persistence
export type { PersistedGame, GameHistoryEntry } from './persistence';
export { saveGame, loadGame, clearSavedGame, saveActiveGameId, loadActiveGameId, clearActiveGameId, saveHistoryEntry, loadHistory } from './persistence';

// Deck storage
export type { SavedDeck } from './deckStorage';
export { loadSavedDecks, saveDeck, deleteDeck } from './deckStorage';

// Share codes
export { encodeDeck, decodeDeck } from './shareCode';
