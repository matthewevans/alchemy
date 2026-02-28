import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Keyword } from '@engine/types';
import { KEYWORD_REGISTRY } from '@engine/keywords';

interface KeywordBadgeProps {
  keyword: Keyword;
}

export function KeywordBadge({ keyword }: KeywordBadgeProps) {
  const [hovered, setHovered] = useState(false);
  const kwDef = KEYWORD_REGISTRY[keyword];

  return (
    <span
      className="relative inline-flex items-center gap-0.5 text-amber-300 font-semibold cursor-help"
      style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setHovered((prev) => !prev); }}
    >
      <span>{kwDef.icon}</span>
      <span className="capitalize">{kwDef.name}</span>

      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute bottom-full left-1/2 mb-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-600/50 shadow-xl whitespace-nowrap z-50 pointer-events-none"
            style={{
              transform: 'translateX(-50%)',
              fontSize: '11px',
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-amber-300 font-bold capitalize">{kwDef.name}</span>
            <span className="text-white/70"> — {kwDef.description}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
