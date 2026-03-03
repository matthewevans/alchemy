import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Tier } from '@engine/types';
import type { AIDifficulty } from '@engine/aiConfig';

/** Battlefield ID (e.g. 'fire_molten', 'shadow_haunted_graveyard') or 'auto'. */
export type BattlefieldPreference = string;

const STORAGE_KEY = 'alchemy:preferences';
export const DEFAULT_UI_SCALE = 1;
export const DEFAULT_BOARD_SCALE = 0.85;
const DEFAULT_TIER: Tier = 'apprentice';
const DEFAULT_DIFFICULTY: AIDifficulty = 'medium';

interface PreferencesState {
  uiScale: number;
  boardScale: number;
  tier: Tier;
  difficulty: AIDifficulty;
  battlefieldAmbience: boolean;
  battlefield: BattlefieldPreference;
  easyReadMode: boolean;
  narrationEnabled: boolean;
  tutorialEnabled: boolean;
  combatMathEnabled: boolean;
  autoUpdateEnabled: boolean;
  setUIScale: (scale: number) => void;
  resetUIScale: () => void;
  setBoardScale: (scale: number) => void;
  resetBoardScale: () => void;
  setTier: (tier: Tier) => void;
  setDifficulty: (difficulty: AIDifficulty) => void;
  setBattlefieldAmbience: (enabled: boolean) => void;
  setBattlefield: (battlefield: BattlefieldPreference) => void;
  setEasyReadMode: (enabled: boolean) => void;
  setNarrationEnabled: (enabled: boolean) => void;
  setTutorialEnabled: (enabled: boolean) => void;
  setCombatMathEnabled: (enabled: boolean) => void;
  setAutoUpdateEnabled: (enabled: boolean) => void;
}

function applyUIScale(scale: number) {
  document.documentElement.style.setProperty('--ui-scale', String(scale));
}

function applyBoardScale(scale: number) {
  document.documentElement.style.setProperty('--board-scale', String(scale));
}

interface PersistedPreferences {
  uiScale: number;
  boardScale: number;
  tier: Tier;
  difficulty: AIDifficulty;
  battlefieldAmbience: boolean;
  battlefield: BattlefieldPreference;
  easyReadMode: boolean;
  narrationEnabled: boolean;
  tutorialEnabled: boolean;
  combatMathEnabled: boolean;
  autoUpdateEnabled: boolean;
}

function loadPersistedPreferences(): PersistedPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        uiScale: typeof parsed.uiScale === 'number' ? parsed.uiScale : DEFAULT_UI_SCALE,
        boardScale: typeof parsed.boardScale === 'number' ? parsed.boardScale : DEFAULT_BOARD_SCALE,
        tier: typeof parsed.tier === 'string' ? parsed.tier : DEFAULT_TIER,
        difficulty: typeof parsed.difficulty === 'string' ? parsed.difficulty : DEFAULT_DIFFICULTY,
        battlefieldAmbience: typeof parsed.battlefieldAmbience === 'boolean' ? parsed.battlefieldAmbience : true,
        battlefield: typeof parsed.battlefield === 'string' ? parsed.battlefield : 'auto',
        easyReadMode: typeof parsed.easyReadMode === 'boolean' ? parsed.easyReadMode : true,
        narrationEnabled: typeof parsed.narrationEnabled === 'boolean' ? parsed.narrationEnabled : true,
        tutorialEnabled: typeof parsed.tutorialEnabled === 'boolean' ? parsed.tutorialEnabled : true,
        combatMathEnabled: typeof parsed.combatMathEnabled === 'boolean' ? parsed.combatMathEnabled : true,
        autoUpdateEnabled: typeof parsed.autoUpdateEnabled === 'boolean' ? parsed.autoUpdateEnabled : true,
      };
    }
  } catch {
    // corrupt data — fall through to defaults
  }
  return { uiScale: DEFAULT_UI_SCALE, boardScale: DEFAULT_BOARD_SCALE, tier: DEFAULT_TIER, difficulty: DEFAULT_DIFFICULTY, battlefieldAmbience: true, battlefield: 'auto', easyReadMode: true, narrationEnabled: true, tutorialEnabled: true, combatMathEnabled: true, autoUpdateEnabled: true };
}

function persistPreferences(prefs: PersistedPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

const initial = loadPersistedPreferences();
applyUIScale(initial.uiScale);
applyBoardScale(initial.boardScale);

export const usePreferencesStore = create<PreferencesState>()(
  subscribeWithSelector((set, get) => ({
    uiScale: initial.uiScale,
    boardScale: initial.boardScale,
    tier: initial.tier,
    difficulty: initial.difficulty,
    battlefieldAmbience: initial.battlefieldAmbience,
    battlefield: initial.battlefield,
    easyReadMode: initial.easyReadMode,
    narrationEnabled: initial.narrationEnabled,
    tutorialEnabled: initial.tutorialEnabled,
    combatMathEnabled: initial.combatMathEnabled,
    autoUpdateEnabled: initial.autoUpdateEnabled,

    setUIScale: (scale) => {
      const clamped = Math.round(Math.max(0.6, Math.min(1.4, scale)) * 100) / 100;
      applyUIScale(clamped);
      persistPreferences({ ...get(), uiScale: clamped });
      set({ uiScale: clamped });
    },

    resetUIScale: () => {
      applyUIScale(DEFAULT_UI_SCALE);
      persistPreferences({ ...get(), uiScale: DEFAULT_UI_SCALE });
      set({ uiScale: DEFAULT_UI_SCALE });
    },

    setBoardScale: (scale) => {
      const clamped = Math.round(Math.max(0.6, Math.min(1.4, scale)) * 100) / 100;
      applyBoardScale(clamped);
      persistPreferences({ ...get(), boardScale: clamped });
      set({ boardScale: clamped });
    },

    resetBoardScale: () => {
      applyBoardScale(DEFAULT_BOARD_SCALE);
      persistPreferences({ ...get(), boardScale: DEFAULT_BOARD_SCALE });
      set({ boardScale: DEFAULT_BOARD_SCALE });
    },

    setTier: (tier) => {
      persistPreferences({ ...get(), tier });
      set({ tier });
    },

    setDifficulty: (difficulty) => {
      persistPreferences({ ...get(), difficulty });
      set({ difficulty });
    },

    setBattlefieldAmbience: (battlefieldAmbience) => {
      persistPreferences({ ...get(), battlefieldAmbience });
      set({ battlefieldAmbience });
    },

    setBattlefield: (battlefield) => {
      persistPreferences({ ...get(), battlefield });
      set({ battlefield });
    },

    setEasyReadMode: (easyReadMode) => {
      persistPreferences({ ...get(), easyReadMode });
      set({ easyReadMode });
    },

    setNarrationEnabled: (narrationEnabled) => {
      persistPreferences({ ...get(), narrationEnabled });
      set({ narrationEnabled });
    },

    setTutorialEnabled: (tutorialEnabled) => {
      persistPreferences({ ...get(), tutorialEnabled });
      set({ tutorialEnabled });
    },

    setCombatMathEnabled: (combatMathEnabled) => {
      persistPreferences({ ...get(), combatMathEnabled });
      set({ combatMathEnabled });
    },

    setAutoUpdateEnabled: (autoUpdateEnabled) => {
      persistPreferences({ ...get(), autoUpdateEnabled });
      set({ autoUpdateEnabled });
    },
  })),
);
