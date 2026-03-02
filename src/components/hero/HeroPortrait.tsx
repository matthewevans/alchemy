import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@game/gameStore';

interface HeroPortraitProps {
  isOpponent: boolean;
  isValidTarget?: boolean;
  onHeroClick?: () => void;
}

export function HeroPortrait({ isOpponent, isValidTarget = false, onHeroClick }: HeroPortraitProps) {
  const isBattlePhase = useGameStore((s) => s.state?.phase.type === 'battle');
  const shouldReduceMotion = useReducedMotion();

  const showBattlePulse = isBattlePhase && !shouldReduceMotion;
  const accentRgb = isOpponent ? '239, 68, 68' : '96, 165, 250';

  const portrait = (
    <div className="relative">
      {/* Outer ring glow */}
      <motion.div
        className="absolute -inset-1 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(${accentRgb}, 0.15) 0%, transparent 70%)`,
          border: `1.5px solid rgba(${accentRgb}, 0.25)`,
        }}
        animate={
          isValidTarget
            ? {
                borderColor: [
                  'rgba(251, 191, 36, 0.4)',
                  'rgba(251, 191, 36, 0.9)',
                  'rgba(251, 191, 36, 0.4)',
                ],
                boxShadow: [
                  '0 0 8px rgba(251, 191, 36, 0.3)',
                  '0 0 20px rgba(251, 191, 36, 0.7)',
                  '0 0 8px rgba(251, 191, 36, 0.3)',
                ],
                scale: [1, 1.08, 1],
              }
            : showBattlePulse
              ? {
                  borderColor: [
                    `rgba(${accentRgb}, 0.2)`,
                    `rgba(${accentRgb}, 0.5)`,
                    `rgba(${accentRgb}, 0.2)`,
                  ],
                }
              : {}
        }
        transition={
          isValidTarget || showBattlePulse
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      />
      {/* Inner portrait */}
      <motion.div
        className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl ${
          isOpponent
            ? 'bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-700/40'
            : 'bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-700/40'
        }`}
        animate={isValidTarget ? { scale: [1.02, 1.08, 1.02] } : { scale: 1 }}
        transition={
          isValidTarget
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      >
        <span className="text-white/80">{isOpponent ? '👹' : '🧙'}</span>
      </motion.div>
    </div>
  );

  if (onHeroClick) {
    return (
      <button
        type="button"
        className="appearance-none border-0 bg-transparent p-0 m-0"
        onClick={onHeroClick}
        aria-label={`Target ${isOpponent ? 'opponent' : 'your'} hero`}
      >
        {portrait}
      </button>
    );
  }

  return portrait;
}
