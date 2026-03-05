import type { CampaignGraph, CampaignProgress } from '../domain/types';
import { createInitialCampaignProgress } from '../domain/progression';

const CAMPAIGN_SCHEMA_VERSION = 1 as const;
const CAMPAIGN_KEY_PREFIX = 'alchemy:campaign:';

interface PersistedCampaignProgress {
  version: number;
  progress: CampaignProgress;
}

export interface CampaignRepository {
  load(profileId: string): Promise<CampaignProgress | null>;
  save(profileId: string, progress: CampaignProgress): Promise<void>;
}

function storageKey(profileId: string): string {
  return `${CAMPAIGN_KEY_PREFIX}${profileId}`;
}

function migrateProgress(
  value: unknown,
  graph: CampaignGraph,
): CampaignProgress | null {
  if (!value || typeof value !== 'object') return null;

  const parsed = value as Partial<PersistedCampaignProgress>;
  if (parsed.version !== CAMPAIGN_SCHEMA_VERSION) return null;
  if (!parsed.progress || typeof parsed.progress !== 'object') return null;

  const progress = parsed.progress as CampaignProgress;
  if (progress.version !== CAMPAIGN_SCHEMA_VERSION) return null;

  const validNodeIds = new Set(Object.keys(graph.nodes));
  const unlockedNodeIds = progress.unlockedNodeIds.filter((id) => validNodeIds.has(id));
  const completedNodeIds = progress.completedNodeIds.filter((id) => validNodeIds.has(id));
  const activeNodeId = progress.activeNodeId && validNodeIds.has(progress.activeNodeId)
    ? progress.activeNodeId
    : null;

  return {
    ...progress,
    unlockedNodeIds,
    completedNodeIds,
    activeNodeId,
  };
}

export class LocalCampaignRepository implements CampaignRepository {
  private readonly graph: CampaignGraph;

  constructor(graph: CampaignGraph) {
    this.graph = graph;
  }

  async load(profileId: string): Promise<CampaignProgress | null> {
    try {
      const raw = localStorage.getItem(storageKey(profileId));
      if (!raw) return null;
      return migrateProgress(JSON.parse(raw), this.graph);
    } catch {
      return null;
    }
  }

  async save(profileId: string, progress: CampaignProgress): Promise<void> {
    const payload: PersistedCampaignProgress = {
      version: CAMPAIGN_SCHEMA_VERSION,
      progress,
    };
    localStorage.setItem(storageKey(profileId), JSON.stringify(payload));
  }

  async loadOrCreate(profileId: string): Promise<CampaignProgress> {
    const loaded = await this.load(profileId);
    if (loaded) return loaded;

    const created = createInitialCampaignProgress(this.graph);
    await this.save(profileId, created);
    return created;
  }
}
