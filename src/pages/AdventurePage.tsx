import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMultiplayerLobbyMusic } from '@hooks/useMultiplayerLobbyMusic';
import { AudioMuteButton } from '@components/ui/AudioMuteButton';
import { AdventureMapBoard } from '@components/ui/AdventureMapBoard';
import { gameButtonClass } from '@components/ui/buttonStyles';
import { CAMPAIGN_GRAPH } from '../campaign/data/zones';
import { CAMPAIGN_BOARD_LAYOUTS } from '../campaign/data/mapLayouts';
import { buildCampaignZoneBoardView, pickCampaignZoneNodeId } from '../campaign/domain/mapBoard';
import { useCampaignStore } from '../campaign/store/campaignStore';
import type { CampaignNodeId, CampaignZoneId } from '../campaign/domain/types';

const PROFILE_ID = 'local_default';

function toLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function mapSearch(nodeId: CampaignNodeId, seed: string | null): string {
  const params = new URLSearchParams();
  params.set('node', nodeId);
  if (seed) params.set('seed', seed);
  const encoded = params.toString();
  return encoded.length > 0 ? `?${encoded}` : '';
}

export function AdventurePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  useMultiplayerLobbyMusic(true);

  const campaignProgress = useCampaignStore((s) => s.progress);
  const initializeCampaign = useCampaignStore((s) => s.initialize);
  const setActiveNode = useCampaignStore((s) => s.setActiveNode);
  const getNodeStatus = useCampaignStore((s) => s.getNodeStatus);
  const resetCampaign = useCampaignStore((s) => s.reset);
  const loading = useCampaignStore((s) => s.loading);

  useEffect(() => {
    void initializeCampaign(PROFILE_ID);
  }, [initializeCampaign]);

  const selectedNodeFromQuery = searchParams.get('node');
  const selectedZoneFromQuery = searchParams.get('zone');
  const selectedZoneId: CampaignZoneId = (
    selectedZoneFromQuery && CAMPAIGN_GRAPH.zones.some((zone) => zone.id === selectedZoneFromQuery)
      ? selectedZoneFromQuery
      : CAMPAIGN_GRAPH.zones[0]?.id
  ) ?? 'ember_trail';
  const preferredNodeId = selectedNodeFromQuery && CAMPAIGN_GRAPH.nodes[selectedNodeFromQuery]
    ? selectedNodeFromQuery
    : campaignProgress.activeNodeId;
  const effectiveSelectedNodeId = pickCampaignZoneNodeId(
    CAMPAIGN_GRAPH,
    campaignProgress,
    selectedZoneId,
    preferredNodeId,
  );
  const selectedNode = effectiveSelectedNodeId ? CAMPAIGN_GRAPH.nodes[effectiveSelectedNodeId] : null;
  const seed = searchParams.get('seed');
  const selectedZone = CAMPAIGN_GRAPH.zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const totalNodeCount = Object.keys(CAMPAIGN_GRAPH.nodes).length;
  const completedNodeCount = campaignProgress.completedNodeIds.length;
  const unlockedBeyondStartCount = campaignProgress.unlockedNodeIds.filter(
    (nodeId) => nodeId !== CAMPAIGN_GRAPH.startNodeId,
  ).length;
  const hasProgressToReset = completedNodeCount > 0
    || unlockedBeyondStartCount > 0
    || campaignProgress.activeNodeId !== CAMPAIGN_GRAPH.startNodeId;

  const selectedZoneBoard = useMemo(
    () => {
      const zone = CAMPAIGN_GRAPH.zones.find((candidate) => candidate.id === selectedZoneId);
      if (!zone) return null;
      return buildCampaignZoneBoardView(
        CAMPAIGN_GRAPH,
        campaignProgress,
        zone,
        effectiveSelectedNodeId,
        CAMPAIGN_BOARD_LAYOUTS,
      );
    },
    [campaignProgress, effectiveSelectedNodeId, selectedZoneId],
  );

  const handleChooseDeck = useCallback(() => {
    if (!selectedNode) return;
    navigate(`/adventure/deck-select/${selectedNode.id}${mapSearch(selectedNode.id, seed)}`);
  }, [navigate, selectedNode, seed]);

  const handleSelectNode = useCallback((nodeId: CampaignNodeId) => {
    if (effectiveSelectedNodeId === nodeId) return;
    if (getNodeStatus(nodeId) === 'locked') return;

    const params = new URLSearchParams(searchParams);
    params.set('zone', CAMPAIGN_GRAPH.nodes[nodeId].zoneId);
    params.set('node', nodeId);
    setSearchParams(params, { replace: true });
    void setActiveNode(nodeId);
  }, [effectiveSelectedNodeId, getNodeStatus, searchParams, setActiveNode, setSearchParams]);

  const handleSelectZone = useCallback((zoneId: CampaignZoneId) => {
    const nextNodeId = pickCampaignZoneNodeId(
      CAMPAIGN_GRAPH,
      campaignProgress,
      zoneId,
      effectiveSelectedNodeId,
    );

    const params = new URLSearchParams(searchParams);
    params.set('zone', zoneId);
    if (nextNodeId) {
      params.set('node', nextNodeId);
    } else {
      params.delete('node');
    }
    setSearchParams(params, { replace: true });

    if (nextNodeId && getNodeStatus(nextNodeId) !== 'locked') {
      void setActiveNode(nextNodeId);
    }
  }, [campaignProgress, effectiveSelectedNodeId, getNodeStatus, searchParams, setActiveNode, setSearchParams]);

  const handleResetProgress = useCallback(() => {
    if (!hasProgressToReset) return;

    const summary = [
      'Reset Adventure progress?',
      '',
      `Completed battles: ${completedNodeCount}`,
      `Unlocked battles beyond start: ${unlockedBeyondStartCount}`,
      `Active battle: ${campaignProgress.activeNodeId ?? 'none'} → ${CAMPAIGN_GRAPH.startNodeId}`,
      '',
      'This will clear your local Adventure campaign progression for this profile.',
      'This cannot be undone.',
    ].join('\n');

    if (!window.confirm(summary)) return;

    void resetCampaign();
    const params = new URLSearchParams();
    params.set('zone', CAMPAIGN_GRAPH.zones[0]?.id ?? 'ember_trail');
    params.set('node', CAMPAIGN_GRAPH.startNodeId);
    if (seed) params.set('seed', seed);
    setSearchParams(params, { replace: true });
  }, [
    campaignProgress.activeNodeId,
    completedNodeCount,
    hasProgressToReset,
    resetCampaign,
    seed,
    setSearchParams,
    unlockedBeyondStartCount,
  ]);

  return (
    <div className="relative h-screen w-screen overflow-y-auto bg-slate-950 text-white px-4 py-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[-4rem] h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute top-[12rem] right-[-6rem] h-96 w-96 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="rounded-2xl border border-slate-500/30 bg-slate-900/50 px-4 py-4 backdrop-blur-sm shadow-[0_20px_50px_rgba(2,6,23,0.35)] sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-cyan-200/90 text-xs font-semibold uppercase tracking-[0.11em]">Adventure Mode</p>
              <h1 className="text-3xl font-black leading-tight">Campaign Map</h1>
              <p className="mt-1 text-sm text-white/70 max-w-2xl">Choose a zone, inspect each encounter, and progress through the route. Side battles are optional; losses are unlimited retries.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
                Progress {completedNodeCount}/{totalNodeCount}
              </span>
              <button
                className={gameButtonClass({ tone: 'neutral', size: 'sm', className: 'font-semibold' })}
                onClick={() => navigate('/')}
              >
                Main Menu
              </button>
              <button
                className={gameButtonClass({
                  tone: 'red',
                  size: 'sm',
                  className: 'font-semibold',
                  disabled: !hasProgressToReset,
                })}
                onClick={handleResetProgress}
                disabled={!hasProgressToReset}
              >
                Reset Progress
              </button>
            </div>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-600/30 bg-slate-900/45 p-2 sm:p-3">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Zones</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CAMPAIGN_GRAPH.zones.map((zone) => (
                  <button
                    key={zone.id}
                    className={gameButtonClass({
                      tone: zone.id === selectedZoneId ? 'amber' : 'neutral',
                      size: 'sm',
                      className: 'font-semibold',
                    })}
                    onClick={() => handleSelectZone(zone.id)}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedZoneBoard && (
              <AdventureMapBoard
                board={selectedZoneBoard}
                onSelectNode={handleSelectNode}
              />
            )}
          </div>

          <aside className="rounded-2xl border border-slate-500/35 bg-slate-900/55 p-4 shadow-[0_20px_45px_rgba(2,6,23,0.35)] lg:sticky lg:top-[calc(env(safe-area-inset-top)+1rem)] lg:h-fit">
            <h3 className="text-xs font-semibold uppercase tracking-[0.11em] text-white/65">Selected Battle</h3>
            {selectedNode ? (
              <>
                <p className="mt-2 text-2xl font-black leading-tight">{selectedNode.label}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                    Zone {selectedZone?.label ?? selectedNode.zoneId}
                  </span>
                  <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                    Opponent {selectedNode.opponentDeckId}
                  </span>
                  <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                    Difficulty {toLabel(selectedNode.aiDifficulty)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/70">Select your deck next, then start the encounter.</p>
                <button
                  className={gameButtonClass({
                    tone: 'emerald',
                    size: 'md',
                    className: 'mt-4 w-full font-bold',
                    disabled: getNodeStatus(selectedNode.id) === 'locked',
                  })}
                  onClick={handleChooseDeck}
                  disabled={getNodeStatus(selectedNode.id) === 'locked'}
                >
                  Continue to Deck Selection
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/60">{loading ? 'Loading campaign progress...' : 'Pick an unlocked node to continue.'}</p>
            )}
          </aside>
        </div>
      </div>
      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30">
        <AudioMuteButton className="w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/40 hover:text-white/70" />
      </div>
    </div>
  );
}
