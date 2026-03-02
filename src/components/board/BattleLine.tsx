import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useAnimationControls } from 'framer-motion';
import { useGameStore } from '@game/gameStore';

export function BattleLine() {
  const isBattlePhase = useGameStore((s) => s.state?.phase.type === 'battle');
  const shouldReduceMotion = useReducedMotion();
  const igniteControls = useAnimationControls();
  const [prevBattle, setPrevBattle] = useState(false);
  const [showIgnition, setShowIgnition] = useState(false);

  // Detect battle phase entrance during render (derived state pattern)
  if (isBattlePhase && !prevBattle) {
    setPrevBattle(true);
    setShowIgnition(true);
  }
  if (!isBattlePhase && prevBattle) {
    setPrevBattle(false);
  }

  // Start ignition animation + schedule auto-dismiss
  useEffect(() => {
    if (!showIgnition) return;
    igniteControls.start({
      opacity: [0, 1, 0.6, 0],
      scaleY: [0.5, 3, 1.5, 0],
      transition: { duration: 0.7, ease: 'easeOut' },
    });
    const timer = setTimeout(() => setShowIgnition(false), 700);
    return () => clearTimeout(timer);
  }, [showIgnition, igniteControls]);

  return (
    <div className="relative z-0 pointer-events-none flex items-center justify-center px-8 py-1">
      {/* Main line */}
      <motion.div
        className="w-full"
        style={{
          height: isBattlePhase ? 1.5 : 1,
          background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent)',
        }}
        animate={
          isBattlePhase && !shouldReduceMotion
            ? {
                boxShadow: [
                  '0 0 6px 1px rgba(239, 68, 68, 0.2), 0 0 14px 3px rgba(239, 68, 68, 0.1)',
                  '0 0 12px 3px rgba(239, 68, 68, 0.4), 0 0 24px 6px rgba(239, 68, 68, 0.15)',
                  '0 0 6px 1px rgba(239, 68, 68, 0.2), 0 0 14px 3px rgba(239, 68, 68, 0.1)',
                ],
                background: [
                  'linear-gradient(90deg, transparent 5%, rgba(239, 68, 68, 0.25) 30%, rgba(251, 146, 60, 0.3) 50%, rgba(239, 68, 68, 0.25) 70%, transparent 95%)',
                  'linear-gradient(90deg, transparent 5%, rgba(239, 68, 68, 0.45) 30%, rgba(251, 146, 60, 0.5) 50%, rgba(239, 68, 68, 0.45) 70%, transparent 95%)',
                  'linear-gradient(90deg, transparent 5%, rgba(239, 68, 68, 0.25) 30%, rgba(251, 146, 60, 0.3) 50%, rgba(239, 68, 68, 0.25) 70%, transparent 95%)',
                ],
              }
            : {
                boxShadow: '0 0 3px 1px rgba(148, 163, 184, 0.06)',
              }
        }
        transition={
          isBattlePhase && !shouldReduceMotion
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      />

      {/* Ignition flash — bright horizontal sweep when battle starts */}
      {showIgnition && !shouldReduceMotion && (
        <motion.div
          className="absolute left-0 right-0 mx-8"
          style={{
            height: 2,
            top: '50%',
            marginTop: -1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 200, 60, 0.9) 20%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 200, 60, 0.9) 80%, transparent)',
            filter: 'blur(1px)',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1.1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      {/* Ignition glow — vertical bloom that fades */}
      {showIgnition && !shouldReduceMotion && (
        <motion.div
          className="absolute left-0 right-0 mx-8"
          style={{
            height: 40,
            top: '50%',
            marginTop: -20,
            background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.3) 30%, rgba(251, 146, 60, 0.4) 50%, rgba(239, 68, 68, 0.3) 70%, transparent)',
            filter: 'blur(8px)',
          }}
          animate={igniteControls}
        />
      )}

      {/* Ember particles along the line during battle — CSS animated dots */}
      {isBattlePhase && !shouldReduceMotion && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              background: 'rgba(251, 146, 60, 0.9)',
              boxShadow: '0 0 8px rgba(251, 146, 60, 0.7)',
              top: '50%',
              marginTop: -2,
            }}
            animate={{
              left: ['10%', '90%'],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 0 }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 3,
              height: 3,
              background: 'rgba(239, 68, 68, 0.8)',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
              top: '50%',
              marginTop: -1.5,
            }}
            animate={{
              left: ['85%', '15%'],
              opacity: [0, 0.8, 0.8, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 0.5 }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 3,
              height: 3,
              background: 'rgba(255, 200, 60, 0.85)',
              boxShadow: '0 0 6px rgba(255, 200, 60, 0.6)',
              top: '50%',
              marginTop: -1.5,
            }}
            animate={{
              left: ['20%', '80%'],
              opacity: [0, 0.9, 0.9, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1 }}
          />
        </>
      )}
    </div>
  );
}
