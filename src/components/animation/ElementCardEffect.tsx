import { motion } from 'framer-motion';
import type { Element } from '@engine/types';
import type { ElementPosition } from '@game/animationStore';

interface ElementCardEffectProps {
  element: Element;
  position: ElementPosition;
}

/**
 * On-card element overlay that appears when a card takes elemental damage.
 * Fire-and-forget: fades in, pulses, then removed by parent timeout.
 *
 * Architecture: positioned fixed overlay with per-element visual style.
 * Designed for easy swap to animated WebP/APNG in the future —
 * just replace the inner JSX in ELEMENT_OVERLAYS with an <img> tag.
 */
export function ElementCardEffect({ element, position }: ElementCardEffectProps) {
  const pad = 4;
  const config = ELEMENT_OVERLAY_CONFIG[element];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: position.x - pad,
        top: position.y - pad,
        width: position.width + pad * 2,
        height: position.height + pad * 2,
        pointerEvents: 'none',
        zIndex: 45,
        borderRadius: 8,
        overflow: 'hidden',
        border: `2px solid ${config.borderColor}`,
        boxShadow: config.outerGlow,
      }}
    >
      {/* Base gradient layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 6,
          background: config.background,
        }}
      />
      {/* Pulsing glow layer */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: config.pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 6,
          boxShadow: config.innerGlow,
        }}
      />
    </motion.div>
  );
}

// ─── Per-Element Visual Config ───

interface OverlayConfig {
  background: string;
  innerGlow: string;
  outerGlow: string;
  borderColor: string;
  pulseDuration: number;
}

const ELEMENT_OVERLAY_CONFIG: Record<Element, OverlayConfig> = {
  fire: {
    background: 'radial-gradient(ellipse at bottom, rgba(255,100,0,0.5) 0%, rgba(255,60,0,0.3) 40%, transparent 70%)',
    innerGlow: 'inset 0 0 30px 10px rgba(255,120,0,0.35), inset 0 -15px 20px -5px rgba(255,80,0,0.4)',
    outerGlow: '0 0 20px 6px rgba(255,80,0,0.4)',
    borderColor: 'rgba(255,100,0,0.8)',
    pulseDuration: 0.6,
  },
  water: {
    background: `
      radial-gradient(ellipse at top left, rgba(150,220,255,0.45) 0%, transparent 40%),
      radial-gradient(ellipse at top right, rgba(100,200,255,0.35) 0%, transparent 35%),
      radial-gradient(ellipse at bottom left, rgba(120,210,255,0.3) 0%, transparent 30%),
      radial-gradient(ellipse at bottom right, rgba(140,215,255,0.4) 0%, transparent 38%)
    `,
    innerGlow: 'inset 0 0 25px 8px rgba(150,220,255,0.4)',
    outerGlow: '0 0 18px 5px rgba(100,180,255,0.35)',
    borderColor: 'rgba(100,180,255,0.8)',
    pulseDuration: 1.0,
  },
  earth: {
    background: `
      radial-gradient(ellipse at bottom, rgba(40,140,40,0.4) 0%, transparent 50%),
      radial-gradient(ellipse at top, rgba(60,160,40,0.2) 0%, transparent 40%)
    `,
    innerGlow: 'inset 0 -12px 20px -5px rgba(40,130,40,0.45), inset 0 0 15px 5px rgba(60,160,50,0.2)',
    outerGlow: '0 0 15px 4px rgba(50,140,50,0.3)',
    borderColor: 'rgba(60,160,60,0.8)',
    pulseDuration: 1.2,
  },
  air: {
    background: 'radial-gradient(ellipse at center, rgba(200,235,255,0.3) 0%, rgba(180,220,255,0.15) 40%, transparent 70%)',
    innerGlow: 'inset 0 0 20px 6px rgba(200,240,255,0.3)',
    outerGlow: '0 0 18px 5px rgba(180,220,255,0.3)',
    borderColor: 'rgba(180,220,255,0.8)',
    pulseDuration: 0.8,
  },
  shadow: {
    background: 'radial-gradient(ellipse at center, transparent 20%, rgba(60,0,100,0.4) 60%, rgba(30,0,50,0.55) 100%)',
    innerGlow: 'inset 0 0 30px 10px rgba(80,0,130,0.4)',
    outerGlow: '0 0 20px 6px rgba(80,0,140,0.35)',
    borderColor: 'rgba(100,0,160,0.8)',
    pulseDuration: 0.7,
  },
};
