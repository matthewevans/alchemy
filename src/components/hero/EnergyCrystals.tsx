import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';

/** Default mana-blue for opponent pips. */
const DEFAULT_PIP_COLOR = '#3b82f6';

/** Convert hex color to rgba with given alpha. Falls back to color as-is for non-hex. */
function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return hex;
  return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${alpha})`;
}

interface EnergyCrystalsProps {
  playerId: PlayerId;
  /** Hex or rgb color for filled pips. Defaults to mana-blue. */
  color?: string;
}

/** Energy pips — horizontal row of circular orbs beside the portrait. */
export function EnergyCrystals({ playerId, color = DEFAULT_PIP_COLOR }: EnergyCrystalsProps) {
  const maxEnergy = useGameStore((s) => s.state?.players[playerId]?.maxEnergy);
  const currentEnergy = useGameStore((s) => s.state?.players[playerId]?.currentEnergy);
  const energyCap = useGameStore((s) => s.state?.ruleset.energyCap ?? 10);
  const energyGlowControls = useAnimationControls();
  const prevMaxEnergyRef = useRef(maxEnergy);
  const prevCurrentEnergyRef = useRef(currentEnergy);

  const filled = color;
  const glow = hexToRgba(color, 0.6);

  useEffect(() => {
    if (maxEnergy === undefined || currentEnergy === undefined) return;
    const prevMax = prevMaxEnergyRef.current;
    const prevCurrent = prevCurrentEnergyRef.current;

    if (prevMax !== undefined && (maxEnergy > prevMax || (prevCurrent !== undefined && currentEnergy > prevCurrent))) {
      energyGlowControls.start({
        boxShadow: [
          `0 0 12px ${glow}`,
          `0 0 6px ${glow}`,
          '0 0 0px rgba(0, 0, 0, 0)',
        ],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
    }

    prevMaxEnergyRef.current = maxEnergy;
    prevCurrentEnergyRef.current = currentEnergy;
  }, [maxEnergy, currentEnergy, energyGlowControls, glow]);

  if (maxEnergy === undefined || currentEnergy === undefined) return null;

  return (
    <motion.div
      className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${color}33`,
      }}
      aria-label="Energy"
      animate={energyGlowControls}
    >
      <span className="text-[0.6rem] leading-none select-none" style={{ filter: 'saturate(0.7)' }}>⚡</span>
      <AnimatePresence>
        {Array.from({ length: Math.min(maxEnergy, energyCap) }, (_, i) => {
          const isFilled = i < currentEnergy;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: isFilled ? [1.3, 1] : 1,
                opacity: 1,
                backgroundColor: isFilled ? filled : 'rgba(80, 80, 80, 0.35)',
                borderColor: isFilled ? filled : 'rgba(120, 120, 120, 0.3)',
                boxShadow: isFilled
                  ? `0 0 5px ${glow}, inset 0 1px 1px rgba(255,255,255,0.2)`
                  : 'inset 0 1px 2px rgba(0,0,0,0.4)',
              }}
              style={{
                width: 'var(--hero-pip)',
                height: 'var(--hero-pip)',
                borderWidth: 1.5,
                borderStyle: 'solid',
                borderRadius: '50%',
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
