import { create } from 'zustand';
import { usePreferencesStore } from './preferencesStore';
import {
  TUTORIAL_STEPS,
  type TutorialStepDef,
  type TutorialStepId,
} from '../tutorial/domain/stepRegistry';
import {
  loadPersistedAutoSeenTips,
  persistAutoSeenTips,
} from '../tutorial/infrastructure/tipPersistence';

export type { TutorialStepDef, TutorialStepId } from '../tutorial/domain/stepRegistry';

export type TutorialTipSource = 'auto' | 'manual';

interface TutorialState {
  currentTip: TutorialStepDef | null;
  shownThisGame: Set<TutorialStepId>;
  autoSeenSteps: Set<TutorialStepId>;
  showTip: (stepId: TutorialStepId, source?: TutorialTipSource) => void;
  dismissTip: () => void;
  skipTutorial: () => void;
  resetForNewGame: () => void;
}

export const useTutorialStore = create<TutorialState>()((set, get) => ({
  currentTip: null,
  shownThisGame: new Set(),
  autoSeenSteps: loadPersistedAutoSeenTips(),

  showTip: (stepId, source = 'auto') => {
    const { currentTip, shownThisGame, autoSeenSteps } = get();
    if (currentTip) return;

    if (source === 'auto') {
      if (!usePreferencesStore.getState().tutorialEnabled) return;
      if (shownThisGame.has(stepId) || autoSeenSteps.has(stepId)) return;

      const nextShownThisGame = new Set(shownThisGame);
      nextShownThisGame.add(stepId);
      const nextAutoSeenSteps = new Set(autoSeenSteps);
      nextAutoSeenSteps.add(stepId);
      persistAutoSeenTips(nextAutoSeenSteps);

      set({
        currentTip: TUTORIAL_STEPS[stepId],
        shownThisGame: nextShownThisGame,
        autoSeenSteps: nextAutoSeenSteps,
      });
      return;
    }

    const nextShownThisGame = new Set(shownThisGame);
    nextShownThisGame.add(stepId);

    set({
      currentTip: TUTORIAL_STEPS[stepId],
      shownThisGame: nextShownThisGame,
    });
  },

  dismissTip: () => {
    set({ currentTip: null });
  },

  skipTutorial: () => {
    set({ currentTip: null });
    usePreferencesStore.getState().setTutorialEnabled(false);
  },

  resetForNewGame: () => {
    set({ currentTip: null, shownThisGame: new Set() });
  },
}));
