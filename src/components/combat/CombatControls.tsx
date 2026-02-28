import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';

export function CombatControls() {
  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const dispatch = useGameStore((s) => s.dispatch);

  if (!phase || phase.type !== 'battle' || !activePlayer) return null;

  const isAttacker = humanPlayer === activePlayer;
  const isDefender = humanPlayer === getOpponent(activePlayer);

  return (
    <AnimatePresence>
      <motion.div
        className="flex items-center justify-center gap-3 py-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {phase.step === 'declare_attackers' && isAttacker && (
          <>
            <motion.button
              className="px-5 py-1.5 rounded-lg bg-gradient-to-b from-red-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-red-500/30 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer)}
            >
              Attack!
            </motion.button>
            <motion.button
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white/60 font-medium text-xs cursor-pointer hover:bg-slate-600"
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer)}
            >
              Skip
            </motion.button>
          </>
        )}

        {phase.step === 'declare_blockers' && isDefender && (
          <>
            <span className="text-blue-300 font-medium text-xs">Assign blockers</span>
            <motion.button
              className="px-5 py-1.5 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'CONFIRM_BLOCKERS' }, humanPlayer)}
            >
              Done
            </motion.button>
          </>
        )}

        {phase.step === 'resolving' && (
          <motion.span
            className="text-orange-300 font-bold text-xs"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Resolving combat...
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
