import type { GameState, PlayerId, Tier } from '@engine/types';
import { TIER_CONFIGS } from '@engine/ruleset';

// ─── Types ───

/** Serializable snapshot of an in-progress game. */
export interface PersistedGame {
  version: 1;
  savedAt: number;
  gameId: string;
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

const GAME_KEY_PREFIX = 'alchemy:game:';
const ACTIVE_GAME_KEY = 'alchemy:activeGameId';
const HISTORY_KEY = 'alchemy:gameHistory';

// ─── Active Game ID ───

export function saveActiveGameId(id: string): void {
  localStorage.setItem(ACTIVE_GAME_KEY, id);
}

export function loadActiveGameId(): string | null {
  return localStorage.getItem(ACTIVE_GAME_KEY);
}

export function clearActiveGameId(): void {
  localStorage.removeItem(ACTIVE_GAME_KEY);
}

// ─── Game Persistence ───

export function saveGame(
  gameId: string,
  gameState: GameState,
  rngState: number,
  humanPlayer: PlayerId,
  player1DeckIds: string[],
  player2DeckIds: string[],
): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { availableKeywords: _, ...rulesetWithoutKeywords } = gameState.ruleset;
  const persisted: PersistedGame = {
    version: 1,
    savedAt: Date.now(),
    gameId,
    gameState: { ...gameState, ruleset: rulesetWithoutKeywords },
    rngState,
    humanPlayer,
    player1DeckIds,
    player2DeckIds,
  };
  localStorage.setItem(GAME_KEY_PREFIX + gameId, JSON.stringify(persisted));
}

export function loadGame(gameId?: string): { gameState: GameState; rngState: number; persisted: PersistedGame } | null {
  const id = gameId ?? loadActiveGameId();
  if (!id) return null;

  const raw = localStorage.getItem(GAME_KEY_PREFIX + id);
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

export function clearSavedGame(gameId?: string): void {
  const id = gameId ?? loadActiveGameId();
  if (id) {
    localStorage.removeItem(GAME_KEY_PREFIX + id);
  }
  clearActiveGameId();
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
