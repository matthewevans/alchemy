import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { STARTER_DECKS, buildStarterDeck } from '@engine/starterDecks';
import { useGameStore } from '@game/gameStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { startSinglePlayerGame } from '@game/useCases/startSinglePlayerGame';
import { useMultiplayerLobbyMusic } from '@hooks/useMultiplayerLobbyMusic';
import { DeckSelector } from '@components/ui/DeckSelector';
import { gameButtonClass } from '@components/ui/buttonStyles';
import { CAMPAIGN_GRAPH } from '../campaign/data/zones';
import { useCampaignStore } from '../campaign/store/campaignStore';

const PROFILE_ID = 'local_default';

function toLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function mapRoute(nodeId: string, seed: string | null): string {
  const params = new URLSearchParams();
  params.set('node', nodeId);
  if (seed) params.set('seed', seed);
  const encoded = params.toString();
  return encoded.length > 0 ? `/adventure?${encoded}` : '/adventure';
}

export function AdventureDeckSelectPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useMultiplayerLobbyMusic(true);

  const initGame = useGameStore((s) => s.initGame);
  const tier = usePreferencesStore((s) => s.tier);
  const setTier = usePreferencesStore((s) => s.setTier);
  const fallbackDifficulty = usePreferencesStore((s) => s.difficulty);

  const initializeCampaign = useCampaignStore((s) => s.initialize);
  const getNodeStatus = useCampaignStore((s) => s.getNodeStatus);
  const setActiveNode = useCampaignStore((s) => s.setActiveNode);
  const activeNodeId = useCampaignStore((s) => s.progress.activeNodeId);
  const initialized = useCampaignStore((s) => s.initialized);
  const loading = useCampaignStore((s) => s.loading);

  useEffect(() => {
    void initializeCampaign(PROFILE_ID);
  }, [initializeCampaign]);

  const selectedNode = nodeId ? CAMPAIGN_GRAPH.nodes[nodeId] ?? null : null;
  const zone = selectedNode ? CAMPAIGN_GRAPH.zones.find((candidate) => candidate.id === selectedNode.zoneId) : null;
  const nodeStatus = selectedNode ? getNodeStatus(selectedNode.id) : 'locked';
  const seedParam = searchParams.get('seed');

  useEffect(() => {
    if (!selectedNode || !initialized || loading || nodeStatus === 'locked' || activeNodeId === selectedNode.id) return;
    void setActiveNode(selectedNode.id);
  }, [activeNodeId, initialized, loading, nodeStatus, selectedNode, setActiveNode]);

  const opponentDeckIds = useMemo(() => {
    if (!selectedNode) return [];
    const opponentDeck = STARTER_DECKS.find((deck) => deck.name === selectedNode.opponentDeckId);
    if (!opponentDeck) return [];
    return buildStarterDeck(opponentDeck, tier);
  }, [selectedNode, tier]);

  const handleBack = useCallback(() => {
    if (selectedNode) {
      navigate(mapRoute(selectedNode.id, seedParam));
      return;
    }
    navigate('/adventure');
  }, [navigate, seedParam, selectedNode]);

  const handleSelectDeck = useCallback((humanDeckIds: string[]) => {
    if (!selectedNode || opponentDeckIds.length === 0) return;
    const parsedSeed = seedParam ? parseInt(seedParam, 10) : NaN;
    const seed = Number.isFinite(parsedSeed) ? parsedSeed : undefined;

    startSinglePlayerGame({
      humanDeckIds,
      tier,
      fallbackDifficulty,
      initGame,
      navigate,
      seed,
      opponent: {
        deckIds: opponentDeckIds,
        difficulty: selectedNode.aiDifficulty,
      },
      sessionMeta: {
        mode: 'adventure',
        profileId: PROFILE_ID,
        nodeId: selectedNode.id,
        zoneId: selectedNode.zoneId,
        matchModifiers: {},
      },
    });
  }, [fallbackDifficulty, initGame, navigate, opponentDeckIds, seedParam, selectedNode, tier]);

  if (!selectedNode) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-600/35 bg-slate-900/50 p-5">
          <p className="text-lg font-bold">Battle Not Found</p>
          <p className="mt-2 text-sm text-white/65">This campaign node no longer exists.</p>
          <button
            className={gameButtonClass({ tone: 'neutral', size: 'md', className: 'mt-4 w-full font-semibold' })}
            onClick={() => navigate('/adventure')}
          >
            Back to Adventure Map
          </button>
        </div>
      </div>
    );
  }

  if (!initialized || loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex items-center justify-center text-sm text-white/70">
        Loading adventure...
      </div>
    );
  }

  if (nodeStatus === 'locked') {
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-600/35 bg-slate-900/50 p-5">
          <p className="text-lg font-bold">Battle Locked</p>
          <p className="mt-2 text-sm text-white/65">Complete the required path before selecting this battle.</p>
          <button
            className={gameButtonClass({ tone: 'neutral', size: 'md', className: 'mt-4 w-full font-semibold' })}
            onClick={handleBack}
          >
            Back to Adventure Map
          </button>
        </div>
      </div>
    );
  }

  const subtitle = `${zone?.label ?? selectedNode.zoneId} · ${selectedNode.label} · Opponent: ${selectedNode.opponentDeckId} · AI: ${toLabel(selectedNode.aiDifficulty)}`;

  return (
    <DeckSelector
      onSelectDeck={handleSelectDeck}
      onBack={handleBack}
      tier={tier}
      onTierChange={setTier}
      title="Choose Your Adventure Deck"
      subtitle={subtitle}
    />
  );
}
