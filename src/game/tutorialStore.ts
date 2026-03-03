import { create } from 'zustand';
import { usePreferencesStore } from './preferencesStore';

// ─── Step Registry ───

export type TutorialStepId =
  | 'first_energy'
  | 'first_play'
  | 'first_battle'
  | 'first_block';

export interface TutorialStepDef {
  id: TutorialStepId;
  message: string;
  anchorSelector?: string;
}

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStepDef> = {
  first_energy: {
    id: 'first_energy',
    message: 'You got energy! Each turn you get one more. Play a card that costs that much!',
    anchorSelector: '[data-testid="phase-strip"]',
  },
  first_play: {
    id: 'first_play',
    message: 'Tap a glowing card to play it! Glowing cards are ones you can afford.',
    anchorSelector: '[data-hand-area]',
  },
  first_battle: {
    id: 'first_battle',
    message: 'Time to fight! Tap your creatures to choose who attacks.',
    anchorSelector: '[data-testid="phase-strip"]',
  },
  first_block: {
    id: 'first_block',
    message: 'The bad guys are attacking! Tap your creatures to block them.',
    anchorSelector: '[data-testid="phase-strip"]',
  },
};

// ─── Store ───

interface TutorialState {
  currentTip: TutorialStepDef | null;
  showTip: (stepId: TutorialStepId) => void;
  dismissTip: () => void;
  skipTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()((set, get) => ({
  currentTip: null,

  showTip: (stepId) => {
    if (get().currentTip) return;
    set({ currentTip: TUTORIAL_STEPS[stepId] });
  },

  dismissTip: () => {
    set({ currentTip: null });
  },

  skipTutorial: () => {
    set({ currentTip: null });
    usePreferencesStore.getState().setTutorialEnabled(false);
  },
}));
