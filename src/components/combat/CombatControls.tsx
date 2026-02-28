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
        className="flex flex-col items-center gap-2 py-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
      >
        {phase.step === 'declare_attackers' && isAttacker && (
          <>
            <p className="text-amber-300 font-bold text-sm">Select creatures to attack</p>
            <div className="flex gap-3">
              <motion.button
                className="px-5 py-2 rounded-xl bg-gradient-to-b from-red-500 to-orange-600 text-white font-bold text-lg shadow-lg shadow-red-500/30 active:scale-95"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer)}
              >
                Attack!
              </motion.button>
              <motion.button
                className="px-4 py-2 rounded-xl bg-slate-700 text-white/70 font-medium text-sm hover:bg-slate-600"
                whileTap={{ scale: 0.95 }}
                onClick={() => dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer)}
              >
                Skip
              </motion.button>
            </div>
          </>
        )}

        {phase.step === 'declare_blockers' && isDefender && (
          <>
            <p className="text-blue-300 font-bold text-sm">Assign blockers to defend!</p>
            <p className="text-white/50 text-xs">Tap your creature, then tap an attacker to block it</p>
            <motion.button
              className="px-5 py-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/30 active:scale-95"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'CONFIRM_BLOCKERS' }, humanPlayer)}
            >
              Done
            </motion.button>
          </>
        )}

        {phase.step === 'resolving' && (
          <motion.p
            className="text-orange-300 font-bold text-sm"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Resolving combat...
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
