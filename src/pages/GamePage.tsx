import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { GameDispatchProvider } from '@game/GameDispatchContext';
import { createAIController } from '@game/controllers/aiController';
import { createNetworkController } from '@game/controllers/networkController';
import type { OpponentController } from '@game/controllers/types';
import type { PeerSession } from '@network/peer';
import { useGameLoop } from '@hooks/useGameLoop';
import { loadGame, clearSavedGame, saveHistoryEntry } from '@storage/persistence';
import { AnimatePresence } from 'framer-motion';
import { GameBoard } from '@components/board';
import { GameOverScreen, MulliganOverlay } from '@components/ui';
import { GameMenu } from '@components/ui/GameMenu';
import { gameButtonClass } from '@components/ui/buttonStyles';
import { useDialogA11y } from '@hooks/useDialogA11y';

type GamePhase = 'playing' | 'game_over';

interface LocationState {
  session?: PeerSession;
  isMultiplayer?: boolean;
}

export function GamePage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const storeGameId = useGameStore((s) => s.gameId);
  const restoreGame = useGameStore((s) => s.restoreGame);
  const resetGame = useGameStore((s) => s.reset);

  const [phase, setPhase] = useState<GamePhase>('playing');
  const [gameOverWinner, setGameOverWinner] = useState<PlayerId>('player1');
  const [controller, setController] = useState<OpponentController | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const controllerRef = useRef<OpponentController | null>(null);
  const initRef = useRef(false);

  // Dispose controller on change
  useEffect(() => {
    controllerRef.current = controller;
    return () => { controller?.dispose(); };
  }, [controller]);

  // Initialize game: either already in store, restore from persistence, or redirect
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // If the store already has this game (navigated from HomePage), set up controller
    if (storeGameId === gameId) {
      if (locationState?.session) {
        // Multiplayer: set up network controller
        const session = locationState.session;
        const netController = createNetworkController(session, {
          dispatch: (action, player) => useGameStore.getState().dispatch(action, player),
        });
        session.onDisconnect((reason) => setDisconnectReason(reason));
        setController(netController);
        setIsMultiplayer(true);
      } else {
        // Single player: set up AI controller
        const ai = createAIController({
          getState: () => useGameStore.getState(),
          dispatch: (action, player) => useGameStore.getState().dispatch(action, player),
        });
        setController(ai);
      }
      return;
    }

    // Try restoring from persistence (refresh scenario)
    if (gameId) {
      const saved = loadGame(gameId);
      if (saved) {
        restoreGame(saved.gameState, saved.rngState, saved.persisted);
        const ai = createAIController({
          getState: () => useGameStore.getState(),
          dispatch: (action, player) => useGameStore.getState().dispatch(action, player),
        });
        setController(ai);
        return;
      }
    }

    // Game not found — redirect home
    navigate('/', { replace: true });
  }, [gameId, storeGameId, restoreGame, navigate, locationState]);

  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const player1DeckIds = useGameStore((s) => s.player1DeckIds);
  const player2DeckIds = useGameStore((s) => s.player2DeckIds);
  const turn = useGameStore((s) => s.state?.turn ?? 0);

  const handleGameOver = useCallback(
    (winner: PlayerId) => {
      setGameOverWinner(winner);
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
    },
    [gameId, humanPlayer, player1DeckIds, player2DeckIds, turn, isMultiplayer],
  );

  const handlePlayAgain = useCallback(() => {
    controllerRef.current?.dispose();
    setController(null);
    resetGame();
    navigate('/');
  }, [resetGame, navigate]);

  const handleMainMenu = useCallback(() => {
    controllerRef.current?.dispose();
    setController(null);
    resetGame();
    navigate('/');
  }, [resetGame, navigate]);

  const handleConcede = useCallback(() => {
    useGameStore.getState().dispatch({ type: 'CONCEDE' }, humanPlayer);
  }, [humanPlayer]);

  const handleDisconnectAck = useCallback(() => {
    handleMainMenu();
  }, [handleMainMenu]);

  if (phase === 'game_over') {
    return (
      <GameOverScreen
        winner={gameOverWinner}
        humanPlayer={humanPlayer}
        onPlayAgain={handlePlayAgain}
        onMainMenu={handleMainMenu}
      />
    );
  }

  return (
    <GameDispatchProvider controller={controller}>
      <PlayingScreenInner
        onGameOver={handleGameOver}
        onConcede={handleConcede}
        onMainMenu={handleMainMenu}
        disconnectReason={disconnectReason}
        onDisconnectAck={handleDisconnectAck}
      />
    </GameDispatchProvider>
  );
}

function PlayingScreenInner({
  onGameOver,
  onConcede,
  onMainMenu,
  disconnectReason,
  onDisconnectAck,
}: {
  onGameOver: (winner: PlayerId) => void;
  onConcede: () => void;
  onMainMenu: () => void;
  disconnectReason: string | null;
  onDisconnectAck: () => void;
}) {
  useGameLoop();

  const phase = useGameStore((s) => s.state?.phase);
  const [showMenu, setShowMenu] = useState(false);
  const disconnectPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const disconnectDialogRef = useDialogA11y({
    open: disconnectReason !== null,
    closeOnEscape: false,
    onClose: onDisconnectAck,
    initialFocusRef: disconnectPrimaryRef,
  });

  useEffect(() => {
    if (phase?.type === 'game_over') {
      onGameOver(phase.winner);
    }
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
            'fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:top-[calc(env(safe-area-inset-top)+0.75rem)] lg:bottom-auto z-30 w-11 h-11 p-0 rounded-full flex items-center justify-center text-white/70 hover:text-white',
        })}
        onClick={() => setShowMenu(true)}
        aria-label="Game menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* In-game menu */}
      <AnimatePresence>
        {showMenu && (
          <GameMenu
            onResume={() => setShowMenu(false)}
            onConcede={() => {
              setShowMenu(false);
              onConcede();
            }}
            onMainMenu={() => {
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
