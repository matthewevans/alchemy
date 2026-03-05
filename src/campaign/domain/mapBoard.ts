import { getCampaignNodeStatus } from './progression';
import type {
  CampaignGraph,
  CampaignNode,
  CampaignNodeId,
  CampaignNodeStatus,
  CampaignProgress,
  CampaignZone,
  CampaignZoneId,
} from './types';

export interface CampaignBoardPoint {
  x: number;
  y: number;
}

export interface CampaignBoardEdgeLayout {
  fromNodeId: CampaignNodeId;
  toNodeId: CampaignNodeId;
  via?: CampaignBoardPoint[];
}

export type CampaignBoardPathPointRef =
  | { kind: 'node'; nodeId: CampaignNodeId }
  | { kind: 'point'; x: number; y: number };

export interface CampaignBoardVisualPathLayout {
  id: string;
  points: CampaignBoardPathPointRef[];
  unlockNodeIds: CampaignNodeId[];
  completeNodeIds?: CampaignNodeId[];
  requiresAllUnlocked?: boolean;
}

export type CampaignBoardPathRenderMode = 'always' | 'unlocked-only' | 'hidden';

export interface CampaignZoneBoardLayout {
  zoneId: CampaignZoneId;
  backgroundImagePath?: string;
  nodes: Partial<Record<CampaignNodeId, CampaignBoardPoint>>;
  edges?: CampaignBoardEdgeLayout[];
  paths?: CampaignBoardVisualPathLayout[];
  pathRenderMode?: CampaignBoardPathRenderMode;
}

export interface CampaignBoardLayoutRegistry {
  zones: Partial<Record<CampaignZoneId, CampaignZoneBoardLayout>>;
}

export interface CampaignZoneBoardNodeView {
  id: CampaignNodeId;
  label: string;
  kind: CampaignNode['kind'];
  status: CampaignNodeStatus;
  isSelected: boolean;
  isActive: boolean;
  position: CampaignBoardPoint;
  opponentDeckId: string;
  aiDifficulty: CampaignNode['aiDifficulty'];
}

export type CampaignZoneBoardEdgeState = 'locked' | 'available' | 'completed';

export interface CampaignZoneBoardEdgeView {
  id: string;
  fromNodeId: CampaignNodeId;
  toNodeId: CampaignNodeId;
  points: CampaignBoardPoint[];
  state: CampaignZoneBoardEdgeState;
}

export interface CampaignZoneBoardView {
  zoneId: CampaignZoneId;
  label: string;
  description: string;
  backgroundImagePath: string | null;
  nodes: CampaignZoneBoardNodeView[];
  edges: CampaignZoneBoardEdgeView[];
  pathRenderMode: CampaignBoardPathRenderMode;
}

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function fallbackNodePoint(index: number, total: number): CampaignBoardPoint {
  const ratio = total <= 1 ? 0.5 : index / (total - 1);
  const wave = index % 2 === 0 ? 70 : 38;
  return {
    x: Math.round((14 + ratio * 72) * 10) / 10,
    y: wave,
  };
}

function normalizePoint(input: CampaignBoardPoint, fallback: CampaignBoardPoint): CampaignBoardPoint {
  return {
    x: clampPercent(input.x, fallback.x),
    y: clampPercent(input.y, fallback.y),
  };
}

function deriveZoneEdges(graph: CampaignGraph, zone: CampaignZone): CampaignBoardEdgeLayout[] {
  const edges: CampaignBoardEdgeLayout[] = [];
  for (const nodeId of zone.nodeIds) {
    const node = graph.nodes[nodeId];
    if (!node) continue;
    for (const nextNodeId of node.nextNodeIds) {
      const target = graph.nodes[nextNodeId];
      if (!target || target.zoneId !== zone.id) continue;
      edges.push({
        fromNodeId: node.id,
        toNodeId: target.id,
      });
    }
  }
  return edges;
}

function edgeState(from: CampaignNodeStatus, to: CampaignNodeStatus): CampaignZoneBoardEdgeState {
  if (from === 'completed' && to === 'completed') return 'completed';
  if (from !== 'locked' && to !== 'locked') return 'available';
  return 'locked';
}

function pathState(
  progress: CampaignProgress,
  path: CampaignBoardVisualPathLayout,
): CampaignZoneBoardEdgeState {
  const completedNodeIds = path.completeNodeIds ?? path.unlockNodeIds;
  if (completedNodeIds.length > 0) {
    const allCompleted = completedNodeIds.every(
      (nodeId) => getCampaignNodeStatus(progress, nodeId) === 'completed',
    );
    if (allCompleted) return 'completed';
  }

  if (path.unlockNodeIds.length === 0) return 'available';
  const requiresAllUnlocked = path.requiresAllUnlocked ?? true;
  const isUnlocked = requiresAllUnlocked
    ? path.unlockNodeIds.every((nodeId) => getCampaignNodeStatus(progress, nodeId) !== 'locked')
    : path.unlockNodeIds.some((nodeId) => getCampaignNodeStatus(progress, nodeId) !== 'locked');
  return isUnlocked ? 'available' : 'locked';
}

function buildNodePositionMap(
  zone: CampaignZone,
  layout: CampaignZoneBoardLayout | undefined,
): Record<CampaignNodeId, CampaignBoardPoint> {
  const map: Record<CampaignNodeId, CampaignBoardPoint> = {};
  const total = zone.nodeIds.length;

  for (let i = 0; i < total; i += 1) {
    const nodeId = zone.nodeIds[i];
    const fallback = fallbackNodePoint(i, total);
    const configured = layout?.nodes[nodeId];
    map[nodeId] = configured
      ? normalizePoint(configured, fallback)
      : fallback;
  }
  return map;
}

function resolvePathPoints(
  path: CampaignBoardVisualPathLayout,
  nodePositionMap: Record<CampaignNodeId, CampaignBoardPoint>,
): CampaignBoardPoint[] {
  const points: CampaignBoardPoint[] = [];
  for (const point of path.points) {
    if (point.kind === 'node') {
      const nodePoint = nodePositionMap[point.nodeId];
      if (!nodePoint) continue;
      points.push(nodePoint);
      continue;
    }

    points.push({
      x: clampPercent(point.x, point.x),
      y: clampPercent(point.y, point.y),
    });
  }
  return points;
}

export function buildCampaignZoneBoardView(
  graph: CampaignGraph,
  progress: CampaignProgress,
  zone: CampaignZone,
  selectedNodeId: CampaignNodeId | null,
  layouts: CampaignBoardLayoutRegistry,
): CampaignZoneBoardView {
  const layout = layouts.zones[zone.id];
  const nodePositionMap = buildNodePositionMap(zone, layout);

  const nodes: CampaignZoneBoardNodeView[] = zone.nodeIds
    .map((nodeId) => graph.nodes[nodeId])
    .filter((node): node is CampaignNode => node !== undefined)
    .map((node) => {
      const status = getCampaignNodeStatus(progress, node.id);
      return {
        id: node.id,
        label: node.label,
        kind: node.kind,
        status,
        isSelected: node.id === selectedNodeId,
        isActive: node.id === progress.activeNodeId,
        position: nodePositionMap[node.id],
        opponentDeckId: node.opponentDeckId,
        aiDifficulty: node.aiDifficulty,
      };
    });

  const configuredEdges = layout?.edges ?? deriveZoneEdges(graph, zone);
  const edges: CampaignZoneBoardEdgeView[] = layout?.paths
    ? layout.paths
      .map((path): CampaignZoneBoardEdgeView | null => {
        const points = resolvePathPoints(path, nodePositionMap);
        if (points.length < 2) return null;

        return {
          id: path.id,
          fromNodeId: path.unlockNodeIds[0] ?? zone.nodeIds[0],
          toNodeId: path.unlockNodeIds[path.unlockNodeIds.length - 1] ?? zone.nodeIds[zone.nodeIds.length - 1],
          points,
          state: pathState(progress, path),
        };
      })
      .filter((edge): edge is CampaignZoneBoardEdgeView => edge !== null)
    : configuredEdges
      .filter((edge) => nodePositionMap[edge.fromNodeId] && nodePositionMap[edge.toNodeId])
      .map((edge) => {
        const fromStatus = getCampaignNodeStatus(progress, edge.fromNodeId);
        const toStatus = getCampaignNodeStatus(progress, edge.toNodeId);
        const pathPoints: CampaignBoardPoint[] = [
          nodePositionMap[edge.fromNodeId],
          ...(edge.via ?? []).map((point) => normalizePoint(point, nodePositionMap[edge.fromNodeId])),
          nodePositionMap[edge.toNodeId],
        ];
        return {
          id: `${edge.fromNodeId}->${edge.toNodeId}`,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          points: pathPoints,
          state: edgeState(fromStatus, toStatus),
        };
      });

  return {
    zoneId: zone.id,
    label: zone.label,
    description: zone.description,
    backgroundImagePath: layout?.backgroundImagePath ?? null,
    nodes,
    edges,
    pathRenderMode: layout?.pathRenderMode ?? 'always',
  };
}

export function pickCampaignZoneNodeId(
  graph: CampaignGraph,
  progress: CampaignProgress,
  zoneId: CampaignZoneId,
  preferredNodeId: CampaignNodeId | null,
): CampaignNodeId | null {
  const zone = graph.zones.find((candidate) => candidate.id === zoneId);
  if (!zone) return null;

  const isNodeInZone = (nodeId: CampaignNodeId | null): nodeId is CampaignNodeId => {
    if (!nodeId) return false;
    const node = graph.nodes[nodeId];
    return node !== undefined && node.zoneId === zoneId;
  };

  if (isNodeInZone(preferredNodeId)) return preferredNodeId;
  if (isNodeInZone(progress.activeNodeId)) return progress.activeNodeId;

  for (const nodeId of zone.nodeIds) {
    if (getCampaignNodeStatus(progress, nodeId) !== 'locked') return nodeId;
  }

  return zone.nodeIds[0] ?? null;
}
