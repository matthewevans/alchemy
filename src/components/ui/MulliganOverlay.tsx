import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { HandCard } from '@components/card';
import { gameButtonClass } from './buttonStyles';
import { useDialogA11y } from '@hooks/useDialogA11y';

export function MulliganOverlay() {
  const state = useGameStore((s) => s.state);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const dispatch = useGameDispatch();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const keepButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useDialogA11y({
    open: true,
    closeOnEscape: false,
    initialFocusRef: keepButtonRef,
  });

  const toggleCard = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleKeep = useCallback(() => {
    dispatch({ type: 'KEEP_HAND' }, humanPlayer);
    setSelectedIndices(new Set());
  }, [dispatch, humanPlayer]);

  const handleMulligan = useCallback(() => {
    const indices = Array.from(selectedIndices).sort((a, b) => a - b);
    dispatch({ type: 'MULLIGAN_CARDS', cardIndices: indices }, humanPlayer);
    setSelectedIndices(new Set());
  }, [dispatch, humanPlayer, selectedIndices]);

  if (!state) return null;
  if (state.phase.type !== 'mulligan' || state.phase.player !== humanPlayer) return null;

  const hand = state.players[humanPlayer].hand;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mulligan-title"
      tabIndex={-1}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h2
        id="mulligan-title"
        className="text-2xl font-bold text-white mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Opening Hand
      </motion.h2>
      <p className="text-white/50 text-sm mb-6">
        Select cards to put back, or keep your hand
      </p>

      {/* Cards */}
      <div className="flex gap-4 mb-8">
        <AnimatePresence>
          {hand.map((cardInstance, index) => {
            const isSelected = selectedIndices.has(index);

            return (
              <motion.div
                key={cardInstance.instanceId}
                className={`relative ${isSelected ? 'brightness-50' : ''}`}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <HandCard
                  cardInstance={cardInstance}
                  isPlayable={!isSelected}
                  isSelected={false}
                  onClick={() => toggleCard(index)}
                  onHover={() => {}}
                />

                {/* Mulligan X overlay */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 z-[3] flex items-center justify-center rounded-xl bg-red-900/40 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-red-400 text-4xl font-black drop-shadow-lg">X</span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <motion.button
          ref={keepButtonRef}
          className={gameButtonClass({
            tone: 'emerald',
            size: 'md',
            className: 'font-bold',
          })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleKeep}
        >
          Keep Hand
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'red',
            size: 'md',
            disabled: selectedIndices.size === 0,
            className: 'font-bold',
          })}
          whileHover={selectedIndices.size > 0 ? { scale: 1.05 } : undefined}
          whileTap={selectedIndices.size > 0 ? { scale: 0.95 } : undefined}
          onClick={handleMulligan}
          disabled={selectedIndices.size === 0}
        >
          Mulligan Selected ({selectedIndices.size})
        </motion.button>
      </div>
    </motion.div>
  );
}
