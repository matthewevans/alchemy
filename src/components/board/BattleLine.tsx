import { motion } from 'framer-motion';
import { useGameStore } from '@game/gameStore';

export function BattleLine() {
  const isBattlePhase = useGameStore((s) => s.state?.phase.type === 'battle');

  return (
    <div className="relative flex items-center justify-center px-8 py-1">
      <motion.div
        className="w-full h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.4), transparent)',
        }}
        animate={
          isBattlePhase
            ? {
                boxShadow: [
                  '0 0 8px 2px rgba(239, 68, 68, 0.3)',
                  '0 0 16px 4px rgba(239, 68, 68, 0.6)',
                  '0 0 8px 2px rgba(239, 68, 68, 0.3)',
                ],
                background: [
                  'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.4), transparent)',
                  'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.7), transparent)',
                  'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.4), transparent)',
                ],
              }
            : {
                boxShadow: '0 0 4px 1px rgba(148, 163, 184, 0.1)',
              }
        }
        transition={
          isBattlePhase
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      />
    </div>
  );
}
