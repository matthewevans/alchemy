import type { GameState, PlayerId, Tier } from '@engine/types';
import { createEmptyStats } from '@engine/types';
import type { AIConfig } from '@engine/aiConfig';
import type { GameSessionMeta } from '@game/sessionMeta';
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
  aiConfig?: AIConfig;
  meta?: GameSessionMeta;
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
const ACTIVE_GAME_KEY_PREFIX = 'alchemy:activeGameId:';
const HISTORY_KEY = 'alchemy:gameHistory';

export type ActiveGameSlot = 'quickplay' | 'adventure';

function activeGameKey(slot: ActiveGameSlot): string {
  return `${ACTIVE_GAME_KEY_PREFIX}${slot}`;
}

// ─── Active Game ID ───

export function saveActiveGameId(id: string, slot: ActiveGameSlot = 'quickplay'): void {
  localStorage.setItem(activeGameKey(slot), id);
}

export function loadActiveGameId(slot: ActiveGameSlot = 'quickplay'): string | null {
  return localStorage.getItem(activeGameKey(slot));
}

export function clearActiveGameId(slot?: ActiveGameSlot): void {
  if (slot) {
    localStorage.removeItem(activeGameKey(slot));
    return;
  }

  localStorage.removeItem(activeGameKey('quickplay'));
  localStorage.removeItem(activeGameKey('adventure'));
}

// ─── Game Persistence ───

export function saveGame(
  gameId: string,
  gameState: GameState,
  rngState: number,
  humanPlayer: PlayerId,
  player1DeckIds: string[],
  player2DeckIds: string[],
  aiConfig?: AIConfig,
  meta?: GameSessionMeta,
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
    aiConfig,
    meta,
  };
  localStorage.setItem(GAME_KEY_PREFIX + gameId, JSON.stringify(persisted));
}

export function loadGame(gameId?: string): { gameState: GameState; rngState: number; persisted: PersistedGame } | null {
  const id = gameId ?? loadActiveGameId('quickplay') ?? loadActiveGameId('adventure');
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
      stats: persisted.gameState.stats ?? { player1: createEmptyStats(), player2: createEmptyStats() },
    };

    return { gameState, rngState: persisted.rngState, persisted };
  } catch {
    return null;
  }
}

export function clearSavedGame(gameId?: string): void {
  const id = gameId ?? loadActiveGameId('quickplay') ?? loadActiveGameId('adventure');
  if (id) {
    localStorage.removeItem(GAME_KEY_PREFIX + id);
    if (loadActiveGameId('quickplay') === id) {
      clearActiveGameId('quickplay');
    }
    if (loadActiveGameId('adventure') === id) {
      clearActiveGameId('adventure');
    }
    return;
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
