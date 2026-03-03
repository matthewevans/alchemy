import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@game/uiStore';

export function ActionFeedbackToast() {
  const feedback = useUIStore((s) => s.feedback);

  return createPortal(
    <AnimatePresence>
      {feedback && (
        <motion.div
          key={`${feedback.x}-${feedback.y}-${feedback.message}`}
          className="fixed z-[9999] pointer-events-none select-none"
          style={{
            left: feedback.x,
            top: feedback.y,
            transform: 'translate(-50%, -100%)',
          }}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: -8, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div
            className="px-3 py-1.5 rounded-xl text-sm font-bold whitespace-nowrap shadow-lg"
            style={{
              background: feedback.tone === 'warning'
                ? 'rgba(239, 68, 68, 0.9)'
                : 'rgba(245, 158, 11, 0.9)',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              border: feedback.tone === 'warning'
                ? '1px solid rgba(252, 165, 165, 0.4)'
                : '1px solid rgba(253, 230, 138, 0.4)',
            }}
          >
            {feedback.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
