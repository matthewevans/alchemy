import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Tier } from '@engine/types';
import type { AIDifficulty } from '@engine/aiConfig';
import type { LearningFrequency, MathLevel, ReadingLevel } from '../learning/config';

/** Battlefield ID (e.g. 'fire_molten', 'shadow_haunted_graveyard') or 'auto'. */
export type BattlefieldPreference = string;

/** How attack/health stats are positioned on creature cards. */
export type StatLayout = 'spread' | 'center' | 'right';

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
  statLayout: StatLayout;
  combatMathEnabled: boolean;
  mathBreakdownEnabled: boolean;
  learningChallengesEnabled: boolean;
  readingChallengesEnabled: boolean;
  mathChallengesEnabled: boolean;
  readingLevel: ReadingLevel;
  mathLevel: MathLevel;
  learningFrequency: LearningFrequency;
  autoUpdateEnabled: boolean;
  setStatLayout: (layout: StatLayout) => void;
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
  setMathBreakdownEnabled: (enabled: boolean) => void;
  setLearningChallengesEnabled: (enabled: boolean) => void;
  setReadingChallengesEnabled: (enabled: boolean) => void;
  setMathChallengesEnabled: (enabled: boolean) => void;
  setReadingLevel: (level: ReadingLevel) => void;
  setMathLevel: (level: MathLevel) => void;
  setLearningFrequency: (frequency: LearningFrequency) => void;
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
  statLayout: StatLayout;
  combatMathEnabled: boolean;
  mathBreakdownEnabled: boolean;
  learningChallengesEnabled: boolean;
  readingChallengesEnabled: boolean;
  mathChallengesEnabled: boolean;
  readingLevel: ReadingLevel;
  mathLevel: MathLevel;
  learningFrequency: LearningFrequency;
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
        narrationEnabled: typeof parsed.narrationEnabled === 'boolean' ? parsed.narrationEnabled : false,
        tutorialEnabled: typeof parsed.tutorialEnabled === 'boolean' ? parsed.tutorialEnabled : true,
        statLayout: ['spread', 'center', 'right'].includes(parsed.statLayout) ? parsed.statLayout : 'center',
        combatMathEnabled: typeof parsed.combatMathEnabled === 'boolean' ? parsed.combatMathEnabled : true,
        mathBreakdownEnabled: typeof parsed.mathBreakdownEnabled === 'boolean' ? parsed.mathBreakdownEnabled : false,
        learningChallengesEnabled: typeof parsed.learningChallengesEnabled === 'boolean' ? parsed.learningChallengesEnabled : false,
        readingChallengesEnabled: typeof parsed.readingChallengesEnabled === 'boolean' ? parsed.readingChallengesEnabled : true,
        mathChallengesEnabled: typeof parsed.mathChallengesEnabled === 'boolean' ? parsed.mathChallengesEnabled : true,
        readingLevel: ['r0', 'r1', 'r2', 'r3'].includes(parsed.readingLevel) ? parsed.readingLevel : 'r1',
        mathLevel: ['m0', 'm1', 'm2', 'm3'].includes(parsed.mathLevel) ? parsed.mathLevel : 'm1',
        learningFrequency: ['low', 'medium', 'high'].includes(parsed.learningFrequency) ? parsed.learningFrequency : 'medium',
        autoUpdateEnabled: typeof parsed.autoUpdateEnabled === 'boolean' ? parsed.autoUpdateEnabled : true,
      };
    }
  } catch {
    // corrupt data — fall through to defaults
  }
  return {
    uiScale: DEFAULT_UI_SCALE,
    boardScale: DEFAULT_BOARD_SCALE,
    tier: DEFAULT_TIER,
    difficulty: DEFAULT_DIFFICULTY,
    battlefieldAmbience: true,
    battlefield: 'auto',
    easyReadMode: true,
    narrationEnabled: false,
    tutorialEnabled: true,
    statLayout: 'center',
    combatMathEnabled: true,
    mathBreakdownEnabled: false,
    learningChallengesEnabled: false,
    readingChallengesEnabled: true,
    mathChallengesEnabled: true,
    readingLevel: 'r1',
    mathLevel: 'm1',
    learningFrequency: 'medium',
    autoUpdateEnabled: true,
  };
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
    statLayout: initial.statLayout,
    combatMathEnabled: initial.combatMathEnabled,
    mathBreakdownEnabled: initial.mathBreakdownEnabled,
    learningChallengesEnabled: initial.learningChallengesEnabled,
    readingChallengesEnabled: initial.readingChallengesEnabled,
    mathChallengesEnabled: initial.mathChallengesEnabled,
    readingLevel: initial.readingLevel,
    mathLevel: initial.mathLevel,
    learningFrequency: initial.learningFrequency,
    autoUpdateEnabled: initial.autoUpdateEnabled,

    setStatLayout: (statLayout) => {
      persistPreferences({ ...get(), statLayout });
      set({ statLayout });
    },

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

    setMathBreakdownEnabled: (mathBreakdownEnabled) => {
      persistPreferences({ ...get(), mathBreakdownEnabled });
      set({ mathBreakdownEnabled });
    },

    setLearningChallengesEnabled: (learningChallengesEnabled) => {
      persistPreferences({ ...get(), learningChallengesEnabled });
      set({ learningChallengesEnabled });
    },

    setReadingChallengesEnabled: (readingChallengesEnabled) => {
      persistPreferences({ ...get(), readingChallengesEnabled });
      set({ readingChallengesEnabled });
    },

    setMathChallengesEnabled: (mathChallengesEnabled) => {
      persistPreferences({ ...get(), mathChallengesEnabled });
      set({ mathChallengesEnabled });
    },

    setReadingLevel: (readingLevel) => {
      persistPreferences({ ...get(), readingLevel });
      set({ readingLevel });
    },

    setMathLevel: (mathLevel) => {
      persistPreferences({ ...get(), mathLevel });
      set({ mathLevel });
    },

    setLearningFrequency: (learningFrequency) => {
      persistPreferences({ ...get(), learningFrequency });
      set({ learningFrequency });
    },

    setAutoUpdateEnabled: (autoUpdateEnabled) => {
      persistPreferences({ ...get(), autoUpdateEnabled });
      set({ autoUpdateEnabled });
    },
  })),
);
