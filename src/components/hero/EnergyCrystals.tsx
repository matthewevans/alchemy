import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';

interface EnergyCrystalsProps {
  playerId: PlayerId;
}

/** Energy pips — horizontal row, MTGA mana-pip style. */
export function EnergyCrystals({ playerId }: EnergyCrystalsProps) {
  const maxEnergy = useGameStore((s) => s.state?.players[playerId]?.maxEnergy);
  const currentEnergy = useGameStore((s) => s.state?.players[playerId]?.currentEnergy);
  const energyCap = useGameStore((s) => s.state?.ruleset.energyCap ?? 10);
  const energyGlowControls = useAnimationControls();
  const prevMaxEnergyRef = useRef(maxEnergy);
  const prevCurrentEnergyRef = useRef(currentEnergy);

  useEffect(() => {
    if (maxEnergy === undefined || currentEnergy === undefined) return;
    const prevMax = prevMaxEnergyRef.current;
    const prevCurrent = prevCurrentEnergyRef.current;

    if (prevMax !== undefined && (maxEnergy > prevMax || (prevCurrent !== undefined && currentEnergy > prevCurrent))) {
      energyGlowControls.start({
        boxShadow: [
          '0 0 12px rgba(251, 191, 36, 0.6)',
          '0 0 6px rgba(251, 191, 36, 0.2)',
          '0 0 0px rgba(251, 191, 36, 0)',
        ],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
    }

    prevMaxEnergyRef.current = maxEnergy;
    prevCurrentEnergyRef.current = currentEnergy;
  }, [maxEnergy, currentEnergy, energyGlowControls]);

  if (maxEnergy === undefined || currentEnergy === undefined) return null;

  return (
    <motion.div
      className="flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{
        background: 'rgba(120, 53, 15, 0.2)',
        border: '1px solid rgba(251, 191, 36, 0.15)',
      }}
      aria-label="Energy"
      animate={energyGlowControls}
    >
      <AnimatePresence>
        {Array.from({ length: Math.min(maxEnergy, energyCap) }, (_, i) => {
          const isFilled = i < currentEnergy;
          return (
            <motion.div
              key={i}
              className="w-3.5 h-3.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: isFilled ? [1.3, 1] : 1,
                opacity: 1,
                backgroundColor: isFilled ? 'rgb(217, 160, 22)' : 'rgba(80, 45, 10, 0.45)',
                borderColor: isFilled ? 'rgb(234, 179, 40)' : 'rgba(140, 70, 8, 0.35)',
                boxShadow: isFilled
                  ? '0 0 5px rgba(234, 179, 40, 0.6), inset 0 1px 1px rgba(255,255,255,0.2)'
                  : 'inset 0 1px 2px rgba(0,0,0,0.4)',
              }}
              style={{
                borderWidth: 1.5,
                borderStyle: 'solid',
                borderRadius: 2,
                transform: 'rotate(45deg)',
              }}
              transition={{
                scale: { duration: 0.25, ease: 'easeOut' },
                opacity: { duration: 0.15 },
                backgroundColor: { duration: 0.2 },
                borderColor: { duration: 0.2 },
                boxShadow: { duration: 0.2 },
              }}
              layout
            />
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
