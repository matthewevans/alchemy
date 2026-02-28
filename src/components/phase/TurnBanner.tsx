import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@game/uiStore';

export function TurnBanner() {
  const showTurnBanner = useUIStore((s) => s.showTurnBanner);
  const turnBannerText = useUIStore((s) => s.turnBannerText);

  const isYourTurn = turnBannerText.toUpperCase().includes('YOUR');

  return (
    <AnimatePresence>
      {showTurnBanner && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
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
            initial={{ y: -60, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 0, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            {turnBannerText}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
