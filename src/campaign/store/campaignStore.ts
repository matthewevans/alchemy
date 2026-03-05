import { create } from 'zustand';
import { CAMPAIGN_GRAPH } from '../data/zones';
import {
  applyCampaignBattleResult,
  createInitialCampaignProgress,
  getCampaignNodeStatus,
} from '../domain/progression';
import type { CampaignNodeId, CampaignNodeStatus, CampaignProgress } from '../domain/types';
import { LocalCampaignRepository } from '../infrastructure/campaignRepository';

const repository = new LocalCampaignRepository(CAMPAIGN_GRAPH);

interface CampaignState {
  profileId: string | null;
  progress: CampaignProgress;
  initialized: boolean;
  loading: boolean;
  initialize: (profileId: string) => Promise<void>;
  setActiveNode: (nodeId: CampaignNodeId) => Promise<void>;
  recordBattleResult: (nodeId: CampaignNodeId, won: boolean) => Promise<void>;
  getNodeStatus: (nodeId: CampaignNodeId) => CampaignNodeStatus;
  reset: () => Promise<void>;
}

const initialProgress = createInitialCampaignProgress(CAMPAIGN_GRAPH);

export const useCampaignStore = create<CampaignState>()((set, get) => ({
  profileId: null,
  progress: initialProgress,
  initialized: false,
  loading: false,

  initialize: async (profileId) => {
    const state = get();
    if (state.initialized && state.profileId === profileId) return;

    set({ loading: true });
    const loaded = await repository.load(profileId);
    const progress = loaded ?? createInitialCampaignProgress(CAMPAIGN_GRAPH);
    if (!loaded) {
      await repository.save(profileId, progress);
    }

    set({
      profileId,
      progress,
      initialized: true,
      loading: false,
    });
  },

  setActiveNode: async (nodeId) => {
    const state = get();
    if (!state.progress.unlockedNodeIds.includes(nodeId) || !state.profileId) return;

    const updated: CampaignProgress = {
      ...state.progress,
      activeNodeId: nodeId,
      sync: {
        ...state.progress.sync,
        revision: state.progress.sync.revision + 1,
        dirty: true,
        updatedAt: Date.now(),
      },
    };

    await repository.save(state.profileId, updated);
    set({ progress: updated });
  },

  recordBattleResult: async (nodeId, won) => {
    const state = get();
    if (!state.profileId) return;

    const updated = applyCampaignBattleResult(CAMPAIGN_GRAPH, state.progress, nodeId, won);
    await repository.save(state.profileId, updated);
    set({ progress: updated });
  },

  getNodeStatus: (nodeId) => {
    return getCampaignNodeStatus(get().progress, nodeId);
  },

  reset: async () => {
    const profileId = get().profileId;
    if (!profileId) return;

    const resetProgress = createInitialCampaignProgress(CAMPAIGN_GRAPH);
    await repository.save(profileId, resetProgress);
    set({ progress: resetProgress });
  },
}));
