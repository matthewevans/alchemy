import { useState, useCallback, useRef, lazy, Suspense, type ReactElement } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import type { PlayerId } from '@engine/types';
import { createRNG } from '@engine/prng';
import { TIER_CONFIGS } from '@engine/ruleset';
import { createAIConfig } from '@engine/aiConfig';
import { ELEMENTS } from '@engine/elements';
import { STARTER_DECKS, buildStarterDeck } from '@engine/starterDecks';
import { useGameStore } from '@game/gameStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { clearSavedGame, loadActiveGameId, loadGame } from '@storage/persistence';
import type { PeerSession } from '@network/peer';
import { setPendingSession } from '@network/sessionTransfer';
import { useDeckSelectMusic } from '@hooks/useDeckSelectMusic';
import { useMultiplayerLobbyMusic } from '@hooks/useMultiplayerLobbyMusic';
import { useTitleMusic } from '@hooks/useTitleMusic';
import { LearningOnboardingModal, TitleScreen } from '@components/ui';
import type { InitialDeck } from '@components/ui/DeckBuilder';

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
  useTitleMusic(subScreen === 'title');
  useDeckSelectMusic(subScreen === 'deck_select');
  useMultiplayerLobbyMusic(subScreen === 'multiplayer_lobby');
  const selectedTier = usePreferencesStore((s) => s.tier);
  const setSelectedTier = usePreferencesStore((s) => s.setTier);
  const selectedDifficulty = usePreferencesStore((s) => s.difficulty);
  const setSelectedDifficulty = usePreferencesStore((s) => s.setDifficulty);
  const learningOnboardingCompleted = usePreferencesStore((s) => s.learningOnboardingCompleted);
  const completeLearningOnboarding = usePreferencesStore((s) => s.completeLearningOnboarding);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initGame = useGameStore((s) => s.initGame);
  const restoreGame = useGameStore((s) => s.restoreGame);

  const savedGameId = loadActiveGameId();
  const hasSavedGame = savedGameId ? loadGame(savedGameId) !== null : false;

  const handleResume = useCallback(() => {
    if (!savedGameId) return;
    const saved = loadGame(savedGameId);
    if (!saved) return;
    restoreGame(saved.gameState, saved.rngState, saved.persisted);
    navigate(`/game/${savedGameId}`);
  }, [savedGameId, navigate, restoreGame]);

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

  const initialDeckRef = useRef<InitialDeck | undefined>(undefined);

  const handleDeckBuilder = useCallback(() => {
    initialDeckRef.current = undefined;
    setSubScreen('deck_builder');
  }, []);

  const handleCloneToDeckBuilder = useCallback((name: string, cardIds: string[]) => {
    initialDeckRef.current = { name, cardIds };
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

  const showLearningOnboarding = subScreen === 'title' && !learningOnboardingCompleted;
  let screen: ReactElement;

  switch (subScreen) {
    case 'title':
      screen = (
        <TitleScreen
          onPlay={handlePlay}
          onMultiplayer={handleMultiplayer}
          onDeckBuilder={handleDeckBuilder}
          onResume={hasSavedGame ? handleResume : undefined}
        />
      );
      break;
    case 'deck_select':
      screen = (
        <Suspense fallback={<HomeLoading label="Loading decks..." />}>
          <DeckSelectorScreen onSelectDeck={handleSelectDeck} onBack={handleBack} onCloneToDeckBuilder={handleCloneToDeckBuilder} tier={selectedTier} onTierChange={setSelectedTier} difficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty} />
        </Suspense>
      );
      break;
    case 'deck_builder':
      screen = (
        <Suspense fallback={<HomeLoading label="Loading deck builder..." />}>
          <DeckBuilderScreen onSelectDeck={handleSelectDeck} onBack={handleBack} tier={selectedTier} onTierChange={setSelectedTier} initialDeck={initialDeckRef.current} />
        </Suspense>
      );
      break;
    case 'multiplayer_lobby':
      screen = (
        <Suspense fallback={<HomeLoading label="Loading multiplayer..." />}>
          <MultiplayerLobbyScreen onStartGame={handleMultiplayerStart} onBack={handleBack} />
        </Suspense>
      );
      break;
  }

  return (
    <>
      {screen}
      <LearningOnboardingModal
        open={showLearningOnboarding}
        onComplete={completeLearningOnboarding}
      />
    </>
  );
}
