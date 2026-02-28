import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { EFFECT_REGISTRY } from '@engine/effects';
import {
  getElementColor,
  getElementArtGradient,
  getElementIconPath,
  getElementFrameGradient,
} from '@components/card/cardUtils';

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
      <div className="flex gap-4 mb-8">
        <AnimatePresence>
          {hand.map((cardInstance, index) => {
            const card = CARD_REGISTRY[cardInstance.cardId];
            const isSelected = selectedIndices.has(index);
            const elementColor = getElementColor(card.element);
            const artGradient = getElementArtGradient(card.element);
            const elementIconPath = getElementIconPath(card.element);
            const frameGradient = getElementFrameGradient(card.element);
            const effect = card.effectId ? EFFECT_REGISTRY[card.effectId] : null;
            const isCreature = card.type === 'creature';

            return (
              <motion.button
                key={cardInstance.instanceId}
                className={`
                  relative flex flex-col cursor-pointer select-none
                  ${isSelected ? 'brightness-50' : ''}
                `}
                style={{
                  width: 'var(--card-width)',
                  height: 'var(--card-height)',
                  fontSize: 'calc(var(--card-font-scale) * 1rem)',
                }}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleCard(index)}
              >
                {/* Card frame */}
                <div
                  className="absolute inset-0 rounded-xl z-[1]"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(180deg, #ef4444 0%, #991b1b 100%)'
                      : frameGradient,
                    opacity: 0.7,
                  }}
                />

                {/* Card inner body */}
                <div className="relative z-[2] flex flex-col m-[2px] rounded-[10px] overflow-hidden h-full bg-slate-900">
                  {/* Name bar */}
                  <div
                    className="flex items-center gap-1 px-1.5 py-[2px]"
                    style={{
                      background: `linear-gradient(90deg, ${elementColor}33, ${elementColor}11)`,
                      borderBottom: `1px solid ${elementColor}44`,
                    }}
                  >
                    <div
                      className="shrink-0 flex items-center gap-[2px] rounded-md px-[3px] text-white font-black"
                      style={{
                        height: 'calc(var(--card-font-scale) * 1.25rem)',
                        fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
                        background: `linear-gradient(135deg, ${elementColor}, ${elementColor}cc)`,
                      }}
                    >
                      <span>{card.cost}</span>
                      <img
                        src={elementIconPath}
                        alt={card.element}
                        className="select-none"
                        style={{
                          width: 'calc(var(--card-font-scale) * 0.75rem)',
                          height: 'calc(var(--card-font-scale) * 0.75rem)',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <span
                      className="flex-1 text-white font-bold truncate"
                      style={{ fontSize: 'calc(var(--card-font-scale) * 0.6rem)' }}
                    >
                      {card.name}
                    </span>
                    <span
                      className="shrink-0 opacity-70"
                      style={{ fontSize: 'calc(var(--card-font-scale) * 0.65rem)' }}
                    >
                      {isCreature ? '⚔️' : '✨'}
                    </span>
                  </div>

                  {/* Art area */}
                  <div
                    className="relative mx-1 mt-1 rounded-md overflow-hidden flex items-center justify-center"
                    style={{
                      height: 'calc(var(--card-height) * 0.36)',
                      background: artGradient,
                    }}
                  >
                    {/* Art placeholder */}
                    <div className="w-full h-full" />
                    <div
                      className="absolute inset-0 rounded-md pointer-events-none"
                      style={{ border: `1px solid ${elementColor}55` }}
                    />
                  </div>

                  {/* Text box */}
                  <div
                    className="flex-1 mx-1 mt-1 mb-1 px-1.5 py-1 rounded-md overflow-hidden"
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                    }}
                  >
                    {card.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-0.5">
                        {card.keywords.map((kw) => {
                          const kwDef = KEYWORD_REGISTRY[kw];
                          return (
                            <span
                              key={kw}
                              className="inline-flex items-center gap-0.5 text-amber-300 font-semibold"
                              style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
                            >
                              <span>{kwDef.icon}</span>
                              <span className="capitalize">{kwDef.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {effect && (
                      <p
                        className="text-white/80 leading-tight"
                        style={{ fontSize: 'calc(var(--card-font-scale) * 0.45rem)' }}
                      >
                        {effect.description}
                      </p>
                    )}
                  </div>

                  {/* Stats (creatures) */}
                  {isCreature && (
                    <div className="flex justify-between items-center px-1 pb-1">
                      <div
                        className="flex items-center justify-center rounded-md text-white font-black"
                        style={{
                          minWidth: 'calc(var(--card-font-scale) * 1.4rem)',
                          height: 'calc(var(--card-font-scale) * 1.2rem)',
                          fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
                          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                          padding: '0 3px',
                        }}
                      >
                        {card.attack}
                      </div>
                      <div
                        className="flex items-center justify-center rounded-md text-white font-black"
                        style={{
                          minWidth: 'calc(var(--card-font-scale) * 1.4rem)',
                          height: 'calc(var(--card-font-scale) * 1.2rem)',
                          fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
                          background: 'linear-gradient(135deg, #16a34a, #14532d)',
                          padding: '0 3px',
                        }}
                      >
                        {card.health}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mulligan X overlay */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 z-[3] flex items-center justify-center rounded-xl bg-red-900/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-red-400 text-4xl font-black drop-shadow-lg">X</span>
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
