import { create } from 'zustand';

interface LearningRuntimeState {
  sessionKey: string | null;
  opportunityCount: number;
  consumeOpportunity: (gameId: string | null) => number;
  reset: () => void;
}

function resolveSessionKey(gameId: string | null): string {
  return gameId ?? '__local__';
}

export const useLearningStore = create<LearningRuntimeState>()((set, get) => ({
  sessionKey: null,
  opportunityCount: 0,

  consumeOpportunity: (gameId) => {
    const sessionKey = resolveSessionKey(gameId);
    if (get().sessionKey !== sessionKey) {
      set({ sessionKey, opportunityCount: 1 });
      return 1;
    }
    const next = get().opportunityCount + 1;
    set({ opportunityCount: next });
    return next;
  },

  reset: () => {
    set({ sessionKey: null, opportunityCount: 0 });
  },
}));
