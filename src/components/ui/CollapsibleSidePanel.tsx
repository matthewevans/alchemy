import { useState } from 'react';
import { motion } from 'framer-motion';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;

function loadCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

interface CollapsibleSidePanelProps {
  /** localStorage key for persisting collapsed state. */
  storageKey: string;
  /** Element accent color for the chevron glow. */
  accentColor: string;
  /** How far (px) to shift right when collapsed — should exceed content width. */
  collapseOffset: number;
  children: React.ReactNode;
}

/**
 * Side-anchored panel with a collapse/expand chevron tab.
 * Positioned at the right edge of the game surface (left of sidebar),
 * vertically centered. Collapse preference persists via localStorage.
 */
export function CollapsibleSidePanel({
  storageKey,
  accentColor,
  collapseOffset,
  children,
}: CollapsibleSidePanelProps) {
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(storageKey));

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
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
      animate={{ opacity: 1, x: collapsed ? collapseOffset : 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={SPRING}
    >
      {/* Collapse/expand chevron tab */}
      <button
        type="button"
        className="relative z-10 flex items-center justify-center w-6 h-14 -mr-1 rounded-l-lg bg-slate-900/90 border border-r-0 border-white/10 cursor-pointer"
        style={{ boxShadow: `0 0 8px ${accentColor}33` }}
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

      {children}
    </motion.div>
  );
}
