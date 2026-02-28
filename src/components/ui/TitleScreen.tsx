import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
          className="px-12 py-4 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white text-2xl font-bold shadow-lg shadow-emerald-500/40 cursor-pointer"
          whileHover={{ scale: 1.06, boxShadow: '0 0 30px rgba(52, 211, 153, 0.5)' }}
          whileTap={{ scale: 0.96 }}
          onClick={onPlay}
        >
          Play
        </motion.button>
        <motion.button
          className="px-10 py-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-white text-lg font-bold shadow-lg shadow-amber-500/30 cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(251, 191, 36, 0.4)' }}
          whileTap={{ scale: 0.96 }}
          onClick={onMultiplayer}
        >
          Multiplayer
        </motion.button>
        <motion.button
          className="px-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white cursor-pointer"
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
