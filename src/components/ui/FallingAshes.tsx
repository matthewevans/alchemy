import { useState } from 'react';
import { motion } from 'framer-motion';

const ASH_COLORS = [
  'rgba(251, 191, 36, 0.4)',   // amber
  'rgba(251, 146, 60, 0.3)',   // orange
  'rgba(220, 180, 120, 0.25)', // warm tan
  'rgba(180, 160, 140, 0.2)',  // grey ash
];

interface Ash {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  drift: number;
  rotation: number;
}

function useAshParticles(count: number): Ash[] {
  const [ashes] = useState<Ash[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 4,
      color: ASH_COLORS[i % ASH_COLORS.length],
      drift: (Math.random() - 0.5) * 40,
      rotation: Math.random() * 360,
    })),
  );
  return ashes;
}

interface FallingAshesProps {
  count?: number;
}

export function FallingAshes({ count = 20 }: FallingAshesProps) {
  const ashes = useAshParticles(count);

  return (
    <>
      {ashes.map((a) => (
        <motion.div
          key={a.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${a.x}%`,
            top: -8,
            width: a.size,
            height: a.size,
            backgroundColor: a.color,
            boxShadow: `0 0 ${a.size * 2}px ${a.color}`,
          }}
          animate={{
            y: ['0vh', '105vh'],
            x: [0, a.drift, -a.drift * 0.5, a.drift * 0.3],
            opacity: [0, 0.8, 0.6, 0],
            rotate: [0, a.rotation],
          }}
          transition={{
            duration: a.duration,
            delay: a.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </>
  );
}
