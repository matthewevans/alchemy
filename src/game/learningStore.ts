import { create } from 'zustand';
import type { LearningOutcome } from '../learning/domain/masteryModel';

interface LearningRuntimeState {
  sessionKey: string | null;
  opportunityCount: number;
  correctStreak: number;
  incorrectStreak: number;
  consumeOpportunity: (gameId: string | null) => number;
  recordChallengeResult: (outcome: LearningOutcome) => void;
  reset: () => void;
}

function resolveSessionKey(gameId: string | null): string {
  return gameId ?? '__local__';
}

export const useLearningStore = create<LearningRuntimeState>()((set, get) => ({
  sessionKey: null,
  opportunityCount: 0,
  correctStreak: 0,
  incorrectStreak: 0,

  consumeOpportunity: (gameId) => {
    const sessionKey = resolveSessionKey(gameId);
    if (get().sessionKey !== sessionKey) {
      set({
        sessionKey,
        opportunityCount: 1,
        correctStreak: 0,
        incorrectStreak: 0,
      });
      return 1;
    }

    const next = get().opportunityCount + 1;
    set({ opportunityCount: next });
    return next;
  },

  recordChallengeResult: (outcome) => {
    if (outcome === 'correct') {
      set((state) => ({ correctStreak: state.correctStreak + 1, incorrectStreak: 0 }));
      return;
    }

    if (outcome === 'incorrect') {
      set((state) => ({ correctStreak: 0, incorrectStreak: state.incorrectStreak + 1 }));
      return;
    }

    set({ correctStreak: 0, incorrectStreak: 0 });
  },

  reset: () => {
    set({
      sessionKey: null,
      opportunityCount: 0,
      correctStreak: 0,
      incorrectStreak: 0,
    });
  },
}));
