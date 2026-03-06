import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { AudioMuteButton } from './AudioMuteButton';
import { gameButtonClass } from './buttonStyles';
import { SettingsPanel } from './settings/SettingsPanel';

interface ScreenChromeProps {
  onBack?: () => void;
  backLabel?: string;
}

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7">
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  );
}

export function ScreenChrome({ onBack, backLabel = 'Back' }: ScreenChromeProps) {
  const [showSettings, setShowSettings] = useState(false);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  const settingsDialogRef = useDialogA11y({ open: showSettings, onClose: closeSettings });

  return (
    <>
      {onBack && (
        <div className="fixed left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30">
          <motion.button
            className={gameButtonClass({
              tone: 'slate',
              size: 'sm',
              className: 'w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/70 hover:text-white',
            })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            aria-label={backLabel}
            title={backLabel}
          >
            <BackIcon />
          </motion.button>
        </div>
      )}

      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex items-center gap-2">
        <AudioMuteButton className="w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/40 hover:text-white/70" />
        <button
          className={gameButtonClass({
            tone: 'slate',
            size: 'sm',
            className: 'w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/40 hover:text-white/70',
          })}
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSettings}
          >
            <motion.div
              ref={settingsDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              tabIndex={-1}
              className="settings-dialog bg-slate-800/95 rounded-2xl p-5 sm:p-7 flex flex-col items-stretch gap-4 w-[95vw] max-w-[720px] max-h-[88dvh] min-h-0 overflow-hidden border border-slate-600/40"
              style={{
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 0, 0, 0.3)',
              }}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white text-center">Settings</h2>
              <div className="flex flex-1 min-h-0 flex-col">
                <SettingsPanel onClose={closeSettings} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
