import { create } from 'zustand';
import type { MathLevel, ReadingLevel } from '../learning/config';
import {
  applyLearningOutcome,
  createDefaultLearningProfile,
  type AdaptationDecision,
  type LearningOutcome,
  type LearningProfile,
} from '../learning/domain/masteryModel';
import { LocalLearningProfileRepository } from '../learning/infrastructure/learningProfileRepository';

const repository = new LocalLearningProfileRepository();

interface LearningProfileState {
  profileId: string | null;
  profile: LearningProfile | null;
  initialized: boolean;
  lastDecision: AdaptationDecision | null;
  initialize: (
    profileId: string,
    defaults: { readingLevel: ReadingLevel; mathLevel: MathLevel },
  ) => Promise<void>;
  recordOutcome: (
    domain: 'reading' | 'math',
    outcome: LearningOutcome,
  ) => Promise<AdaptationDecision | null>;
  clearLastDecision: () => void;
  reset: () => void;
}

export const useLearningProfileStore = create<LearningProfileState>()((set, get) => ({
  profileId: null,
  profile: null,
  initialized: false,
  lastDecision: null,

  initialize: async (profileId, defaults) => {
    const state = get();
    if (state.initialized && state.profileId === profileId) return;

    const loaded = await repository.load(profileId);
    if (loaded) {
      set({ profileId, profile: loaded, initialized: true, lastDecision: null });
      return;
    }

    const profile = createDefaultLearningProfile(defaults.readingLevel, defaults.mathLevel);
    await repository.save(profileId, profile);

    set({ profileId, profile, initialized: true, lastDecision: null });
  },

  recordOutcome: async (domain, outcome) => {
    const state = get();
    if (!state.profile || !state.profileId) return null;

    const result = applyLearningOutcome(state.profile, domain, outcome);
    await repository.save(state.profileId, result.profile);

    set({
      profile: result.profile,
      lastDecision: result.decision.reason === 'no_change' ? null : result.decision,
    });

    return result.decision;
  },

  clearLastDecision: () => {
    set({ lastDecision: null });
  },

  reset: () => {
    set({
      profileId: null,
      profile: null,
      initialized: false,
      lastDecision: null,
    });
  },
}));
