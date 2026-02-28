import type { GameState, PlayerId, Tier } from '@engine/types';
import { TIER_CONFIGS } from '@engine/ruleset';

// ─── Types ───

/** Serializable snapshot of an in-progress game. */
export interface PersistedGame {
  version: 1;
  savedAt: number;
  gameState: PersistedGameState;
  rngState: number;
  humanPlayer: PlayerId;
  player1DeckIds: string[];
  player2DeckIds: string[];
}

/** GameState with availableKeywords stripped (reconstructed on load). */
type PersistedGameState = Omit<GameState, 'ruleset'> & {
  ruleset: Omit<GameState['ruleset'], 'availableKeywords'>;
};

/** Summary of a completed game for history tracking. */
export interface GameHistoryEntry {
  id: string;
  playedAt: number;
  outcome: 'win' | 'loss';
  humanPlayer: PlayerId;
  player1DeckIds: string[];
  player2DeckIds: string[];
  turns: number;
}

// ─── Storage Keys ───

const GAME_KEY = 'alchemy:savedGame';
const HISTORY_KEY = 'alchemy:gameHistory';

// ─── Game Persistence ───

export function saveGame(
  gameState: GameState,
  rngState: number,
  humanPlayer: PlayerId,
  player1DeckIds: string[],
  player2DeckIds: string[],
): void {
  const { availableKeywords: _, ...rulesetWithoutKeywords } = gameState.ruleset;
  const persisted: PersistedGame = {
    version: 1,
    savedAt: Date.now(),
    gameState: { ...gameState, ruleset: rulesetWithoutKeywords },
    rngState,
    humanPlayer,
    player1DeckIds,
    player2DeckIds,
  };
  localStorage.setItem(GAME_KEY, JSON.stringify(persisted));
}

export function loadGame(): { gameState: GameState; rngState: number; persisted: PersistedGame } | null {
  const raw = localStorage.getItem(GAME_KEY);
  if (!raw) return null;

  try {
    const persisted: PersistedGame = JSON.parse(raw);
    if (persisted.version !== 1) return null;

    const tier: Tier = persisted.gameState.ruleset.tier;
    const fullRuleset = TIER_CONFIGS[tier];
    const gameState: GameState = {
      ...persisted.gameState,
      ruleset: { ...persisted.gameState.ruleset, availableKeywords: fullRuleset.availableKeywords },
    };

    return { gameState, rngState: persisted.rngState, persisted };
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  localStorage.removeItem(GAME_KEY);
}

// ─── Game History ───

export function saveHistoryEntry(entry: GameHistoryEntry): void {
  const history = loadHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadHistory(): GameHistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
