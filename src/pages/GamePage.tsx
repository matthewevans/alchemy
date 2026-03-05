import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PlayerId, GameStats } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useLearningProfileStore } from '@game/learningProfileStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { GameDispatchProvider, useGameDispatch } from '@game/GameDispatchContext';
import { dispatchWithAnimations } from '@game/dispatchWithAnimations';
import { createAIController } from '@game/controllers/aiController';
import { createNetworkController } from '@game/controllers/networkController';
import type { OpponentController } from '@game/controllers/types';
import { takePendingSession } from '@network/sessionTransfer';
import { useAnimationStore } from '@game/animationStore';
import { useGameLoop } from '@hooks/useGameLoop';
import { useAmbientMusic } from '@hooks/useAmbientMusic';
import { useTutorialTriggers } from '@hooks/useTutorialTriggers';
import { prewarmEffectSounds } from '@audio/sounds';
import { clearSavedGame, saveHistoryEntry } from '@storage/persistence';
import { AnimatePresence } from 'framer-motion';
import { GameBoard } from '@components/board';
import { GameOverScreen, MulliganOverlay } from '@components/ui';
import { GameMenu } from '@components/ui/GameMenu';
import { gameButtonClass } from '@components/ui/buttonStyles';
import { AudioMuteButton } from '@components/ui/AudioMuteButton';
import { StartupLoadingOverlay } from '@components/ui/StartupLoadingOverlay';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { useCampaignStore } from '../campaign/store/campaignStore';
import {
  ensureStartupAssetsPreloaded,
  subscribeStartupPreload,
  type StartupPreloadProgress,
} from '../startup/preloadAssets';

type GamePhase = 'playing' | 'game_over';

const INITIAL_STARTUP_PROGRESS: StartupPreloadProgress = {
  phase: 'discovering',
  loaded: 0,
  failed: 0,
  total: 0,
  percent: 0,
};

export function GamePage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const storeGameId = useGameStore((s) => s.gameId);
  const resetGame = useGameStore((s) => s.reset);
  const suspendGame = useGameStore((s) => s.suspend);
  const sessionMeta = useGameStore((s) => s.sessionMeta);
  const isAdventureSession = sessionMeta?.mode === 'adventure';

  const [phase, setPhase] = useState<GamePhase>('playing');
  const [gameOverWinner, setGameOverWinner] = useState<PlayerId>('player1');
  const [gameOverStats, setGameOverStats] = useState<GameStats | null>(null);
  const [controller, setController] = useState<OpponentController | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [startupProgress, setStartupProgress] = useState<StartupPreloadProgress>(INITIAL_STARTUP_PROGRESS);
  const initializeLearningProfile = useLearningProfileStore((s) => s.initialize);
  const readingLevel = usePreferencesStore((s) => s.readingLevel);
  const mathLevel = usePreferencesStore((s) => s.mathLevel);
  const controllerRef = useRef<OpponentController | null>(null);
  const initRef = useRef(false);

  // Dispose controller on change
  useEffect(() => {
    controllerRef.current = controller;
    return () => { controller?.dispose(); };
  }, [controller]);

  // Initialize game: either already in store, restore from persistence, or redirect
  useEffect(() => {
    void initializeLearningProfile('local_default', { readingLevel, mathLevel });
  }, [initializeLearningProfile, readingLevel, mathLevel]);

  useEffect(() => {
    if (!sessionMeta || sessionMeta.mode !== 'adventure') return;
    void useCampaignStore.getState().initialize(sessionMeta.profileId);
  }, [sessionMeta]);

  useEffect(() => {
    const unsubscribe = subscribeStartupPreload((progress) => {
      setStartupProgress(progress);
    });
    void ensureStartupAssetsPreloaded();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initRef.current) return;

    if (storeGameId !== gameId) {
      initRef.current = true;
      // Page was refreshed or navigated to directly — redirect home so the user
      // can tap "Resume" (the user gesture unlocks the Web Audio AudioContext).
      navigate('/', { replace: true });
      return;
    }

    if (startupProgress.phase !== 'complete') return;
    initRef.current = true;

    // If the store already has this game (navigated from HomePage), set up controller
    const session = takePendingSession();
    if (session) {
      // Multiplayer: set up network controller
      const netController = createNetworkController(session, {
        dispatch: (action, player) => dispatchWithAnimations(action, player),
      });
      session.onDisconnect((reason) => setDisconnectReason(reason));
      setController(netController); // eslint-disable-line react-hooks/set-state-in-effect -- init-once effect
      setIsMultiplayer(true);
    } else {
      // Single player: set up AI controller with difficulty config
      const storeAiConfig = useGameStore.getState().aiConfig;
      const ai = createAIController({
        getState: () => useGameStore.getState(),
        dispatch: (action, player) => dispatchWithAnimations(action, player),
      }, storeAiConfig ?? undefined);
      setController(ai);
    }
  }, [gameId, storeGameId, navigate, startupProgress.phase]);

  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const player1DeckIds = useGameStore((s) => s.player1DeckIds);
  const player2DeckIds = useGameStore((s) => s.player2DeckIds);
  const turn = useGameStore((s) => s.state?.turn ?? 0);

  const handleGameOver = useCallback(
    (winner: PlayerId) => {
      setGameOverWinner(winner);
      const currentState = useGameStore.getState().state;
      setGameOverStats(currentState?.stats[humanPlayer] ?? null);
      setPhase('game_over');

      if (!isMultiplayer) {
        clearSavedGame(gameId);
        saveHistoryEntry({
          id: crypto.randomUUID(),
          playedAt: Date.now(),
          outcome: winner === humanPlayer ? 'win' : 'loss',
          humanPlayer,
          player1DeckIds,
          player2DeckIds,
          turns: turn,
        });
      }

      if (sessionMeta?.mode === 'adventure') {
        void useCampaignStore.getState().recordBattleResult(
          sessionMeta.nodeId,
          winner === humanPlayer,
        );
      }
    },
    [gameId, humanPlayer, player1DeckIds, player2DeckIds, turn, isMultiplayer, sessionMeta],
  );

  const handlePlayAgain = useCallback(() => {
    controllerRef.current?.dispose();
    setController(null);
    resetGame();
    if (isAdventureSession) {
      navigate('/adventure');
      return;
    }
    navigate('/', { state: { initialScreen: isMultiplayer ? 'multiplayer_lobby' : 'deck_select' } });
  }, [resetGame, navigate, isMultiplayer, isAdventureSession]);

  const handleMainMenu = useCallback(() => {
    controllerRef.current?.dispose();
    setController(null);
    if (isMultiplayer) {
      resetGame();
    } else {
      suspendGame();
    }
    navigate('/');
  }, [isMultiplayer, resetGame, suspendGame, navigate]);

  const handleDisconnectAck = useCallback(() => {
    handleMainMenu();
  }, [handleMainMenu]);

  if (startupProgress.phase !== 'complete') {
    const label = startupProgress.phase === 'discovering'
      ? 'Preparing game assets...'
      : `Preparing game assets... ${startupProgress.percent}%`;
    return (
      <StartupLoadingOverlay
        label={label}
        loaded={startupProgress.loaded}
        total={startupProgress.total}
        failed={startupProgress.failed}
        percent={startupProgress.percent}
      />
    );
  }

  return (
    <GameDispatchProvider controller={controller}>
      <PlayingScreenInner
        onGameOver={handleGameOver}
        onMainMenu={handleMainMenu}
        isMultiplayer={isMultiplayer}
        disconnectReason={disconnectReason}
        onDisconnectAck={handleDisconnectAck}
      />
      <AnimatePresence>
        {phase === 'game_over' && (
          <GameOverScreen
            winner={gameOverWinner}
            humanPlayer={humanPlayer}
            stats={gameOverStats}
            onPlayAgain={handlePlayAgain}
            onMainMenu={handleMainMenu}
            playAgainLabel={isAdventureSession ? 'Continue Adventure' : undefined}
          />
        )}
      </AnimatePresence>
    </GameDispatchProvider>
  );
}

function PlayingScreenInner({
  onGameOver,
  onMainMenu,
  isMultiplayer,
  disconnectReason,
  onDisconnectAck,
}: {
  onGameOver: (winner: PlayerId) => void;
  onMainMenu: () => void;
  isMultiplayer: boolean;
  disconnectReason: string | null;
  onDisconnectAck: () => void;
}) {
  useGameLoop();
  useAmbientMusic();
  useTutorialTriggers();
  useEffect(() => {
    prewarmEffectSounds();
  }, []);

  const dispatch = useGameDispatch();
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const phase = useGameStore((s) => s.state?.phase);
  const [showMenu, setShowMenu] = useState(false);
  const disconnectPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const disconnectDialogRef = useDialogA11y({
    open: disconnectReason !== null,
    closeOnEscape: false,
    onClose: onDisconnectAck,
    initialFocusRef: disconnectPrimaryRef,
  });

  // Defer game-over callback until all animations have finished
  useEffect(() => {
    if (phase?.type !== 'game_over') return;

    if (!useAnimationStore.getState().isAnimating) {
      onGameOver(phase.winner);
      return;
    }

    // Animations still playing — wait for them to finish
    const unsub = useAnimationStore.subscribe(
      (s) => s.isAnimating,
      (isAnimating) => {
        if (!isAnimating) {
          onGameOver(phase.winner);
          unsub();
        }
      },
    );
    return unsub;
  }, [phase, onGameOver]);

  return (
    <>
      <GameBoard />
      <MulliganOverlay />

      {/* Gear menu button */}
      <button
        className={gameButtonClass({
          tone: 'slate',
          size: 'sm',
          className:
            'fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/70 hover:text-white',
        })}
        onClick={() => setShowMenu(true)}
        aria-label="Game menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7">
          <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
        </svg>
      </button>
      <AudioMuteButton className="fixed left-3 top-[calc(env(safe-area-inset-top)+4.75rem)] z-30 w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/70 hover:text-white" />

      {/* In-game menu */}
      <AnimatePresence>
        {showMenu && (
          <GameMenu
            onResume={() => setShowMenu(false)}
            onConcede={() => {
              setShowMenu(false);
              dispatch({ type: 'CONCEDE' }, humanPlayer);
            }}
            onMainMenu={isMultiplayer ? undefined : () => {
              setShowMenu(false);
              onMainMenu();
            }}
          />
        )}
      </AnimatePresence>

      {disconnectReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div
            ref={disconnectDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-title"
            tabIndex={-1}
            className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm"
          >
            <h3 id="disconnect-title" className="text-xl font-bold text-red-400">Disconnected</h3>
            <p className="text-white/70 text-sm text-center">{disconnectReason}</p>
            <button
              ref={disconnectPrimaryRef}
              className={gameButtonClass({
                tone: 'slate',
                size: 'md',
                className: 'font-bold',
              })}
              onClick={onDisconnectAck}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
