import { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PlayerId } from '@engine/types';
import { gameButtonClass } from './buttonStyles';
import { useDialogA11y } from '@hooks/useDialogA11y';

interface GameOverScreenProps {
  winner: PlayerId;
  humanPlayer: PlayerId;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

interface FallingPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
}

const VICTORY_COLORS = ['#fbbf24', '#f59e0b', '#fde68a', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#ffffff'];
const DEFEAT_COLORS = ['#475569', '#64748b', '#334155', '#ef4444', '#991b1b', '#1e293b'];

function useFallingPieces(count: number, colors: string[]): FallingPiece[] {
  // useState lazy initializer is explicitly allowed to be impure (runs once)
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: Math.random() * 2 + 2,
      color: colors[i % colors.length],
      size: Math.random() * 6 + 3,
      drift: (Math.random() - 0.5) * 80,
    })),
  );
  return pieces;
}

export function GameOverScreen({ winner, humanPlayer, onPlayAgain, onMainMenu }: GameOverScreenProps) {
  const isVictory = winner === humanPlayer;
  const shouldReduceMotion = useReducedMotion();
  const pieces = useFallingPieces(
    shouldReduceMotion ? 0 : isVictory ? 50 : 25,
    isVictory ? VICTORY_COLORS : DEFEAT_COLORS,
  );
  const playAgainRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useDialogA11y({
    open: true,
    closeOnEscape: false,
    initialFocusRef: playAgainRef,
  });

  const titleColor = isVictory ? '#fbbf24' : '#94a3b8';
  const glowColor = isVictory ? 'rgba(251, 191, 36, 0.4)' : 'rgba(239, 68, 68, 0.2)';

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      data-testid={isVictory ? 'victory-screen' : 'defeat-screen'}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={{ background: isVictory ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Radial glow burst behind title */}
      {!shouldReduceMotion && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 500,
            height: 300,
            top: '50%',
            left: '50%',
            marginTop: -200,
            marginLeft: -250,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${glowColor}, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: isVictory ? [0, 0.8, 0.5, 0.7] : [0, 0.4, 0.2, 0.3],
            scale: [0.5, 1.2, 1],
          }}
          transition={{
            duration: 2,
            ease: 'easeOut',
            opacity: { repeat: Infinity, repeatType: 'mirror', duration: 3 },
          }}
        />
      )}

      {/* Falling pieces — confetti for victory, embers/ash for defeat */}
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute pointer-events-none"
          style={{
            left: `${piece.x}%`,
            top: -10,
            width: piece.size,
            height: isVictory ? piece.size * 1.5 : piece.size,
            backgroundColor: piece.color,
            borderRadius: isVictory ? '1px' : '50%',
            boxShadow: isVictory
              ? `0 0 4px ${piece.color}`
              : piece.color.includes('ef4444') ? `0 0 6px ${piece.color}` : 'none',
          }}
          animate={{
            y: [0, window.innerHeight + 20],
            x: [0, piece.drift],
            rotate: [0, 360 * (piece.id % 2 === 0 ? 1 : -1)],
            opacity: isVictory ? [1, 1, 0.8, 0] : [0.6, 0.4, 0.2, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: isVictory ? 'easeIn' : 'linear',
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
      ))}

      {/* Light rays for victory */}
      {isVictory && !shouldReduceMotion && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '120vw',
            height: 4,
            top: '45%',
            left: '-10vw',
            background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.15), transparent)',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      {/* Title text */}
      <motion.h1
        id="game-over-title"
        className="relative text-6xl font-black mb-2 select-none"
        style={{
          color: titleColor,
          textShadow: isVictory
            ? '0 0 30px rgba(251,191,36,0.6), 0 0 60px rgba(251,191,36,0.3), 0 4px 8px rgba(0,0,0,0.5)'
            : '0 0 20px rgba(100,116,139,0.3), 0 4px 8px rgba(0,0,0,0.5)',
        }}
        initial={{ scale: shouldReduceMotion ? 1 : 2, opacity: 0, y: shouldReduceMotion ? 0 : -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0.3 : 0.6,
          delay: 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {isVictory ? 'Victory!' : 'Defeat'}
      </motion.h1>

      {/* Flavor subtitle */}
      <motion.p
        className="text-sm mb-8 select-none"
        style={{
          color: isVictory ? 'rgba(253, 230, 138, 0.7)' : 'rgba(148, 163, 184, 0.5)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {isVictory ? 'The elements bend to your will.' : 'The elements were not in your favor.'}
      </motion.p>

      {/* Buttons */}
      <motion.div
        className="flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <motion.button
          ref={playAgainRef}
          className={gameButtonClass({
            tone: 'emerald',
            size: 'md',
            className: 'px-8 text-lg font-bold',
          })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
        >
          Play Again
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'slate',
            size: 'md',
            className: 'px-8 text-lg font-bold',
          })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onMainMenu}
        >
          Main Menu
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
