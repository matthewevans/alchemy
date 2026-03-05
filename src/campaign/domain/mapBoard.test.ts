import { describe, expect, it } from 'vitest';
import { CAMPAIGN_GRAPH } from '../data/zones';
import {
  applyCampaignBattleResult,
  createInitialCampaignProgress,
} from './progression';
import {
  buildCampaignZoneBoardView,
  pickCampaignZoneNodeId,
  type CampaignBoardLayoutRegistry,
} from './mapBoard';

describe('campaign map board view', () => {
  it('builds node status and edge state from progression', () => {
    const zone = CAMPAIGN_GRAPH.zones[0];
    const layouts: CampaignBoardLayoutRegistry = {
      zones: {
        [zone.id]: {
          zoneId: zone.id,
          nodes: {
            zone1_core_1: { x: 12, y: 72 },
            zone1_side_1: { x: 38, y: 34 },
            zone1_core_2: { x: 56, y: 60 },
            zone1_boss: { x: 84, y: 46 },
          },
        },
      },
    };

    const initial = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    const initialBoard = buildCampaignZoneBoardView(
      CAMPAIGN_GRAPH,
      initial,
      zone,
      'zone1_core_1',
      layouts,
    );

    expect(initialBoard.nodes.find((node) => node.id === 'zone1_core_1')?.status).toBe('unlocked');
    expect(initialBoard.nodes.find((node) => node.id === 'zone1_core_2')?.status).toBe('locked');
    expect(initialBoard.edges.find((edge) => edge.id === 'zone1_core_1->zone1_core_2')?.state).toBe('locked');

    const afterWin = applyCampaignBattleResult(CAMPAIGN_GRAPH, initial, 'zone1_core_1', true, 200);
    const unlockedBoard = buildCampaignZoneBoardView(
      CAMPAIGN_GRAPH,
      afterWin,
      zone,
      'zone1_core_2',
      layouts,
    );

    expect(unlockedBoard.nodes.find((node) => node.id === 'zone1_core_2')?.status).toBe('unlocked');
    expect(unlockedBoard.edges.find((edge) => edge.id === 'zone1_core_1->zone1_core_2')?.state).toBe('available');
  });

  it('falls back to generated node positions when layout is partial', () => {
    const zone = CAMPAIGN_GRAPH.zones[0];
    const layouts: CampaignBoardLayoutRegistry = {
      zones: {
        [zone.id]: {
          zoneId: zone.id,
          nodes: {
            zone1_core_1: { x: 10, y: 80 },
          },
        },
      },
    };
    const progress = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    const board = buildCampaignZoneBoardView(
      CAMPAIGN_GRAPH,
      progress,
      zone,
      null,
      layouts,
    );

    expect(board.nodes).toHaveLength(zone.nodeIds.length);
    for (const node of board.nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.x).toBeLessThanOrEqual(100);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeLessThanOrEqual(100);
    }
  });

  it('derives zone-local edges when explicit connector layout is not provided', () => {
    const zone = CAMPAIGN_GRAPH.zones[0];
    const layouts: CampaignBoardLayoutRegistry = {
      zones: {
        [zone.id]: {
          zoneId: zone.id,
          nodes: {
            zone1_core_1: { x: 14, y: 72 },
            zone1_side_1: { x: 38, y: 30 },
            zone1_core_2: { x: 56, y: 62 },
            zone1_boss: { x: 84, y: 46 },
          },
        },
      },
    };
    const progress = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    const board = buildCampaignZoneBoardView(
      CAMPAIGN_GRAPH,
      progress,
      zone,
      null,
      layouts,
    );

    const edgeIds = new Set(board.edges.map((edge) => edge.id));
    expect(edgeIds).toContain('zone1_core_1->zone1_side_1');
    expect(edgeIds).toContain('zone1_core_1->zone1_core_2');
    expect(edgeIds).toContain('zone1_side_1->zone1_core_2');
    expect(edgeIds).toContain('zone1_core_2->zone1_boss');
    expect(edgeIds).not.toContain('zone1_boss->zone2_core_1');
  });

  it('picks a valid node for a zone from preferred, active, then unlocked fallback', () => {
    const initial = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);
    expect(
      pickCampaignZoneNodeId(CAMPAIGN_GRAPH, initial, 'ember_trail', 'zone1_core_1'),
    ).toBe('zone1_core_1');

    const afterZone1Boss = applyCampaignBattleResult(
      CAMPAIGN_GRAPH,
      applyCampaignBattleResult(
        CAMPAIGN_GRAPH,
        applyCampaignBattleResult(CAMPAIGN_GRAPH, initial, 'zone1_core_1', true, 200),
        'zone1_core_2',
        true,
        300,
      ),
      'zone1_boss',
      true,
      400,
    );

    expect(
      pickCampaignZoneNodeId(CAMPAIGN_GRAPH, afterZone1Boss, 'frost_archipelago', null),
    ).toBe('zone2_core_1');
    expect(
      pickCampaignZoneNodeId(CAMPAIGN_GRAPH, afterZone1Boss, 'frost_archipelago', 'zone1_core_2'),
    ).toBe('zone2_core_1');
  });

  it('uses configurable path render mode and defaults to always', () => {
    const zone = CAMPAIGN_GRAPH.zones[0];
    const progress = createInitialCampaignProgress(CAMPAIGN_GRAPH, 100);

    const hiddenBoard = buildCampaignZoneBoardView(
      CAMPAIGN_GRAPH,
      progress,
      zone,
      null,
      {
        zones: {
          [zone.id]: {
            zoneId: zone.id,
            pathRenderMode: 'hidden',
            nodes: {},
          },
        },
      },
    );
    expect(hiddenBoard.pathRenderMode).toBe('hidden');

    const defaultBoard = buildCampaignZoneBoardView(
      CAMPAIGN_GRAPH,
      progress,
      zone,
      null,
      {
        zones: {
          [zone.id]: {
            zoneId: zone.id,
            nodes: {},
          },
        },
      },
    );
    expect(defaultBoard.pathRenderMode).toBe('always');
  });
});
