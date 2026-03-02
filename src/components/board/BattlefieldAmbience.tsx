import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ParticleConfig } from './battlefields';

// ── Particle state ──────────────────────────────────────────────────

interface Particle {
  id: number;
  /** Position along the axis perpendicular to travel (0–100%) */
  crossPosition: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  drift: number;
  rotation: number;
}

function useParticles(config: ParticleConfig, count: number): Particle[] {
  const [particles] = useState<Particle[]>(() => {
    const [minSize, maxSize] = config.sizeRange;
    const [minDur, maxDur] = config.durationRange;

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      crossPosition: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      duration: Math.random() * (maxDur - minDur) + minDur,
      delay: Math.random() * 5,
      color: config.colors[i % config.colors.length],
      drift: (Math.random() - 0.5) * config.driftRange,
      rotation: (Math.random() - 0.5) * 360,
    }));
  });
  return particles;
}

// ── Component ───────────────────────────────────────────────────────

interface BattlefieldAmbienceProps {
  config: ParticleConfig;
  count?: number;
}

export function BattlefieldAmbience({ config, count = 25 }: BattlefieldAmbienceProps) {
  const particles = useParticles(config, count);
  const isHorizontal = config.origin === 'left';

  return (
    <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            // Place along the cross-axis; start just off-screen on the travel axis
            [isHorizontal ? 'top' : 'left']: `${p.crossPosition}%`,
            [isHorizontal ? 'left' : 'top']: -8,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          animate={config.keyframes(p.drift, p.rotation)}
          transition={{
            ease: config.ease,
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}
