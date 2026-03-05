import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Phase } from '@engine/types';
import { gameButtonClass } from './buttonStyles';
import { usePreferencesStore } from '@game/preferencesStore';
import { useTutorialStore } from '@game/tutorialStore';
import {
  TIP_MENU_LABELS,
  TIP_MENU_ORDER,
} from '../../tutorial/domain/stepRegistry';
import { resolveContextualTipId } from '../../tutorial/domain/tipPolicy';

interface TutorialHelpPanelProps {
  phase: Phase | undefined;
}

export function TutorialHelpPanel({ phase }: TutorialHelpPanelProps) {
  const showTip = useTutorialStore((s) => s.showTip);
  const combatMathEnabled = usePreferencesStore((s) => s.combatMathEnabled);
  const [showPanel, setShowPanel] = useState(false);

  const contextualTipId = phase
    ? resolveContextualTipId({
      phaseType: phase.type,
      phaseStep: phase.type === 'battle' ? phase.step : undefined,
      combatMathEnabled,
      isHumanTurn: true,
    })
    : null;

  return (
    <div className="fixed left-2 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[46] flex flex-col items-start gap-2">
      <button
        className={gameButtonClass({
          tone: 'indigo',
          size: 'sm',
          className: 'h-11 w-11 p-0 rounded-full text-lg font-black',
        })}
        onClick={() => setShowPanel((value) => !value)}
        aria-label="Open help tips"
        title="Open help tips"
      >
        ?
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-indigo-300/35 bg-slate-900/92 p-3 shadow-xl shadow-black/40 backdrop-blur-sm"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <p className="text-indigo-100 text-sm font-semibold">Tip Guide</p>
              <button
                className="text-white/45 hover:text-white/80 text-xs"
                onClick={() => setShowPanel(false)}
              >
                Close
              </button>
            </div>

            {contextualTipId && (
              <button
                className={gameButtonClass({
                  tone: 'blue',
                  size: 'sm',
                  className: 'mt-2 w-full text-left text-xs px-3 py-2 font-semibold',
                })}
                onClick={() => {
                  showTip(contextualTipId, 'manual');
                  setShowPanel(false);
                }}
              >
                Show Tip For This Phase: {TIP_MENU_LABELS[contextualTipId]}
              </button>
            )}

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {TIP_MENU_ORDER.map((tipId) => (
                <button
                  key={tipId}
                  className={gameButtonClass({
                    tone: 'neutral',
                    size: 'xs',
                    className: 'text-[11px] text-left px-2.5 py-2',
                  })}
                  onClick={() => {
                    showTip(tipId, 'manual');
                    setShowPanel(false);
                  }}
                >
                  {TIP_MENU_LABELS[tipId]}
                </button>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-white/50">
              Auto tips appear once per topic. Use this panel any time for a refresher.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
