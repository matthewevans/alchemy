import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferencesStore } from '@game/preferencesStore';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { useAudioStore } from '@audio/audioStore';
import { gameButtonClass } from './buttonStyles';
import { useDialogA11y } from '@hooks/useDialogA11y';

interface GameMenuProps {
  onResume: () => void;
  onConcede: () => void;
  onMainMenu?: () => void;
}

export function GameMenu({ onResume, onConcede, onMainMenu }: GameMenuProps) {
  const [confirmingConcede, setConfirmingConcede] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useDialogA11y({ open: true, onClose: onResume });
  const { uiScale, setUIScale, resetUIScale } = usePreferencesStore();
  const { sfxVolume, setSfxVolume, musicVolume, setMusicVolume } = useAudioStore();
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
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
        tabIndex={-1}
        className="bg-slate-800/95 rounded-2xl p-8 flex flex-col items-center gap-4 min-w-[240px] shadow-2xl border border-slate-600/40"
        style={{
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 0, 0, 0.3)',
        }}
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="game-menu-title" className="text-xl font-bold text-white mb-2">Menu</h2>

        {/* UI Scale */}
        <div className="w-full mb-1">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="ui-scale" className="text-sm text-white/70">
              UI Scale: {Math.round(uiScale * 100)}%
            </label>
            {uiScale !== 1 && (
              <button
                className="text-xs text-amber-300/80 hover:text-amber-200 cursor-pointer"
                onClick={resetUIScale}
              >
                Reset
              </button>
            )}
          </div>
          <input
            id="ui-scale"
            type="range"
            min={0.6}
            max={1.4}
            step={0.05}
            value={uiScale}
            onChange={(e) => setUIScale(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-600/60"
            style={{ accentColor: '#fbbf24' }}
          />
        </div>

        {/* SFX Volume */}
        <div className="w-full mb-1">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="sfx-volume" className="text-sm text-white/70">
              SFX: {Math.round(sfxVolume * 100)}%
            </label>
          </div>
          <input
            id="sfx-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sfxVolume}
            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-600/60"
            style={{ accentColor: '#f97316' }}
          />
        </div>

        {/* Music Volume */}
        <div className="w-full mb-1">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="music-volume" className="text-sm text-white/70">
              Music: {Math.round(musicVolume * 100)}%
            </label>
          </div>
          <input
            id="music-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={musicVolume}
            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-600/60"
            style={{ accentColor: '#818cf8' }}
          />
        </div>

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
    </motion.div>
  );
}
