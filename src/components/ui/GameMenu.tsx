import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { gameButtonClass } from './buttonStyles';
import { SettingsPanel } from './settings/SettingsPanel';
import { FallingAshes } from './FallingAshes';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { getAudioDiagnostics } from '@audio/sounds';

interface GameMenuProps {
  onResume: () => void;
  onConcede: () => void;
  onMainMenu?: () => void;
}

export function GameMenu({ onResume, onConcede, onMainMenu }: GameMenuProps) {
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const [confirmingConcede, setConfirmingConcede] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useDialogA11y({ open: true, onClose: view === 'menu' ? onResume : () => setView('menu') });
  const gameState = useGameStore((s) => s.state);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const isAnimating = useAnimationStore((s) => s.isAnimating);
  const animQueueLength = useAnimationStore((s) => s.queue.length);
  const activeStepType = useAnimationStore((s) => s.activeStep?.effects[0]?.type ?? null);

  const handleCopyState = async () => {
    const snapshot = {
      gameState,
      humanPlayer,
      legalActionCount: legalActions.length,
      legalActionTypes: [...new Set(legalActions.map((a) => a.type))],
      animation: { isAnimating, queueLength: animQueueLength, activeStepType },
      timestamp: new Date().toISOString(),
      version: __APP_VERSION__,
    };
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onResume}
    >
      <FallingAshes />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Game menu"
        tabIndex={-1}
        className={`bg-slate-800/95 rounded-2xl p-5 sm:p-8 flex flex-col gap-4 shadow-2xl border border-slate-600/40 ${
          view === 'settings'
            ? 'settings-dialog items-stretch w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] overflow-hidden sm:w-[95vw] sm:h-[88dvh] sm:max-w-[720px] sm:max-h-[88dvh] sm:rounded-2xl sm:border sm:border-slate-600/40 sm:p-8'
            : 'items-center min-w-[360px] max-w-[90vw]'
        }`}
        style={{
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 0, 0, 0.3)',
        }}
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'menu' && (
          <img
            src={`${import.meta.env.BASE_URL}logo_wordmark.webp`}
            alt="Alchemy"
            className="w-40 mb-2 opacity-80"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.2))' }}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {view === 'settings' ? (
            <motion.div
              key="settings"
              className="w-full flex flex-col items-stretch gap-4"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.15 }}
            >
              <h2 className="text-xl font-bold text-white text-center">Settings</h2>
              <SettingsPanel onClose={() => setView('menu')} />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              className="w-full flex flex-col items-center gap-4"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.15 }}
            >
              {/* Resume */}
              <button
                className={gameButtonClass({
                  tone: 'emerald',
                  size: 'md',
                  className: 'w-full font-bold',
                })}
                onClick={onResume}
              >
                Resume
              </button>

              {/* Concede */}
              <AnimatePresence mode="wait">
                {confirmingConcede ? (
                  <motion.div
                    key="confirm"
                    className="w-full flex flex-col gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p className="text-white/70 text-sm text-center">Are you sure?</p>
                    <div className="flex gap-2">
                      <button
                        className={gameButtonClass({
                          tone: 'red',
                          size: 'sm',
                          className: 'flex-1 px-4 py-2 rounded-xl font-bold',
                        })}
                        onClick={onConcede}
                      >
                        Yes
                      </button>
                      <button
                        className={gameButtonClass({
                          tone: 'slate',
                          size: 'sm',
                          className: 'flex-1 px-4 py-2 rounded-xl font-bold',
                        })}
                        onClick={() => setConfirmingConcede(false)}
                      >
                        No
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="concede"
                    className={gameButtonClass({
                      tone: 'red',
                      size: 'md',
                      className: 'w-full font-bold',
                    })}
                    onClick={() => setConfirmingConcede(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Concede
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Settings */}
              <button
                className={gameButtonClass({
                  tone: 'slate',
                  size: 'md',
                  className: 'w-full font-bold',
                })}
                onClick={() => setView('settings')}
              >
                Settings
              </button>

              {/* Main Menu — hidden during multiplayer */}
              {onMainMenu && (
                <button
                  className={gameButtonClass({
                    tone: 'slate',
                    size: 'md',
                    className: 'w-full font-bold',
                  })}
                  onClick={onMainMenu}
                >
                  Main Menu
                </button>
              )}

              {/* Debug panel */}
              <button
                type="button"
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-center"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? '▾ Debug' : '▸ Debug'}
              </button>
              <AnimatePresence>
                {showDebug && gameState && (
                  <motion.div
                    className="w-full rounded-lg bg-slate-900/80 border border-slate-600/20 p-3 text-xs text-slate-400 space-y-1 font-mono"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div>Phase: <span className="text-white/80">{gameState.phase.type}{gameState.phase.type === 'battle' ? ` → ${gameState.phase.step}` : ''}</span></div>
                    <div>Turn: <span className="text-white/80">{gameState.turn}</span> Active: <span className="text-white/80">{gameState.activePlayer}</span></div>
                    <div>Tier: <span className="text-white/80">{gameState.ruleset.tier}</span></div>
                    <div>P1: <span className="text-white/80">{gameState.players.player1.health}hp {gameState.players.player1.currentEnergy}/{gameState.players.player1.maxEnergy}e</span> hand={gameState.players.player1.hand.length} deck={gameState.players.player1.deck.length}</div>
                    <div>P2: <span className="text-white/80">{gameState.players.player2.health}hp {gameState.players.player2.currentEnergy}/{gameState.players.player2.maxEnergy}e</span> hand={gameState.players.player2.hand.length} deck={gameState.players.player2.deck.length}</div>
                    <div>Legal: <span className="text-white/80">{legalActions.length}</span> actions</div>
                    <div>Anim: <span className="text-white/80">{isAnimating ? `playing (${animQueueLength} queued${activeStepType ? `, ${activeStepType}` : ''})` : 'idle'}</span></div>
                    <AudioDebugInfo />
                    <button
                      type="button"
                      className={gameButtonClass({
                        tone: 'slate',
                        size: 'sm',
                        className: 'w-full mt-2 text-xs',
                      })}
                      onClick={handleCopyState}
                    >
                      {copied ? '✓ Copied!' : 'Copy Game State'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Version info */}
              <div className="mt-1 text-[10px] text-slate-500 text-center">
                v{__APP_VERSION__} <span className="text-slate-600">{__BUILD_HASH__}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function AudioDebugInfo() {
  const [info, setInfo] = useState<ReturnType<typeof getAudioDiagnostics> | null>(null);
  return (
    <>
      <button
        type="button"
        className="text-amber-400/70 hover:text-amber-300 underline"
        onClick={() => setInfo(getAudioDiagnostics())}
      >
        refresh audio info
      </button>
      {info && (
        <div className="space-y-0.5">
          <div>AudioCtx: <span className="text-white/80">{info.contextState}</span></div>
          <div>Catalog: <span className="text-white/80">{info.catalogStatus}</span></div>
          <div>Samples: <span className="text-white/80">{info.cachedSamples} cached, {info.failedSamples} failed, {info.pendingLoads} loading</span></div>
        </div>
      )}
    </>
  );
}
