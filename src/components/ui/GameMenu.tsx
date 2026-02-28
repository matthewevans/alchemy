import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameButtonClass } from './buttonStyles';
import { useDialogA11y } from '@hooks/useDialogA11y';

interface GameMenuProps {
  onResume: () => void;
  onConcede: () => void;
  onMainMenu: () => void;
}

export function GameMenu({ onResume, onConcede, onMainMenu }: GameMenuProps) {
  const [confirmingConcede, setConfirmingConcede] = useState(false);
  const dialogRef = useDialogA11y({ open: true, onClose: onResume });

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
        tabIndex={-1}
        className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4 min-w-[240px] shadow-2xl border border-slate-700/50"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="game-menu-title" className="text-xl font-bold text-white mb-2">Menu</h2>

        {/* Resume */}
        <button
          className={gameButtonClass({
            tone: 'emerald',
            size: 'md',
            className: 'w-full font-bold',
          })}
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
                  className={gameButtonClass({
                    tone: 'red',
                    size: 'sm',
                    className: 'flex-1 px-4 py-2 rounded-xl font-bold',
                  })}
                  onClick={onConcede}
                >
                  Yes
                </button>
                <button
                  className={gameButtonClass({
                    tone: 'slate',
                    size: 'sm',
                    className: 'flex-1 px-4 py-2 rounded-xl font-bold',
                  })}
                  onClick={() => setConfirmingConcede(false)}
                >
                  No
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="concede"
              className={gameButtonClass({
                tone: 'red',
                size: 'md',
                className: 'w-full font-bold',
              })}
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
          className={gameButtonClass({
            tone: 'slate',
            size: 'md',
            className: 'w-full font-bold',
          })}
          onClick={onMainMenu}
        >
          Main Menu
        </button>
      </motion.div>
    </motion.div>
  );
}
