import { useState } from 'react';
import { motion } from 'framer-motion';
import type { TargetAndTransition, Transition } from 'framer-motion';
import type { Element } from '@engine/types';

// ── Element particle configuration ──────────────────────────────────

interface ElementParticleConfig {
  colors: string[];
  sizeRange: [number, number];
  durationRange: [number, number];
  driftRange: number;
  /** Which axis is "start" — vertical elements start off-screen top/bottom, air starts off-screen left */
  origin: 'top' | 'bottom' | 'left';
  ease: Transition['ease'];
  keyframes: (drift: number, rotation: number) => TargetAndTransition;
}

const CONFIGS: Record<Element, ElementParticleConfig> = {
  // Falling embers with gentle sway
  fire: {
    colors: ['rgba(251,191,36,0.5)', 'rgba(251,146,60,0.4)', 'rgba(239,68,68,0.35)', 'rgba(220,180,120,0.25)'],
    sizeRange: [1, 3.5],
    durationRange: [4, 8],
    driftRange: 40,
    origin: 'top',
    ease: 'linear',
    keyframes: (drift, rotation) => ({
      y: ['-5vh', '105vh'],
      x: [0, drift, -drift * 0.5, drift * 0.3],
      opacity: [0, 0.7, 0.5, 0],
      rotate: [0, rotation],
    }),
  },

  // Rain falling with slight wind drift
  water: {
    colors: ['rgba(147,197,253,0.6)', 'rgba(96,165,250,0.55)', 'rgba(186,210,255,0.5)', 'rgba(200,220,255,0.45)'],
    sizeRange: [1, 2.5],
    durationRange: [1.5, 3],
    driftRange: 15,
    origin: 'top',
    ease: 'linear',
    keyframes: (drift) => ({
      y: ['-5vh', '105vh'],
      x: [0, drift],
      opacity: [0, 0.7, 0.6, 0],
    }),
  },

  // Drifting leaves with wide sway
  earth: {
    colors: ['rgba(34,197,94,0.4)', 'rgba(74,222,128,0.35)', 'rgba(163,230,53,0.3)', 'rgba(101,163,13,0.25)'],
    sizeRange: [2, 5],
    durationRange: [6, 12],
    driftRange: 70,
    origin: 'top',
    ease: 'easeInOut',
    keyframes: (drift, rotation) => ({
      y: ['-5vh', '105vh'],
      x: [0, drift, -drift * 0.7, drift * 0.5, -drift * 0.3],
      opacity: [0, 0.6, 0.5, 0.4, 0],
      rotate: [0, rotation, rotation * 1.5, rotation * 2],
    }),
  },

  // Horizontal wisps blown by wind
  air: {
    colors: ['rgba(254,243,199,0.35)', 'rgba(234,179,8,0.25)', 'rgba(251,191,36,0.2)', 'rgba(255,255,255,0.15)'],
    sizeRange: [1, 3],
    durationRange: [6, 12],
    driftRange: 30,
    origin: 'left',
    ease: 'linear',
    keyframes: (drift) => ({
      x: ['-10vw', '110vw'],
      y: [0, drift, -drift * 0.5, drift * 0.3],
      opacity: [0, 0.5, 0.4, 0],
    }),
  },

  // Slowly rising dark motes
  shadow: {
    colors: ['rgba(168,85,247,0.35)', 'rgba(192,132,252,0.3)', 'rgba(139,92,246,0.25)', 'rgba(107,33,168,0.2)'],
    sizeRange: [1, 3.5],
    durationRange: [6, 10],
    driftRange: 30,
    origin: 'bottom',
    ease: 'easeInOut',
    keyframes: (drift) => ({
      y: ['105vh', '-5vh'],
      x: [0, drift, -drift * 0.6, drift * 0.4],
      opacity: [0, 0.5, 0.4, 0.2, 0],
      scale: [0.5, 1.2, 0.8, 1],
    }),
  },
};

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

function useParticles(element: Element, count: number): Particle[] {
  const [particles] = useState<Particle[]>(() => {
    const cfg = CONFIGS[element];
    const [minSize, maxSize] = cfg.sizeRange;
    const [minDur, maxDur] = cfg.durationRange;

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      crossPosition: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      duration: Math.random() * (maxDur - minDur) + minDur,
      delay: Math.random() * 5,
      color: cfg.colors[i % cfg.colors.length],
      drift: (Math.random() - 0.5) * cfg.driftRange,
      rotation: (Math.random() - 0.5) * 360,
    }));
  });
  return particles;
}

// ── Component ───────────────────────────────────────────────────────

interface BattlefieldAmbienceProps {
  element: Element;
  count?: number;
}

export function BattlefieldAmbience({ element, count = 25 }: BattlefieldAmbienceProps) {
  const particles = useParticles(element, count);
  const cfg = CONFIGS[element];
  const isHorizontal = cfg.origin === 'left';

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
          animate={cfg.keyframes(p.drift, p.rotation)}
          transition={{
            ease: cfg.ease,
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}
