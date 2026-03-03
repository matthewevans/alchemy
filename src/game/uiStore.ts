import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface FeedbackState {
  message: string;
  x: number;
  y: number;
  tone: 'info' | 'warning';
}

interface UIStore {
  // Card interaction
  selectedHandIndex: number | null;
  hoveredCardId: string | null;
  inspectedCardId: string | null;

  // Targeting
  isTargeting: boolean;

  // Combat
  selectedBlockerId: string | null;
  selectedAttackerId: string | null;

  // Turn banner
  showTurnBanner: boolean;
  turnBannerText: string;

  // Action feedback
  feedback: FeedbackState | null;

  // Actions
  selectHandCard: (index: number | null) => void;
  hoverCard: (cardId: string | null) => void;
  inspectCard: (cardId: string | null) => void;
  setTargeting: (targeting: boolean) => void;
  selectBlocker: (id: string | null) => void;
  selectAttacker: (id: string | null) => void;
  flashTurnBanner: (text: string) => void;
  showFeedback: (message: string, x: number, y: number, tone?: 'info' | 'warning') => void;
  clearUI: () => void;
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set) => ({
    selectedHandIndex: null,
    hoveredCardId: null,
    inspectedCardId: null,
    isTargeting: false,
    selectedBlockerId: null,
    selectedAttackerId: null,
    showTurnBanner: false,
    turnBannerText: '',
    feedback: null,

    selectHandCard: (index) => set({ selectedHandIndex: index }),
    hoverCard: (cardId) => set({ hoveredCardId: cardId }),
    inspectCard: (cardId) => set({ inspectedCardId: cardId }),
    setTargeting: (targeting) => set({ isTargeting: targeting }),
    selectBlocker: (id) => set({ selectedBlockerId: id }),
    selectAttacker: (id) => set({ selectedAttackerId: id }),

    flashTurnBanner: (text) => {
      set({ showTurnBanner: true, turnBannerText: text });
      setTimeout(() => set({ showTurnBanner: false }), 1500);
    },

    showFeedback: (message, x, y, tone = 'warning') => {
      set({ feedback: { message, x, y, tone } });
      setTimeout(() => set({ feedback: null }), 2500);
    },

    clearUI: () =>
      set({
        selectedHandIndex: null,
        hoveredCardId: null,
        inspectedCardId: null,
        isTargeting: false,
        selectedBlockerId: null,
        selectedAttackerId: null,
        showTurnBanner: false,
        turnBannerText: '',
        feedback: null,
      }),
  })),
);
