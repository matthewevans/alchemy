import type { AIDifficulty } from '@engine/aiConfig';

export type CampaignNodeId = string;
export type CampaignZoneId = string;

export interface CampaignNode {
  id: CampaignNodeId;
  zoneId: CampaignZoneId;
  label: string;
  kind: 'core' | 'side' | 'boss';
  nextNodeIds: CampaignNodeId[];
  prerequisiteNodeIds: CampaignNodeId[];
  opponentDeckId: string;
  aiDifficulty: AIDifficulty;
}

export interface CampaignZone {
  id: CampaignZoneId;
  label: string;
  description: string;
  nodeIds: CampaignNodeId[];
}

export interface CampaignGraph {
  startNodeId: CampaignNodeId;
  zones: CampaignZone[];
  nodes: Record<CampaignNodeId, CampaignNode>;
}

export interface CampaignProgress {
  version: 1;
  unlockedNodeIds: CampaignNodeId[];
  completedNodeIds: CampaignNodeId[];
  activeNodeId: CampaignNodeId | null;
  sync: {
    revision: number;
    dirty: boolean;
    updatedAt: number;
    lastSyncedAt: number | null;
  };
}

export type CampaignNodeStatus = 'locked' | 'unlocked' | 'completed';
