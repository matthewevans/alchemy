import type { CampaignGraph, CampaignNode, CampaignZone } from '../domain/types';

const zone1Nodes: CampaignNode[] = [
  {
    id: 'zone1_core_1',
    zoneId: 'ember_trail',
    label: 'Ashen Trail',
    kind: 'core',
    nextNodeIds: ['zone1_side_1', 'zone1_core_2'],
    prerequisiteNodeIds: [],
    opponentDeckId: 'Inferno',
    aiDifficulty: 'easy',
  },
  {
    id: 'zone1_side_1',
    zoneId: 'ember_trail',
    label: 'Crystal Spring',
    kind: 'side',
    nextNodeIds: ['zone1_core_2'],
    prerequisiteNodeIds: ['zone1_core_1'],
    opponentDeckId: 'Tidepool',
    aiDifficulty: 'easy',
  },
  {
    id: 'zone1_core_2',
    zoneId: 'ember_trail',
    label: 'Wind Rift',
    kind: 'core',
    nextNodeIds: ['zone1_boss'],
    prerequisiteNodeIds: ['zone1_core_1'],
    opponentDeckId: 'Stormfront',
    aiDifficulty: 'medium',
  },
  {
    id: 'zone1_boss',
    zoneId: 'ember_trail',
    label: 'Coven Summit',
    kind: 'boss',
    nextNodeIds: ['zone2_core_1'],
    prerequisiteNodeIds: ['zone1_core_2'],
    opponentDeckId: 'Moon Coven',
    aiDifficulty: 'hard',
  },
];

const zone2Nodes: CampaignNode[] = [
  {
    id: 'zone2_core_1',
    zoneId: 'frost_archipelago',
    label: 'Mist Harbor',
    kind: 'core',
    nextNodeIds: ['zone2_side_1', 'zone2_core_2'],
    prerequisiteNodeIds: ['zone1_boss'],
    opponentDeckId: 'Tsunami',
    aiDifficulty: 'medium',
  },
  {
    id: 'zone2_side_1',
    zoneId: 'frost_archipelago',
    label: 'Verdant Maze',
    kind: 'side',
    nextNodeIds: ['zone2_core_2'],
    prerequisiteNodeIds: ['zone2_core_1'],
    opponentDeckId: 'Ancient Grove',
    aiDifficulty: 'hard',
  },
  {
    id: 'zone2_core_2',
    zoneId: 'frost_archipelago',
    label: 'Molten Crossing',
    kind: 'core',
    nextNodeIds: ['zone2_boss'],
    prerequisiteNodeIds: ['zone2_core_1'],
    opponentDeckId: 'Wildfire',
    aiDifficulty: 'hard',
  },
  {
    id: 'zone2_boss',
    zoneId: 'frost_archipelago',
    label: 'Sanctum Eclipse',
    kind: 'boss',
    nextNodeIds: [],
    prerequisiteNodeIds: ['zone2_core_2'],
    opponentDeckId: 'Holy Shadow',
    aiDifficulty: 'very_hard',
  },
];

const zones: CampaignZone[] = [
  {
    id: 'ember_trail',
    label: 'Ember Trail',
    description: 'Learn core tactics across volcanic ruins and witch covens.',
    nodeIds: zone1Nodes.map((node) => node.id),
  },
  {
    id: 'frost_archipelago',
    label: 'Frost Archipelago',
    description: 'Face advanced tempo and control decks on drifting islands.',
    nodeIds: zone2Nodes.map((node) => node.id),
  },
];

const nodes = [...zone1Nodes, ...zone2Nodes].reduce<Record<string, CampaignNode>>((acc, node) => {
  acc[node.id] = node;
  return acc;
}, {});

export const CAMPAIGN_GRAPH: CampaignGraph = {
  startNodeId: 'zone1_core_1',
  zones,
  nodes,
};
