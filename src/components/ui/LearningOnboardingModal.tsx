import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { gameButtonClass } from './buttonStyles';
import {
  LEARNING_AGE_RANGE_OPTIONS,
  getLearningOnboardingPreset,
  type LearningAgeRange,
} from '../../learning/onboarding';

interface LearningOnboardingModalProps {
  open: boolean;
  onComplete: (enabled: boolean, ageRange: LearningAgeRange) => void;
}

function formatFrequencyLabel(frequency: 'low' | 'medium' | 'high'): string {
  if (frequency === 'low') return 'Low';
  if (frequency === 'medium') return 'Medium';
  return 'High';
}

export function LearningOnboardingModal({
  open,
  onComplete,
}: LearningOnboardingModalProps) {
  const [enabled, setEnabled] = useState(true);
  const [ageRange, setAgeRange] = useState<LearningAgeRange>('age_6_7');
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useDialogA11y({
    open,
    closeOnEscape: false,
    initialFocusRef: continueRef,
  });
  const preset = useMemo(() => getLearningOnboardingPreset(ageRange), [ageRange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Learning setup"
            tabIndex={-1}
            className="w-full max-w-xl rounded-2xl border border-amber-300/45 bg-slate-900/95 p-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-amber-100 text-[11px] font-semibold tracking-[0.08em] uppercase">
              First-Time Setup
            </p>
            <h2 className="text-white text-2xl font-bold mt-1">
              Learning Challenge Setup
            </h2>
            <p className="text-white/70 text-sm mt-2">
              Want reading and math challenges during battles? You can change this anytime in Settings.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className={gameButtonClass({
                  tone: enabled ? 'emerald' : 'slate',
                  size: 'sm',
                  className: 'w-full font-semibold',
                })}
                onClick={() => setEnabled(true)}
              >
                Yes, turn on
              </button>
              <button
                className={gameButtonClass({
                  tone: enabled ? 'slate' : 'blue',
                  size: 'sm',
                  className: 'w-full font-semibold',
                })}
                onClick={() => setEnabled(false)}
              >
                Not now
              </button>
            </div>

            {enabled && (
              <>
                <div className="mt-4">
                  <label
                    htmlFor="learning-age-range"
                    className="text-sm text-white/80 block mb-1"
                  >
                    Age range
                  </label>
                  <select
                    id="learning-age-range"
                    value={ageRange}
                    onChange={(event) => setAgeRange(event.target.value as LearningAgeRange)}
                    className="w-full h-9 rounded-lg bg-slate-700/60 text-white/95 text-sm px-2 border border-slate-500/30 cursor-pointer appearance-none"
                  >
                    {LEARNING_AGE_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-tight text-white/50 mt-1">
                    {LEARNING_AGE_RANGE_OPTIONS.find((option) => option.value === ageRange)?.description}
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-emerald-300/35 bg-emerald-900/20 p-3">
                  <p className="text-emerald-100/90 text-xs font-semibold uppercase tracking-[0.08em]">
                    Recommended Starting Levels
                  </p>
                  <p className="text-white text-sm mt-1">
                    Reading <span className="font-semibold">{preset.readingLevel.toUpperCase()}</span> · Math{' '}
                    <span className="font-semibold">{preset.mathLevel.toUpperCase()}</span> · Frequency{' '}
                    <span className="font-semibold">{formatFrequencyLabel(preset.learningFrequency)}</span>
                  </p>
                </div>
              </>
            )}

            <div className="mt-4 flex justify-end">
              <button
                ref={continueRef}
                className={gameButtonClass({
                  tone: enabled ? 'emerald' : 'blue',
                  size: 'md',
                  className: 'font-semibold min-w-[11rem]',
                })}
                onClick={() => onComplete(enabled, ageRange)}
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

