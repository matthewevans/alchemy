import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameMenuProps {
  onResume: () => void;
  onConcede: () => void;
  onMainMenu: () => void;
}

export function GameMenu({ onResume, onConcede, onMainMenu }: GameMenuProps) {
  const [confirmingConcede, setConfirmingConcede] = useState(false);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onResume}
    >
      <motion.div
        className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4 min-w-[240px] shadow-2xl border border-slate-700/50"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-2">Menu</h2>

        {/* Resume */}
        <button
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-bold cursor-pointer hover:from-emerald-400 hover:to-emerald-600 transition-colors"
          onClick={onResume}
        >
          Resume
        </button>

        {/* Concede */}
        <AnimatePresence mode="wait">
          {confirmingConcede ? (
            <motion.div
              key="confirm"
              className="w-full flex flex-col gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-white/70 text-sm text-center">Are you sure?</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-b from-red-500 to-red-700 text-white font-bold cursor-pointer hover:from-red-400 hover:to-red-600 transition-colors"
                  onClick={onConcede}
                >
                  Yes
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-b from-slate-500 to-slate-700 text-white font-bold cursor-pointer hover:from-slate-400 hover:to-slate-600 transition-colors"
                  onClick={() => setConfirmingConcede(false)}
                >
                  No
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="concede"
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-b from-red-500 to-red-700 text-white font-bold cursor-pointer hover:from-red-400 hover:to-red-600 transition-colors"
              onClick={() => setConfirmingConcede(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Concede
            </motion.button>
          )}
        </AnimatePresence>

        {/* Main Menu */}
        <button
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-b from-slate-500 to-slate-700 text-white font-bold cursor-pointer hover:from-slate-400 hover:to-slate-600 transition-colors"
          onClick={onMainMenu}
        >
          Main Menu
        </button>
      </motion.div>
    </motion.div>
  );
}
