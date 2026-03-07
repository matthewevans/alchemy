import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Element } from '@engine/types';
import type { ElementPosition } from '@game/animationStore';

interface ElementCardEffectProps {
  element: Element;
  /** permanentId to track — overlay follows the card and self-removes when card leaves DOM. */
  permanentId?: string;
  /** Static fallback position (used for spell impacts without a permanentId). */
  position: ElementPosition;
  /** Called when the tracked card leaves the DOM, so parent can clean up. */
  onRemove?: () => void;
}

/**
 * On-card element overlay that appears when a card takes elemental damage.
 * When given a permanentId, it tracks the card's DOM element each frame,
 * matching its position, size, and rotation. Self-removes when the card disappears.
 */
export function ElementCardEffect({ element, permanentId, position, onRemove }: ElementCardEffectProps) {
  const pad = 4;
  const config = ELEMENT_OVERLAY_CONFIG[element];
  const overlayPath = ELEMENT_OVERLAY_ASSETS[element];
  const rafRef = useRef(0);
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;
  const [tracked, setTracked] = useState<TrackedPosition | null>(null);

  // Track the card DOM element each frame
  useEffect(() => {
    if (!permanentId) return;

    function tick() {
      const el = document.querySelector(`[data-testid="board-card-${permanentId}"]`) as HTMLElement | null;
      if (!el) {
        onRemoveRef.current?.();
        return;
      }
      // Use untransformed dimensions (offsetWidth/Height) to avoid AABB inflation
      const trueWidth = el.offsetWidth;
      const trueHeight = el.offsetHeight;
      // getBoundingClientRect center IS the visual center even when transformed
      const rect = el.getBoundingClientRect();
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const transform = getComputedStyle(el).transform;
      const { rotation, scale } = parseTransformMatrix(transform);
      const scaledWidth = trueWidth * scale;
      const scaledHeight = trueHeight * scale;

      setTracked({
        x: cx - scaledWidth / 2,
        y: cy - scaledHeight / 2,
        width: scaledWidth,
        height: scaledHeight,
        rotation,
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [permanentId]);

  // Use tracked position if available, otherwise static position
  const pos = tracked ?? { ...position, rotation: 0 };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: pos.x - pad,
        top: pos.y - pad,
        width: pos.width + pad * 2,
        height: pos.height + pad * 2,
        pointerEvents: 'none',
        zIndex: 9999,
        borderRadius: 8,
        overflow: 'hidden',
        border: `2px solid ${config.borderColor}`,
        boxShadow: config.outerGlow,
        transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    >
      {/* Animated WebP overlay layer */}
      <img
        src={overlayPath}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: config.overlayOpacity,
          mixBlendMode: 'screen',
        }}
      />
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

// ─── Helpers ───

interface TrackedPosition extends ElementPosition {
  rotation: number;
}

interface TransformInfo {
  rotation: number;
  scale: number;
}

function parseTransformMatrix(transform: string): TransformInfo {
  if (!transform || transform === 'none') return { rotation: 0, scale: 1 };
  // matrix(a, b, c, d, tx, ty) — rotation = atan2(b, a), scale = sqrt(a² + b²)
  const match = transform.match(/^matrix\((.+)\)$/);
  if (!match) return { rotation: 0, scale: 1 };
  const [a, b] = match[1].split(',').map(Number);
  const rotation = Math.round(Math.atan2(b, a) * (180 / Math.PI) * 100) / 100;
  const scale = Math.round(Math.sqrt(a * a + b * b) * 1000) / 1000;
  return { rotation, scale };
}

// ─── Per-Element Animated Overlay Assets ───

const BASE_URL = import.meta.env.BASE_URL;

const ELEMENT_OVERLAY_ASSETS: Record<Element, string> = {
  fire: `${BASE_URL}vfx/overlays/fire.webp`,
  water: `${BASE_URL}vfx/overlays/water.webp`,
  earth: `${BASE_URL}vfx/overlays/earth.webp`,
  air: `${BASE_URL}vfx/overlays/air.webp`,
  shadow: `${BASE_URL}vfx/overlays/shadow.webp`,
};

// ─── Per-Element Visual Config ───

interface OverlayConfig {
  background: string;
  innerGlow: string;
  outerGlow: string;
  borderColor: string;
  pulseDuration: number;
  overlayOpacity: number;
}

const ELEMENT_OVERLAY_CONFIG: Record<Element, OverlayConfig> = {
  fire: {
    background: 'radial-gradient(ellipse at bottom, rgba(255,80,0,0.8) 0%, rgba(255,50,0,0.5) 40%, rgba(255,100,0,0.15) 70%)',
    innerGlow: 'inset 0 0 30px 12px rgba(255,120,0,0.6), inset 0 -20px 25px -5px rgba(255,60,0,0.7)',
    outerGlow: '0 0 25px 10px rgba(255,80,0,0.6)',
    borderColor: 'rgba(255,120,0,0.9)',
    pulseDuration: 0.6,
    overlayOpacity: 0.85,
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
    overlayOpacity: 0.85,
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
    overlayOpacity: 0.85,
  },
  air: {
    background: 'radial-gradient(ellipse at center, rgba(200,235,255,0.55) 0%, rgba(180,220,255,0.3) 40%, rgba(200,240,255,0.1) 70%)',
    innerGlow: 'inset 0 0 25px 10px rgba(200,240,255,0.5)',
    outerGlow: '0 0 22px 8px rgba(180,220,255,0.5)',
    borderColor: 'rgba(180,230,255,0.9)',
    pulseDuration: 0.8,
    overlayOpacity: 0.55,
  },
  shadow: {
    background: 'radial-gradient(ellipse at center, rgba(40,0,60,0.3) 10%, rgba(60,0,100,0.65) 50%, rgba(30,0,50,0.8) 100%)',
    innerGlow: 'inset 0 0 35px 14px rgba(80,0,140,0.6)',
    outerGlow: '0 0 25px 10px rgba(80,0,140,0.5)',
    borderColor: 'rgba(120,0,180,0.9)',
    pulseDuration: 0.7,
    overlayOpacity: 0.85,
  },
};
