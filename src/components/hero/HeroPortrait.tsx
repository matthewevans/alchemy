import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@game/gameStore';

interface HeroPortraitProps {
  avatarSrc?: string;
  isOpponent: boolean;
  isValidTarget?: boolean;
  onHeroClick?: () => void;
}

export function HeroPortrait({ avatarSrc, isOpponent, isValidTarget = false, onHeroClick }: HeroPortraitProps) {
  const isBattlePhase = useGameStore((s) => s.state?.phase.type === 'battle');
  const shouldReduceMotion = useReducedMotion();

  const showBattlePulse = isBattlePhase && !shouldReduceMotion;
  const accentRgb = isOpponent ? '239, 68, 68' : '96, 165, 250';

  const portrait = (
    <div className="relative">
      {/* Outer ring glow */}
      <motion.div
        className="absolute -inset-1.5 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(${accentRgb}, 0.15) 0%, transparent 70%)`,
          border: `2px solid rgba(${accentRgb}, 0.3)`,
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
                  '0 0 10px rgba(251, 191, 36, 0.3)',
                  '0 0 24px rgba(251, 191, 36, 0.7)',
                  '0 0 10px rgba(251, 191, 36, 0.3)',
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
        className={`relative w-16 h-16 rounded-full overflow-hidden border-2 ${
          isOpponent
            ? 'border-red-700/50 shadow-lg shadow-red-950/40'
            : 'border-blue-700/50 shadow-lg shadow-blue-950/40'
        }`}
        animate={isValidTarget ? { scale: [1.02, 1.08, 1.02] } : { scale: 1 }}
        transition={
          isValidTarget
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-2xl ${
            isOpponent
              ? 'bg-gradient-to-br from-red-900 to-red-950'
              : 'bg-gradient-to-br from-blue-900 to-blue-950'
          }`}>
            <span className="text-white/80">{isOpponent ? '👹' : '🧙'}</span>
          </div>
        )}
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
