import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useUIStore } from '@game/uiStore';

export function TurnBanner() {
  const showTurnBanner = useUIStore((s) => s.showTurnBanner);
  const turnBannerText = useUIStore((s) => s.turnBannerText);
  const shouldReduceMotion = useReducedMotion();

  const isYourTurn = turnBannerText.toUpperCase().includes('YOUR');

  return (
    <AnimatePresence>
      {showTurnBanner && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Banner text */}
          <motion.span
            className={`
              relative text-5xl font-extrabold tracking-wider select-none
              ${isYourTurn
                ? 'text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]'
                : 'text-slate-300 drop-shadow-[0_0_24px_rgba(148,163,184,0.5)]'
              }
            `}
            initial={shouldReduceMotion ? { opacity: 0 } : { y: -60, opacity: 0, scale: 0.8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: 0, opacity: 0, scale: 0.95 }}
            transition={{
              type: shouldReduceMotion ? 'tween' : 'spring',
              stiffness: shouldReduceMotion ? undefined : 300,
              damping: shouldReduceMotion ? undefined : 20,
              duration: shouldReduceMotion ? 0.2 : undefined,
            }}
          >
            {turnBannerText}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
