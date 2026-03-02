import { useState } from 'react';
import { motion } from 'framer-motion';
import { CARD_REGISTRY } from '@engine/cards';
import { getElementColor } from '@components/card/cardUtils';
import { HandCard } from '@components/card/HandCard';

const COLLAPSED_KEY = 'alchemy:card-reveal-collapsed';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

interface CardRevealProps {
  cardId: string;
}

/**
 * Side-anchored card reveal shown when any card is played.
 * Anchored to the right edge (left of the sidebar) with a collapse/expand chevron.
 * Collapsed preference persists via localStorage.
 */
export function CardReveal({ cardId }: CardRevealProps) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors in private mode.
      }
      return next;
    });
  };

  return (
    <motion.div
      className="fixed top-1/2 -translate-y-1/2 z-[36] flex items-center"
      style={{ right: 'calc(6rem + env(safe-area-inset-right))' }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: collapsed ? 96 : 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {/* Collapse/expand chevron */}
      <button
        type="button"
        className="relative z-10 flex items-center justify-center w-6 h-14 -mr-1 rounded-l-lg bg-slate-900/90 border border-r-0 border-white/10 cursor-pointer"
        style={{ boxShadow: `0 0 8px ${elementColor}33` }}
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Show card' : 'Hide card'}
      >
        <span
          className="text-white/70 text-sm transition-transform duration-200"
          style={{ transform: collapsed ? 'scaleX(-1)' : undefined }}
        >
          ›
        </span>
      </button>

      {/* Card with element glow */}
      <div className="relative pointer-events-none">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${elementColor}20, ${elementColor}08 50%, transparent 70%)`,
            filter: 'blur(14px)',
            transform: 'scale(1.8)',
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative"
          style={{
            '--card-width': '110px',
            '--card-height': '154px',
            '--card-font-scale': '0.7',
            filter: `drop-shadow(0 0 12px ${elementColor}44) drop-shadow(0 4px 10px rgba(0,0,0,0.5))`,
          } as React.CSSProperties}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <HandCard
            cardInstance={{ instanceId: '__reveal__', cardId }}
            isPlayable={false}
            isSelected={false}
            verbose
            onClick={() => {}}
            onHover={() => {}}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
