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
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Subtle ambient glow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(251, 191, 36, 0.08), transparent 70%)',
          filter: 'blur(40px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6] }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      <motion.h2
        id="mulligan-title"
        className="text-2xl font-bold text-white mb-2"
        style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Opening Hand
      </motion.h2>
      <motion.p
        className="text-white/50 text-sm mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Select cards to put back, or keep your hand
      </motion.p>

      {/* Cards — dealt in from below with stagger */}
      <div className="flex gap-4 mb-8">
        <AnimatePresence>
          {hand.map((cardInstance, index) => {
            const isSelected = selectedIndices.has(index);
            const centerOffset = index - (hand.length - 1) / 2;
            const fanAngle = centerOffset * 2;

            return (
              <motion.div
                key={cardInstance.instanceId}
                className="relative"
                style={{ filter: isSelected ? 'brightness(0.5)' : 'none' }}
                initial={{ opacity: 0, y: 80, scale: 0.6, rotate: fanAngle * 3 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  rotate: fanAngle,
                  x: isSelected ? [0, -4, 4, -2, 2, 0] : 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                  x: isSelected ? { duration: 0.3, ease: 'easeInOut' } : undefined,
                }}
              >
                <HandCard
                  cardInstance={cardInstance}
                  isPlayable={!isSelected}
                  isSelected={false}
                  onClick={() => toggleCard(index)}
                  onHover={() => {}}
                />

                {/* Mulligan X overlay — red glow + X */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 z-[3] flex items-center justify-center rounded-xl pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(127, 29, 29, 0.5), rgba(127, 29, 29, 0.2) 70%)',
                      boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.3)',
                    }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <motion.span
                      className="text-red-400 text-4xl font-black"
                      style={{ textShadow: '0 0 12px rgba(239, 68, 68, 0.6)' }}
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      X
                    </motion.span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Buttons — staggered entrance */}
      <motion.div
        className="flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 + hand.length * 0.1 + 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
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
      </motion.div>
    </motion.div>
  );
}
