import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { CARD_REGISTRY } from '@engine/cards';
import { ELEMENT_META } from '@engine/elements';

export function MulliganOverlay() {
  const state = useGameStore((s) => s.state);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const dispatch = useGameStore((s) => s.dispatch);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

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
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h2
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
      <div className="flex gap-3 mb-8">
        <AnimatePresence>
          {hand.map((card, index) => {
            const def = CARD_REGISTRY[card.cardId];
            const isSelected = selectedIndices.has(index);
            const meta = ELEMENT_META[def.element];

            return (
              <motion.button
                key={card.instanceId}
                className={`
                  relative w-24 h-36 rounded-xl border-2 p-2 flex flex-col items-center justify-between
                  text-white cursor-pointer select-none
                  ${isSelected
                    ? 'border-red-500 bg-red-950/60'
                    : 'border-slate-600 bg-slate-800/80 hover:border-amber-400/60'
                  }
                `}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleCard(index)}
              >
                {/* Cost */}
                <div
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {def.cost}
                </div>

                {/* Name */}
                <span className="text-[10px] font-semibold text-center leading-tight mt-3">
                  {def.name}
                </span>

                {/* Stats */}
                {def.type === 'creature' && (
                  <div className="flex justify-between w-full text-[10px] font-bold">
                    <span className="text-amber-300">{def.attack}</span>
                    <span className="text-red-300">{def.health}</span>
                  </div>
                )}
                {def.type === 'spell' && (
                  <span className="text-[9px] text-purple-300 font-medium">Spell</span>
                )}

                {/* Mulligan marker */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-500/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-red-400 text-3xl font-black">X</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <motion.button
          className="px-6 py-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleKeep}
        >
          Keep Hand
        </motion.button>
        <motion.button
          className={`
            px-6 py-3 rounded-xl font-bold shadow-lg cursor-pointer
            ${selectedIndices.size > 0
              ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-red-500/30'
              : 'bg-slate-700 text-white/30 cursor-not-allowed'
            }
          `}
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
