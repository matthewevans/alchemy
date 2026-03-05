import { describe, expect, it } from 'vitest';
import { CAMPAIGN_GRAPH } from '../data/zones';
import {
  applyCampaignBattleResult,
  createInitialCampaignProgress,
  getCampaignNodeStatus,
} from './progression';

describe('campaign progression', () => {
  it('starts with only the first node unlocked', () => {
    const progress = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    expect(progress.unlockedNodeIds).toEqual([CAMPAIGN_GRAPH.startNodeId]);
    expect(progress.activeNodeId).toBe(CAMPAIGN_GRAPH.startNodeId);
  });

  it('unlocks hybrid side/core nodes when prerequisites are completed', () => {
    let progress = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    progress = applyCampaignBattleResult(CAMPAIGN_GRAPH, progress, 'zone1_core_1', true, 200);

    expect(progress.completedNodeIds).toContain('zone1_core_1');
    expect(progress.unlockedNodeIds).toContain('zone1_side_1');
    expect(progress.unlockedNodeIds).toContain('zone1_core_2');
    expect(getCampaignNodeStatus(progress, 'zone1_side_1')).toBe('unlocked');
  });

  it('keeps unlimited retry on losses', () => {
    const progress = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    const afterLoss = applyCampaignBattleResult(CAMPAIGN_GRAPH, progress, 'zone1_core_1', false, 150);

    expect(afterLoss.completedNodeIds).toHaveLength(0);
    expect(afterLoss.activeNodeId).toBe('zone1_core_1');
    expect(afterLoss.unlockedNodeIds).toContain('zone1_core_1');
  });
});
