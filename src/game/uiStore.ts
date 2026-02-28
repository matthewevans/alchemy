import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface UIStore {
  // Card interaction
  selectedHandIndex: number | null;
  hoveredCardId: string | null;
  inspectedCardId: string | null;

  // Targeting
  isTargeting: boolean;

  // Combat
  selectedBlockerId: string | null;

  // Turn banner
  showTurnBanner: boolean;
  turnBannerText: string;

  // Actions
  selectHandCard: (index: number | null) => void;
  hoverCard: (cardId: string | null) => void;
  inspectCard: (cardId: string | null) => void;
  setTargeting: (targeting: boolean) => void;
  selectBlocker: (id: string | null) => void;
  flashTurnBanner: (text: string) => void;
  clearUI: () => void;
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set) => ({
    selectedHandIndex: null,
    hoveredCardId: null,
    inspectedCardId: null,
    isTargeting: false,
    selectedBlockerId: null,
    showTurnBanner: false,
    turnBannerText: '',

    selectHandCard: (index) => set({ selectedHandIndex: index }),
    hoverCard: (cardId) => set({ hoveredCardId: cardId }),
    inspectCard: (cardId) => set({ inspectedCardId: cardId }),
    setTargeting: (targeting) => set({ isTargeting: targeting }),
    selectBlocker: (id) => set({ selectedBlockerId: id }),

    flashTurnBanner: (text) => {
      set({ showTurnBanner: true, turnBannerText: text });
      setTimeout(() => set({ showTurnBanner: false }), 1500);
    },

    clearUI: () =>
      set({
        selectedHandIndex: null,
        hoveredCardId: null,
        inspectedCardId: null,
        isTargeting: false,
        selectedBlockerId: null,
        showTurnBanner: false,
        turnBannerText: '',
      }),
  })),
);
