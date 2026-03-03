import { create } from 'zustand';

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

const ALL_STEP_IDS = Object.keys(TUTORIAL_STEPS) as TutorialStepId[];

// ─── Persistence ───

const STORAGE_KEY = 'alchemy:tutorial';

function loadCompletedSteps(): Set<TutorialStepId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as TutorialStepId[];
      return new Set(arr);
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveCompletedSteps(steps: Set<TutorialStepId>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...steps]));
}

// ─── Store ───

interface TutorialState {
  tutorialComplete: boolean;
  completedSteps: Set<TutorialStepId>;
  currentTip: TutorialStepDef | null;
  showTip: (stepId: TutorialStepId) => void;
  dismissTip: () => void;
  skipTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()((set, get) => {
  const completedSteps = loadCompletedSteps();
  return {
    tutorialComplete: completedSteps.size >= ALL_STEP_IDS.length,
    completedSteps,
    currentTip: null,

    showTip: (stepId) => {
      const { completedSteps, tutorialComplete, currentTip } = get();
      if (tutorialComplete || completedSteps.has(stepId) || currentTip) return;
      set({ currentTip: TUTORIAL_STEPS[stepId] });
    },

    dismissTip: () => {
      const { currentTip, completedSteps } = get();
      if (!currentTip) return;
      const next = new Set(completedSteps);
      next.add(currentTip.id);
      saveCompletedSteps(next);
      set({
        currentTip: null,
        completedSteps: next,
        tutorialComplete: next.size >= ALL_STEP_IDS.length,
      });
    },

    skipTutorial: () => {
      const all = new Set(ALL_STEP_IDS);
      saveCompletedSteps(all);
      set({
        currentTip: null,
        completedSteps: all,
        tutorialComplete: true,
      });
    },
  };
});
