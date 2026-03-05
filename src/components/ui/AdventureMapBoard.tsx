import type { CampaignNodeId } from '../../campaign/domain/types';
import type { CampaignBoardPoint, CampaignZoneBoardEdgeState, CampaignZoneBoardView } from '../../campaign/domain/mapBoard';

interface AdventureMapBoardProps {
  board: CampaignZoneBoardView;
  onSelectNode: (nodeId: CampaignNodeId) => void;
}

function zoneBackdrop(zoneId: string): string {
  if (zoneId === 'ember_trail') {
    return 'linear-gradient(145deg, rgba(127, 29, 29, 0.86), rgba(120, 53, 15, 0.78) 55%, rgba(67, 20, 7, 0.86))';
  }
  if (zoneId === 'frost_archipelago') {
    return 'linear-gradient(145deg, rgba(8, 47, 73, 0.88), rgba(30, 58, 138, 0.75) 50%, rgba(8, 47, 73, 0.9))';
  }
  return 'linear-gradient(145deg, rgba(30, 41, 59, 0.86), rgba(15, 23, 42, 0.82))';
}

interface ZoneTheme {
  accent: string;
  accentSoft: string;
  unlockedNode: string;
  completedNode: string;
  selectedNode: string;
  pathAvailable: string;
  pathCompleted: string;
}

function zoneTheme(zoneId: string): ZoneTheme {
  if (zoneId === 'ember_trail') {
    return {
      accent: 'rgb(251, 146, 60)',
      accentSoft: 'rgba(251, 146, 60, 0.2)',
      unlockedNode: 'from-orange-500 to-rose-500',
      completedNode: 'from-emerald-500 to-emerald-400',
      selectedNode: 'from-amber-200 to-yellow-300',
      pathAvailable: 'rgba(251, 146, 60, 0.92)',
      pathCompleted: 'rgba(16, 185, 129, 0.92)',
    };
  }
  if (zoneId === 'frost_archipelago') {
    return {
      accent: 'rgb(56, 189, 248)',
      accentSoft: 'rgba(56, 189, 248, 0.24)',
      unlockedNode: 'from-cyan-500 to-blue-500',
      completedNode: 'from-emerald-500 to-emerald-400',
      selectedNode: 'from-sky-100 to-cyan-200',
      pathAvailable: 'rgba(56, 189, 248, 0.92)',
      pathCompleted: 'rgba(16, 185, 129, 0.92)',
    };
  }
  return {
    accent: 'rgb(148, 163, 184)',
    accentSoft: 'rgba(148, 163, 184, 0.2)',
    unlockedNode: 'from-slate-500 to-slate-400',
    completedNode: 'from-emerald-500 to-emerald-400',
    selectedNode: 'from-slate-100 to-white',
    pathAvailable: 'rgba(148, 163, 184, 0.9)',
    pathCompleted: 'rgba(16, 185, 129, 0.92)',
  };
}

function formatPointValue(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function toPolylinePath(points: CampaignBoardPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${formatPointValue(points[0].x)} ${formatPointValue(points[0].y)}`;
  let output = `M ${formatPointValue(points[0].x)} ${formatPointValue(points[0].y)}`;
  for (let i = 1; i < points.length; i += 1) {
    output += ` L ${formatPointValue(points[i].x)} ${formatPointValue(points[i].y)}`;
  }
  return output;
}

function edgeStroke(state: CampaignZoneBoardEdgeState, theme: ZoneTheme): string {
  if (state === 'completed') return theme.pathCompleted;
  if (state === 'available') return theme.pathAvailable;
  return 'rgba(148, 163, 184, 0.38)';
}

function nodeTone(status: string, isSelected: boolean, theme: ZoneTheme): string {
  if (isSelected) {
    return `bg-gradient-to-br ${theme.selectedNode} border-white text-slate-900`;
  }
  if (status === 'completed') {
    return `bg-gradient-to-br ${theme.completedNode} border-emerald-100 text-white`;
  }
  if (status === 'unlocked') {
    return `bg-gradient-to-br ${theme.unlockedNode} border-white/50 text-white`;
  }
  return 'bg-slate-800/90 border-slate-500/75 text-slate-300';
}

function nodeBadge(kind: string): string {
  if (kind === 'boss') return 'Boss';
  if (kind === 'side') return 'Side';
  return 'Core';
}

export function AdventureMapBoard({ board, onSelectNode }: AdventureMapBoardProps) {
  const theme = zoneTheme(board.zoneId);
  const completedCount = board.nodes.filter((node) => node.status === 'completed').length;
  const unlockedCount = board.nodes.filter((node) => node.status !== 'locked').length;
  const visibleEdges = board.pathRenderMode === 'hidden'
    ? []
    : board.pathRenderMode === 'unlocked-only'
      ? board.edges.filter((edge) => edge.state !== 'locked')
      : board.edges;

  const imagePath = board.backgroundImagePath
    ? `${import.meta.env.BASE_URL}${board.backgroundImagePath.replace(/^\/+/, '')}`
    : null;
  const fallback = zoneBackdrop(board.zoneId);
  const layeredBackground = imagePath
    ? `linear-gradient(to bottom, rgba(2, 6, 23, 0.03), rgba(2, 6, 23, 0.14)), url(${imagePath})`
    : `${fallback}, linear-gradient(to bottom, rgba(2, 6, 23, 0.12), rgba(2, 6, 23, 0.28))`;

  return (
    <section className="rounded-2xl border border-slate-500/35 bg-slate-950/55 p-4 sm:p-5 shadow-[0_24px_55px_rgba(2,6,23,0.45)]">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">{board.label}</h2>
          <p className="text-sm text-white/65">{board.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
          <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1">
            Progress {completedCount}/{board.nodes.length}
          </span>
          <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1">
            Unlocked {unlockedCount}
          </span>
        </div>
      </div>

      <div
        className="relative aspect-[3/2] rounded-xl overflow-hidden border border-white/15"
        style={{
          backgroundImage: layeredBackground,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: imagePath ? 'normal, normal' : 'normal, multiply',
          filter: imagePath ? 'saturate(1.08) contrast(1.06)' : undefined,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.1),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-16" style={{ backgroundImage: `radial-gradient(circle at 80% 80%, ${theme.accentSoft}, transparent 36%)` }} />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {visibleEdges.map((edge) => (
            <path
              key={`${edge.id}-base`}
              d={toPolylinePath(edge.points)}
              fill="none"
              stroke="rgba(2, 6, 23, 0.55)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {visibleEdges.map((edge) => (
            <path
              key={edge.id}
              d={toPolylinePath(edge.points)}
              fill="none"
              stroke={edgeStroke(edge.state, theme)}
              strokeWidth={edge.state === 'locked' ? 1.45 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={edge.state === 'locked' ? '2.8 2.2' : edge.state === 'available' ? '0.1 0' : undefined}
              opacity={edge.state === 'locked' ? 0.58 : 1}
            />
          ))}
        </svg>

        {board.nodes.map((node) => {
          const disabled = node.status === 'locked';
          const nodeShadow = node.isSelected
            ? `0 0 0 2px rgba(255,255,255,0.34), 0 0 28px ${theme.accentSoft}`
            : node.status === 'locked'
              ? '0 0 0 1px rgba(148,163,184,0.24)'
              : `0 0 0 1px rgba(255,255,255,0.2), 0 0 20px ${theme.accentSoft}`;

          return (
            <button
              key={node.id}
              type="button"
              disabled={disabled}
              aria-label={`${node.label} (${nodeBadge(node.kind)}) ${node.status}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 min-h-[50px] min-w-[50px] sm:min-h-[54px] sm:min-w-[54px] rounded-full border-2 text-sm font-black transition-colors ${nodeTone(node.status, node.isSelected, theme)} ${disabled ? 'cursor-not-allowed opacity-75' : 'hover:brightness-110'}`}
              style={{ left: `${node.position.x}%`, top: `${node.position.y}%`, boxShadow: nodeShadow }}
              onClick={() => {
                if (disabled) return;
                onSelectNode(node.id);
              }}
            >
              {node.kind === 'boss' ? 'B' : node.kind === 'side' ? 'S' : 'C'}
              {disabled && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    <path fillRule="evenodd" d="M12 1.5a4.5 4.5 0 0 0-4.5 4.5v2.25H6a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 6 21.75h12a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 18 8.25h-1.5V6A4.5 4.5 0 0 0 12 1.5Zm-3 6.75V6a3 3 0 1 1 6 0v2.25H9Z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
              {node.isActive && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-semibold text-amber-200 border border-amber-300/45">
                  Active
                </span>
              )}
              <span className={`pointer-events-none absolute top-[calc(100%+0.4rem)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white border border-white/20 transition-opacity ${node.isSelected || node.isActive ? 'opacity-100' : 'opacity-0'} sm:opacity-100`}>
                {node.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-white/70">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400/80 ring-1 ring-white/20" />
          Locked
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-300 ring-1 ring-white/20" />
          Unlocked
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-300 ring-1 ring-white/20" />
          Completed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-black">C</span>
          Core
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-black">S</span>
          Side
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-black">B</span>
          Boss
        </span>
      </div>
    </section>
  );
}
