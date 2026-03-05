import type {
  CampaignGraph,
  CampaignNodeId,
  CampaignNodeStatus,
  CampaignProgress,
} from './types';

function unique(values: CampaignNodeId[]): CampaignNodeId[] {
  return [...new Set(values)];
}

function allPrerequisitesMet(
  prerequisites: CampaignNodeId[],
  completed: Set<CampaignNodeId>,
): boolean {
  for (const id of prerequisites) {
    if (!completed.has(id)) return false;
  }
  return true;
}

function discoverUnlockableNodes(
  graph: CampaignGraph,
  completed: Set<CampaignNodeId>,
  unlocked: Set<CampaignNodeId>,
): CampaignNodeId[] {
  return Object.values(graph.nodes)
    .filter((node) => !unlocked.has(node.id))
    .filter((node) => allPrerequisitesMet(node.prerequisiteNodeIds, completed))
    .map((node) => node.id);
}

function pickNextActiveNode(
  graph: CampaignGraph,
  progress: CampaignProgress,
): CampaignNodeId | null {
  const completed = new Set(progress.completedNodeIds);

  for (const zone of graph.zones) {
    for (const nodeId of zone.nodeIds) {
      if (!progress.unlockedNodeIds.includes(nodeId)) continue;
      if (!completed.has(nodeId)) return nodeId;
    }
  }

  return null;
}

export function createInitialCampaignProgress(
  graph: CampaignGraph,
  now: number = Date.now(),
): CampaignProgress {
  return {
    version: 1,
    unlockedNodeIds: [graph.startNodeId],
    completedNodeIds: [],
    activeNodeId: graph.startNodeId,
    sync: {
      revision: 0,
      dirty: false,
      updatedAt: now,
      lastSyncedAt: null,
    },
  };
}

export function getCampaignNodeStatus(
  progress: CampaignProgress,
  nodeId: CampaignNodeId,
): CampaignNodeStatus {
  if (progress.completedNodeIds.includes(nodeId)) return 'completed';
  if (progress.unlockedNodeIds.includes(nodeId)) return 'unlocked';
  return 'locked';
}

export function applyCampaignBattleResult(
  graph: CampaignGraph,
  progress: CampaignProgress,
  nodeId: CampaignNodeId,
  won: boolean,
  now: number = Date.now(),
): CampaignProgress {
  if (!graph.nodes[nodeId]) return progress;

  if (!won) {
    return {
      ...progress,
      activeNodeId: nodeId,
      sync: {
        revision: progress.sync.revision + 1,
        dirty: true,
        updatedAt: now,
        lastSyncedAt: progress.sync.lastSyncedAt,
      },
    };
  }

  const completed = new Set(progress.completedNodeIds);
  completed.add(nodeId);

  const unlocked = new Set(progress.unlockedNodeIds);
  unlocked.add(nodeId);

  const discovered = discoverUnlockableNodes(graph, completed, unlocked);
  for (const candidate of discovered) {
    unlocked.add(candidate);
  }

  const nextProgress: CampaignProgress = {
    ...progress,
    completedNodeIds: unique([...completed]),
    unlockedNodeIds: unique([...unlocked]),
    activeNodeId: progress.activeNodeId,
    sync: {
      revision: progress.sync.revision + 1,
      dirty: true,
      updatedAt: now,
      lastSyncedAt: progress.sync.lastSyncedAt,
    },
  };

  return {
    ...nextProgress,
    activeNodeId: pickNextActiveNode(graph, nextProgress),
  };
}
