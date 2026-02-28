import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { gameButtonClass } from './buttonStyles';

interface TitleScreenProps {
  onPlay: () => void;
  onMultiplayer: () => void;
  onDeckBuilder: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function useSparkles(count: number): Particle[] {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    })),
  );
  return particles;
}

function SinglePlayerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M10 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.59 0-6.5 2.69-6.5 6a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1c0-3.31-2.91-6-6.5-6Z" />
    </svg>
  );
}

function MultiPlayerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M6.5 8A2.75 2.75 0 1 0 6.5 2.5 2.75 2.75 0 0 0 6.5 8Zm7 0a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM2 15.5A5.5 5.5 0 0 1 7.5 10h1a5.5 5.5 0 0 1 5.5 5.5 1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Zm13.25 1H16a2 2 0 0 0 2-2c0-2.28-1.81-4.17-4.08-4.48a6.92 6.92 0 0 1 2.33 4.98c0 .53-.13 1.04-.35 1.5Z" />
    </svg>
  );
}

export function TitleScreen({ onPlay, onMultiplayer, onDeckBuilder }: TitleScreenProps) {
  const particles = useSparkles(30);
  const [mounted, setMounted] = useState(false);
  const logoWordmarkSrc = `${import.meta.env.BASE_URL}logo_wordmark.webp`;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 overflow-hidden relative">
      {/* Sparkle particles */}
      {mounted &&
        particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-amber-300/60"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              y: [0, -20, -40],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* Logo */}
      <motion.img
        src={logoWordmarkSrc}
        alt="Alchemy"
        className="w-80 max-w-[80vw] mb-8 drop-shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Buttons */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
      >
        <motion.button
          className={gameButtonClass({
            tone: 'emerald',
            size: 'lg',
            className: 'w-64 text-2xl font-bold flex items-center justify-center gap-2',
          })}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          onClick={onPlay}
        >
          <SinglePlayerIcon />
          <span>Play</span>
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'amber',
            size: 'lg',
            className: 'w-64 text-xl font-bold flex items-center justify-center gap-2',
          })}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onMultiplayer}
        >
          <MultiPlayerIcon />
          <span>Multiplayer</span>
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'sm',
            className: 'px-8 py-2.5 rounded-xl text-sm font-medium',
          })}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onDeckBuilder}
        >
          Deck Builder
        </motion.button>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        className="mt-6 text-white/50 text-sm tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        A card game for wizards-in-training
      </motion.p>
    </div>
  );
}
