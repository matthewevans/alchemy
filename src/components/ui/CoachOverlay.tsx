import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorialStore } from '@game/tutorialStore';
import { narrateText } from '@audio/tts';
import wizardImg from '/wizard_helper.webp?url';

const VIEWPORT_PAD = 12;

function clampToViewport(
  tooltip: HTMLElement,
  anchorSelector?: string,
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;

  const anchor = anchorSelector ? document.querySelector(anchorSelector) : null;

  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    const anchorCX = rect.left + rect.width / 2;

    // Try above the anchor; fall below if no room
    let top = rect.top - th - 8;
    if (top < VIEWPORT_PAD) {
      top = rect.bottom + 8;
    }

    let left = anchorCX - tw / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tw - VIEWPORT_PAD));
    top = Math.max(VIEWPORT_PAD, Math.min(top, vh - th - VIEWPORT_PAD));

    return { left, top };
  }

  // No anchor — center in viewport
  return {
    left: Math.max(VIEWPORT_PAD, (vw - tw) / 2),
    top: Math.max(VIEWPORT_PAD, vh * 0.25),
  };
}

export function CoachOverlay() {
  const currentTip = useTutorialStore((s) => s.currentTip);
  const dismissTip = useTutorialStore((s) => s.dismissTip);
  const skipTutorial = useTutorialStore((s) => s.skipTutorial);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Callback ref — fires when the tooltip element mounts/unmounts
  const tooltipRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !currentTip) return;
      // Wait one frame so the browser has laid out the element
      requestAnimationFrame(() => {
        setPos(clampToViewport(node, currentTip.anchorSelector));
      });
    },
    [currentTip],
  );

  // Reset position when tip changes so the new tip doesn't flash at the old spot
  useEffect(() => {
    if (!currentTip) setPos(null);
  }, [currentTip]);

  return (
    <AnimatePresence>
      {currentTip && (
        <motion.div
          ref={tooltipRef}
          key={currentTip.id}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: pos?.left ?? '50%',
            top: pos?.top ?? '30%',
            transform: pos ? undefined : 'translateX(-50%)',
            visibility: pos ? 'visible' : 'hidden',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: pos ? 1 : 0, y: 0, scale: 1 }}
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
                src={wizardImg}
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
              <button
                className="text-white/40 hover:text-amber-300 transition-colors"
                onClick={() => narrateText(currentTip.message)}
                aria-label="Read tip aloud"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
