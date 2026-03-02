import { motion, useReducedMotion } from 'framer-motion';
import { usePhaseInfo, PHASE_ORDER } from '@hooks/usePhaseInfo';

interface PhaseDiamondsProps {
  side: 'left' | 'right';
}

/** Left side shows pre-play phases (draw, energy), right shows post-play (battle, play2). */
const LEFT_KEYS = ['draw', 'energy'];
const RIGHT_KEYS = ['battle', 'play2'];

export function PhaseDiamonds({ side }: PhaseDiamondsProps) {
  const phaseInfo = usePhaseInfo();
  const shouldReduceMotion = useReducedMotion();

  if (!phaseInfo) return null;

  const keys = side === 'left' ? LEFT_KEYS : RIGHT_KEYS;
  const { displayKey, currentOrder } = phaseInfo;

  return (
    <div className="flex items-center gap-1">
      {keys.map((key) => {
        const order = PHASE_ORDER[key];
        const isActive = key === displayKey;
        const isCompleted = order < currentOrder;

        return (
          <motion.div
            key={key}
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
            title={key === 'play2' ? 'Play (post-combat)' : key.charAt(0).toUpperCase() + key.slice(1)}
          />
        );
      })}
    </div>
  );
}
