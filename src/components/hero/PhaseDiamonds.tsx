import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePhaseInfo, PHASE_ORDER } from '@hooks/usePhaseInfo';

interface PhaseDiamondsProps {
  side: 'left' | 'right';
}

/** Left side shows pre-play phases (draw, energy), right shows post-play (battle, play2). */
const LEFT_KEYS = ['draw', 'energy'];
const RIGHT_KEYS = ['battle', 'play2'];

const PHASE_LABELS: Record<string, string> = {
  draw: 'Draw',
  energy: 'Energy',
  battle: 'Battle',
  play2: 'Play (post-combat)',
};

export function PhaseDiamonds({ side }: PhaseDiamondsProps) {
  const phaseInfo = usePhaseInfo();
  const shouldReduceMotion = useReducedMotion();

  if (!phaseInfo) return null;

  const keys = side === 'left' ? LEFT_KEYS : RIGHT_KEYS;
  const { displayKey, currentOrder } = phaseInfo;

  return (
    <div className="flex items-center gap-1">
      {keys.map((key) => (
        <PhaseDiamond
          key={key}
          phaseKey={key}
          isActive={key === displayKey}
          isCompleted={PHASE_ORDER[key] < currentOrder}
          shouldReduceMotion={!!shouldReduceMotion}
        />
      ))}
    </div>
  );
}

interface PhaseDiamondProps {
  phaseKey: string;
  isActive: boolean;
  isCompleted: boolean;
  shouldReduceMotion: boolean;
}

function PhaseDiamond({ phaseKey, isActive, isCompleted, shouldReduceMotion }: PhaseDiamondProps) {
  const [hovered, setHovered] = useState(false);
  const label = PHASE_LABELS[phaseKey] ?? phaseKey;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        style={{
          width: 'var(--hero-diamond)',
          height: 'var(--hero-diamond)',
          transform: 'rotate(45deg)',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderRadius: 2,
          borderColor: isActive
            ? 'rgba(251, 191, 36, 0.8)'
            : isCompleted
              ? 'rgba(100, 116, 139, 0.5)'
              : 'rgba(148, 163, 184, 0.25)',
          backgroundColor: isActive
            ? 'rgba(251, 191, 36, 0.6)'
            : isCompleted
              ? 'rgba(100, 116, 139, 0.3)'
              : 'transparent',
          boxShadow: isActive
            ? '0 0 8px rgba(251, 191, 36, 0.5)'
            : 'none',
        }}
        animate={
          !shouldReduceMotion && isActive
            ? {
                boxShadow: [
                  '0 0 6px rgba(251, 191, 36, 0.3)',
                  '0 0 12px rgba(251, 191, 36, 0.7)',
                  '0 0 6px rgba(251, 191, 36, 0.3)',
                ],
                scale: [1, 1.15, 1],
              }
            : {}
        }
        transition={
          !shouldReduceMotion && isActive
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      />
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded-md bg-slate-900/95 border border-white/15 shadow-lg shadow-black/40 whitespace-nowrap pointer-events-none z-50"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span
              className="text-[10px] font-semibold"
              style={{ color: isActive ? '#fbbf24' : isCompleted ? '#94a3b8' : '#cbd5e1' }}
            >
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
