import type { CampaignBoardLayoutRegistry } from '../domain/mapBoard';

export const CAMPAIGN_BOARD_LAYOUTS: CampaignBoardLayoutRegistry = {
  zones: {
    ember_trail: {
      zoneId: 'ember_trail',
      backgroundImagePath: 'adventure/maps/ember_trail.webp',
      pathRenderMode: 'hidden',
      nodes: {
        // Platform centers in current ember_trail.webp (left-bottom -> left-top -> right-bottom -> right-top shrine)
        zone1_core_1: { x: 20.1, y: 64.6 },
        zone1_side_1: { x: 29.9, y: 16.0 },
        zone1_core_2: { x: 80.0, y: 65.2 },
        zone1_boss: { x: 82.5, y: 19.6 },
      },
      paths: [
        {
          id: 'ember_core_path',
          points: [
            { kind: 'node', nodeId: 'zone1_core_1' },
            { kind: 'point', x: 50.5, y: 73.2 },
            { kind: 'point', x: 67.4, y: 61.0 },
            { kind: 'node', nodeId: 'zone1_core_2' },
          ],
          unlockNodeIds: ['zone1_core_1', 'zone1_core_2'],
          completeNodeIds: ['zone1_core_1', 'zone1_core_2'],
        },
        {
          id: 'ember_side_branch',
          points: [
            { kind: 'node', nodeId: 'zone1_core_1' },
            { kind: 'point', x: 50.3, y: 44.5 },
            { kind: 'node', nodeId: 'zone1_side_1' },
          ],
          unlockNodeIds: ['zone1_core_1', 'zone1_side_1'],
          completeNodeIds: ['zone1_side_1'],
        },
        {
          id: 'ember_side_to_core2',
          points: [
            { kind: 'node', nodeId: 'zone1_side_1' },
            { kind: 'point', x: 50.3, y: 44.5 },
            { kind: 'point', x: 67.4, y: 61.0 },
            { kind: 'node', nodeId: 'zone1_core_2' },
          ],
          unlockNodeIds: ['zone1_side_1', 'zone1_core_2'],
          completeNodeIds: ['zone1_side_1', 'zone1_core_2'],
        },
        {
          id: 'ember_boss_route',
          points: [
            { kind: 'node', nodeId: 'zone1_core_2' },
            { kind: 'point', x: 67.4, y: 61.0 },
            { kind: 'point', x: 50.3, y: 44.5 },
            { kind: 'node', nodeId: 'zone1_boss' },
          ],
          unlockNodeIds: ['zone1_core_2', 'zone1_boss'],
          completeNodeIds: ['zone1_boss'],
        },
      ],
    },
    frost_archipelago: {
      zoneId: 'frost_archipelago',
      backgroundImagePath: 'adventure/maps/frost_archipelago.webp',
      pathRenderMode: 'hidden',
      nodes: {
        // Platform centers in frost_archipelago.webp (left-bottom -> left-top -> right-bottom -> right-top sanctum)
        zone2_core_1: { x: 17.8, y: 65.8 },
        zone2_side_1: { x: 25.5, y: 17.0 },
        zone2_core_2: { x: 77.2, y: 67.6 },
        zone2_boss: { x: 80.8, y: 19.0 },
      },
      paths: [
        {
          id: 'frost_core_path',
          points: [
            { kind: 'node', nodeId: 'zone2_core_1' },
            { kind: 'point', x: 39.2, y: 50.2 },
            { kind: 'point', x: 58.9, y: 53.5 },
            { kind: 'node', nodeId: 'zone2_core_2' },
          ],
          unlockNodeIds: ['zone2_core_1', 'zone2_core_2'],
          completeNodeIds: ['zone2_core_1', 'zone2_core_2'],
        },
        {
          id: 'frost_side_branch',
          points: [
            { kind: 'node', nodeId: 'zone2_core_1' },
            { kind: 'point', x: 39.2, y: 50.2 },
            { kind: 'point', x: 50.1, y: 34.8 },
            { kind: 'node', nodeId: 'zone2_side_1' },
          ],
          unlockNodeIds: ['zone2_core_1', 'zone2_side_1'],
          completeNodeIds: ['zone2_side_1'],
        },
        {
          id: 'frost_side_to_core2',
          points: [
            { kind: 'node', nodeId: 'zone2_side_1' },
            { kind: 'point', x: 50.1, y: 34.8 },
            { kind: 'point', x: 39.2, y: 50.2 },
            { kind: 'point', x: 58.9, y: 53.5 },
            { kind: 'node', nodeId: 'zone2_core_2' },
          ],
          unlockNodeIds: ['zone2_side_1', 'zone2_core_2'],
          completeNodeIds: ['zone2_side_1', 'zone2_core_2'],
        },
        {
          id: 'frost_boss_route',
          points: [
            { kind: 'node', nodeId: 'zone2_core_2' },
            { kind: 'point', x: 58.9, y: 53.5 },
            { kind: 'point', x: 39.2, y: 50.2 },
            { kind: 'point', x: 50.1, y: 34.8 },
            { kind: 'node', nodeId: 'zone2_boss' },
          ],
          unlockNodeIds: ['zone2_core_2', 'zone2_boss'],
          completeNodeIds: ['zone2_boss'],
        },
      ],
    },
  },
};
