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
        zIndex: 9999,
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
    background: 'radial-gradient(ellipse at bottom, rgba(255,80,0,0.8) 0%, rgba(255,50,0,0.5) 40%, rgba(255,100,0,0.15) 70%)',
    innerGlow: 'inset 0 0 30px 12px rgba(255,120,0,0.6), inset 0 -20px 25px -5px rgba(255,60,0,0.7)',
    outerGlow: '0 0 25px 10px rgba(255,80,0,0.6)',
    borderColor: 'rgba(255,120,0,0.9)',
    pulseDuration: 0.6,
  },
  water: {
    background: `
      radial-gradient(ellipse at top left, rgba(100,200,255,0.7) 0%, transparent 45%),
      radial-gradient(ellipse at top right, rgba(60,180,255,0.6) 0%, transparent 40%),
      radial-gradient(ellipse at bottom left, rgba(80,190,255,0.5) 0%, transparent 35%),
      radial-gradient(ellipse at bottom right, rgba(100,210,255,0.65) 0%, transparent 42%)
    `,
    innerGlow: 'inset 0 0 30px 12px rgba(120,200,255,0.6)',
    outerGlow: '0 0 22px 8px rgba(80,160,255,0.5)',
    borderColor: 'rgba(80,180,255,0.9)',
    pulseDuration: 1.0,
  },
  earth: {
    background: `
      radial-gradient(ellipse at bottom, rgba(30,140,30,0.7) 0%, rgba(40,120,40,0.3) 50%, transparent 70%),
      radial-gradient(ellipse at top, rgba(50,160,40,0.4) 0%, transparent 45%)
    `,
    innerGlow: 'inset 0 -15px 25px -5px rgba(30,130,30,0.7), inset 0 0 20px 8px rgba(50,160,50,0.4)',
    outerGlow: '0 0 20px 8px rgba(40,140,40,0.5)',
    borderColor: 'rgba(50,170,50,0.9)',
    pulseDuration: 1.2,
  },
  air: {
    background: 'radial-gradient(ellipse at center, rgba(200,235,255,0.55) 0%, rgba(180,220,255,0.3) 40%, rgba(200,240,255,0.1) 70%)',
    innerGlow: 'inset 0 0 25px 10px rgba(200,240,255,0.5)',
    outerGlow: '0 0 22px 8px rgba(180,220,255,0.5)',
    borderColor: 'rgba(180,230,255,0.9)',
    pulseDuration: 0.8,
  },
  shadow: {
    background: 'radial-gradient(ellipse at center, rgba(40,0,60,0.3) 10%, rgba(60,0,100,0.65) 50%, rgba(30,0,50,0.8) 100%)',
    innerGlow: 'inset 0 0 35px 14px rgba(80,0,140,0.6)',
    outerGlow: '0 0 25px 10px rgba(80,0,140,0.5)',
    borderColor: 'rgba(120,0,180,0.9)',
    pulseDuration: 0.7,
  },
};
