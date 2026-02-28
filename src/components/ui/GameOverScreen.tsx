import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PlayerId } from '@engine/types';
import { gameButtonClass } from './buttonStyles';

interface GameOverScreenProps {
  winner: PlayerId;
  humanPlayer: PlayerId;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];

function useConfetti(count: number): ConfettiPiece[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: Math.random() * 1.5 + 1.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 6 + 4,
      })),
    [count],
  );
}

export function GameOverScreen({ winner, humanPlayer, onPlayAgain, onMainMenu }: GameOverScreenProps) {
  const isVictory = winner === humanPlayer;
  const confetti = useConfetti(isVictory ? 40 : 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Confetti for victory */}
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute rounded-sm"
          style={{
            left: `${piece.x}%`,
            top: -10,
            width: piece.size,
            height: piece.size * 1.5,
            backgroundColor: piece.color,
          }}
          animate={{
            y: [0, window.innerHeight + 20],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeIn',
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />
      ))}

      {/* Main content */}
      <motion.h1
        className={`text-6xl font-black mb-8 ${
          isVictory
            ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]'
            : 'text-slate-400 drop-shadow-[0_0_10px_rgba(100,116,139,0.3)]'
        }`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        {isVictory ? 'Victory!' : 'Defeat'}
      </motion.h1>

      {/* Buttons */}
      <motion.div
        className="flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <motion.button
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
