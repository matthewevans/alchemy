import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Keyword } from '@engine/types';
import { KEYWORD_REGISTRY } from '@engine/keywords';

interface KeywordBadgeProps {
  keyword: Keyword;
}

export function KeywordBadge({ keyword }: KeywordBadgeProps) {
  const [hovered, setHovered] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const kwDef = KEYWORD_REGISTRY[keyword];

  useLayoutEffect(() => {
    if (hovered && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }, [hovered]);

  return (
    <span
      ref={badgeRef}
      className="relative inline-flex items-center gap-0.5 text-amber-300 font-semibold cursor-help"
      style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setHovered((prev) => !prev); }}
    >
      <span>{kwDef.icon}</span>
      <span className="capitalize">{kwDef.name}{kwDef.value != null ? ` ${kwDef.value}` : ''}</span>

      {createPortal(
        <AnimatePresence>
          {hovered && pos && (
            <motion.div
              className="fixed px-2 py-1 rounded-lg bg-slate-950 border border-slate-300/30 shadow-[0_8px_24px_rgba(0,0,0,0.7)] whitespace-nowrap z-[9999] pointer-events-none"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -100%) translateY(-4px)',
                fontSize: '11px',
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-amber-300 font-bold capitalize">{kwDef.name}</span>
              <span className="text-white"> — {kwDef.description}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
