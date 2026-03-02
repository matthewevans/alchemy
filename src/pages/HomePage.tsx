import { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import type { PlayerId, Tier } from '@engine/types';
import { createRNG } from '@engine/prng';
import { TIER_CONFIGS } from '@engine/ruleset';
import type { AIDifficulty } from '@engine/aiConfig';
import { createAIConfig } from '@engine/aiConfig';
import { ELEMENTS } from '@engine/elements';
import { STARTER_DECKS, buildStarterDeck } from '@engine/starterDecks';
import { useGameStore } from '@game/gameStore';
import { clearSavedGame, loadActiveGameId, loadGame } from '@storage/persistence';
import type { PeerSession } from '@network/peer';
import { setPendingSession } from '@network/sessionTransfer';
import { TitleScreen } from '@components/ui';

type SubScreen = 'title' | 'deck_select' | 'deck_builder' | 'multiplayer_lobby';

const DeckSelectorScreen = lazy(async () => {
  const module = await import('@components/ui/DeckSelector');
  return { default: module.DeckSelector };
});

const DeckBuilderScreen = lazy(async () => {
  const module = await import('@components/ui/DeckBuilder');
  return { default: module.DeckBuilder };
});

const MultiplayerLobbyScreen = lazy(async () => {
  const module = await import('@components/ui/MultiplayerLobby');
  return { default: module.MultiplayerLobby };
});

function HomeLoading({ label }: { label: string }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white/70 text-sm">
      {label}
    </div>
  );
}

interface HomeLocationState {
  initialScreen?: SubScreen;
}

export function HomePage() {
  const location = useLocation();
  const locationState = location.state as HomeLocationState | null;
  const [subScreen, setSubScreen] = useState<SubScreen>(locationState?.initialScreen ?? 'title');
  const [selectedTier, setSelectedTier] = useState<Tier>('apprentice');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('medium');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initGame = useGameStore((s) => s.initGame);

  const savedGameId = loadActiveGameId();
  const hasSavedGame = savedGameId ? loadGame(savedGameId) !== null : false;

  const handleResume = useCallback(() => {
    if (savedGameId) {
      navigate(`/game/${savedGameId}`);
    }
  }, [savedGameId, navigate]);

  const handlePlay = useCallback(() => {
    // Clear any suspended game before starting a new one
    if (savedGameId) {
      clearSavedGame(savedGameId);
    }
    setSubScreen('deck_select');
  }, [savedGameId]);

  const handleMultiplayer = useCallback(() => {
    setSubScreen('multiplayer_lobby');
  }, []);

  const handleDeckBuilder = useCallback(() => {
    setSubScreen('deck_builder');
  }, []);

  const handleBack = useCallback(() => {
    setSubScreen('title');
  }, []);

  const handleSelectDeck = useCallback(
    (deckCardIds: string[]) => {
      const humanElements = new Set<string>();
      for (const id of deckCardIds) {
        humanElements.add(id.split('_')[0]);
      }
      const seedParam = searchParams.get('seed');
      const seed = seedParam ? parseInt(seedParam, 10) : Date.now();
      console.log(`[Alchemy] Game seed: ${seed}`);
      const rng = createRNG(seed);

      // Create AI config (personality is randomly chosen via seeded RNG)
      const aiConfig = createAIConfig(selectedDifficulty, rng);
      console.log(`[Alchemy] AI: ${aiConfig.difficulty} / ${aiConfig.personality}`);

      const availableElements = ELEMENTS.filter((el) => !humanElements.has(el));
      const aiElement = availableElements[Math.floor(rng() * availableElements.length)];
      const aiMonoDecks = STARTER_DECKS.filter((d) => d.type === 'mono' && d.elements[0] === aiElement);
      const aiStarterDeck = aiMonoDecks[Math.floor(rng() * aiMonoDecks.length)];
      const aiDeck = buildStarterDeck(aiStarterDeck, selectedTier);

      const gameId = initGame(
        {
          ruleset: TIER_CONFIGS[selectedTier],
          player1Deck: deckCardIds,
          player2Deck: aiDeck,
          rng,
        },
        'player1',
        aiConfig,
      );

      navigate(`/game/${gameId}`);
    },
    [initGame, navigate, searchParams, selectedTier, selectedDifficulty],
  );

  const handleMultiplayerStart = useCallback(
    (session: PeerSession, isHost: boolean, localDeckIds: string[], remoteDeckIds: string[], seed: number) => {
      const player1Deck = isHost ? localDeckIds : remoteDeckIds;
      const player2Deck = isHost ? remoteDeckIds : localDeckIds;
      const localPlayer: PlayerId = isHost ? 'player1' : 'player2';

      const rng = createRNG(seed);

      const gameId = initGame(
        {
          ruleset: TIER_CONFIGS[selectedTier],
          player1Deck,
          player2Deck,
          rng,
        },
        localPlayer,
      );

      // Multiplayer games aren't persisted across refresh
      clearSavedGame(gameId);

      setPendingSession(session);
      navigate(`/game/${gameId}`, { state: { isMultiplayer: true } });
    },
    [initGame, navigate],
  );

  switch (subScreen) {
    case 'title':
      return <TitleScreen onPlay={handlePlay} onMultiplayer={handleMultiplayer} onDeckBuilder={handleDeckBuilder} onResume={hasSavedGame ? handleResume : undefined} />;
    case 'deck_select':
      return (
        <Suspense fallback={<HomeLoading label="Loading decks..." />}>
          <DeckSelectorScreen onSelectDeck={handleSelectDeck} onBack={handleBack} tier={selectedTier} onTierChange={setSelectedTier} difficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty} />
        </Suspense>
      );
    case 'deck_builder':
      return (
        <Suspense fallback={<HomeLoading label="Loading deck builder..." />}>
          <DeckBuilderScreen onSelectDeck={handleSelectDeck} onBack={handleBack} tier={selectedTier} />
        </Suspense>
      );
    case 'multiplayer_lobby':
      return (
        <Suspense fallback={<HomeLoading label="Loading multiplayer..." />}>
          <MultiplayerLobbyScreen onStartGame={handleMultiplayerStart} onBack={handleBack} />
        </Suspense>
      );
  }
}
