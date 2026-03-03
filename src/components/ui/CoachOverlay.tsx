import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorialStore } from '@game/tutorialStore';

export function CoachOverlay() {
  const currentTip = useTutorialStore((s) => s.currentTip);
  const dismissTip = useTutorialStore((s) => s.dismissTip);
  const skipTutorial = useTutorialStore((s) => s.skipTutorial);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!currentTip?.anchorSelector) {
      setAnchorPos(null);
      return;
    }
    const el = document.querySelector(currentTip.anchorSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setAnchorPos({ x: rect.left + rect.width / 2, y: rect.top });
    } else {
      setAnchorPos(null);
    }
  }, [currentTip]);

  return (
    <AnimatePresence>
      {currentTip && (
        <motion.div
          key={currentTip.id}
          className="fixed z-50 pointer-events-auto flex flex-col items-center"
          style={{
            left: anchorPos ? anchorPos.x : '50%',
            top: anchorPos ? Math.max(anchorPos.y - 16, 60) : '30%',
            transform: 'translateX(-50%)',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div
            className="relative max-w-[280px] rounded-2xl px-4 py-3 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.97), rgba(15, 23, 42, 0.97))',
              border: '1.5px solid rgba(251, 191, 36, 0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(251,191,36,0.1)',
            }}
          >
            {/* Wizard avatar */}
            <div className="flex justify-center -mt-8 mb-1">
              <img
                src="/wizard_helper.webp"
                alt="Wizard helper"
                className="w-12 h-12 rounded-full select-none"
                style={{
                  border: '2px solid rgba(251, 191, 36, 0.5)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
                draggable={false}
              />
            </div>

            <p className="text-white text-sm leading-snug mb-3">{currentTip.message}</p>

            <div className="flex items-center justify-center gap-3">
              <button
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors"
                onClick={dismissTip}
              >
                Got it!
              </button>
              <button
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
                onClick={skipTutorial}
              >
                Skip tips
              </button>
            </div>
          </div>

          {/* Speech bubble arrow pointing down */}
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(15, 23, 42, 0.97)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
