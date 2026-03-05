import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLearningProfileStore } from '@game/learningProfileStore';
import { usePreferencesStore } from '@game/preferencesStore';

const ADAPTIVE_TOAST_MS = 6500;

export function AdaptiveLearningToast() {
  const decision = useLearningProfileStore((s) => s.lastDecision);
  const clearLastDecision = useLearningProfileStore((s) => s.clearLastDecision);
  const adaptiveLearningEnabled = usePreferencesStore((s) => s.adaptiveLearningEnabled);
  const adaptiveExplanationEnabled = usePreferencesStore((s) => s.adaptiveExplanationEnabled);

  useEffect(() => {
    if (!decision) return undefined;
    const timer = window.setTimeout(() => {
      clearLastDecision();
    }, ADAPTIVE_TOAST_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [decision, clearLastDecision]);

  if (!adaptiveLearningEnabled || !adaptiveExplanationEnabled || !decision) {
    return null;
  }

  const heading = decision.reason === 'mastery_increase'
    ? 'Level Increased'
    : decision.reason === 'support_needed'
      ? 'Level Adjusted For Support'
      : 'Level Updated';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[55] w-[min(32rem,calc(100vw-1rem))] -translate-x-1/2 rounded-xl border border-cyan-300/35 bg-slate-900/95 px-3 py-2 shadow-2xl"
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-cyan-100 text-xs font-semibold uppercase tracking-[0.08em]">
              Adaptive Learning
            </p>
            <p className="text-white text-sm font-bold mt-0.5">
              {heading}: {decision.domain === 'reading' ? 'Reading' : 'Math'} {decision.previousLevel.toUpperCase()} {'->'} {decision.nextLevel.toUpperCase()}
            </p>
            <p className="text-white/70 text-xs mt-1">
              {decision.evidence}
            </p>
          </div>
          <button
            className="text-white/45 hover:text-white/80 text-xs"
            onClick={clearLastDecision}
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
