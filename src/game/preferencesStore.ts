import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const STORAGE_KEY = 'alchemy:preferences';
const DEFAULT_UI_SCALE = 1;

interface PreferencesState {
  uiScale: number;
  setUIScale: (scale: number) => void;
  resetUIScale: () => void;
}

function applyUIScale(scale: number) {
  document.documentElement.style.setProperty('--ui-scale', String(scale));
}

function loadPersistedScale(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.uiScale === 'number') return parsed.uiScale;
    }
  } catch {
    // corrupt data — fall through to default
  }
  return DEFAULT_UI_SCALE;
}

function persistScale(scale: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ uiScale: scale }));
}

const initialScale = loadPersistedScale();
applyUIScale(initialScale);

export const usePreferencesStore = create<PreferencesState>()(
  subscribeWithSelector((set) => ({
    uiScale: initialScale,

    setUIScale: (scale) => {
      const clamped = Math.round(Math.max(0.6, Math.min(1.4, scale)) * 100) / 100;
      applyUIScale(clamped);
      persistScale(clamped);
      set({ uiScale: clamped });
    },

    resetUIScale: () => {
      applyUIScale(DEFAULT_UI_SCALE);
      persistScale(DEFAULT_UI_SCALE);
      set({ uiScale: DEFAULT_UI_SCALE });
    },
  })),
);
