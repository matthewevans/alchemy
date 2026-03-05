import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { gameButtonClass } from './buttonStyles';
import { SettingsPanel } from './settings/SettingsPanel';
import { FallingAshes } from './FallingAshes';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { AudioMuteButton } from './AudioMuteButton';

interface TitleScreenProps {
  onPlay: () => void;
  onAdventure: () => void;
  onMultiplayer: () => void;
  onDeckBuilder: () => void;
  onResume?: () => void;
}

const SPARKLE_COLORS = [
  'rgba(251, 191, 36, 0.6)',  // amber
  'rgba(167, 139, 250, 0.5)', // purple
  'rgba(96, 165, 250, 0.5)',  // blue
  'rgba(52, 211, 153, 0.5)',  // emerald
  'rgba(251, 146, 60, 0.5)',  // orange
];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  drift: number;
}

function useSparkles(count: number): Particle[] {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
      drift: (Math.random() - 0.5) * 30,
    })),
  );
  return particles;
}

function SinglePlayerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M10 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.59 0-6.5 2.69-6.5 6a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1c0-3.31-2.91-6-6.5-6Z" />
    </svg>
  );
}

function MultiPlayerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M6.5 8A2.75 2.75 0 1 0 6.5 2.5 2.75 2.75 0 0 0 6.5 8Zm7 0a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM2 15.5A5.5 5.5 0 0 1 7.5 10h1a5.5 5.5 0 0 1 5.5 5.5 1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Zm13.25 1H16a2 2 0 0 0 2-2c0-2.28-1.81-4.17-4.08-4.48a6.92 6.92 0 0 1 2.33 4.98c0 .53-.13 1.04-.35 1.5Z" />
    </svg>
  );
}

function AdventureIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path fillRule="evenodd" d="M10 1.25a.75.75 0 0 1 .75.75v.765a7.251 7.251 0 0 1 6.485 6.485H18a.75.75 0 0 1 0 1.5h-.765a7.251 7.251 0 0 1-6.485 6.485V18a.75.75 0 0 1-1.5 0v-.765a7.251 7.251 0 0 1-6.485-6.485H2a.75.75 0 0 1 0-1.5h.765A7.251 7.251 0 0 1 9.25 2.765V2a.75.75 0 0 1 .75-.75ZM4.29 9.25h2.417a3.252 3.252 0 0 1 2.543-2.543V4.29a5.752 5.752 0 0 0-4.96 4.96Zm6.46 1.5v2.417a5.752 5.752 0 0 0 4.96-4.96h-2.417a3.252 3.252 0 0 1-2.543 2.543Zm0-4.043a3.252 3.252 0 0 1 2.543 2.543h2.417a5.752 5.752 0 0 0-4.96-4.96v2.417Zm-1.5 6.46V10.75a3.252 3.252 0 0 1-2.543-2.543H4.29a5.752 5.752 0 0 0 4.96 4.96Z" clipRule="evenodd" />
    </svg>
  );
}

export function TitleScreen({ onPlay, onAdventure, onMultiplayer, onDeckBuilder, onResume }: TitleScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const particles = useSparkles(shouldReduceMotion ? 0 : 30);
  const logoWordmarkSrc = `${import.meta.env.BASE_URL}logo_wordmark.webp`;
  const settingsDialogRef = useDialogA11y({ open: showSettings, onClose: () => setShowSettings(false) });

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 overflow-hidden relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Falling ash particles */}
      {!shouldReduceMotion && <FallingAshes count={15} />}

      {/* Sparkle particles */}
      {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
            animate={{
              opacity: [0, 0.9, 0],
              y: [0, -25, -50],
              x: [0, p.drift],
              scale: [0.3, 1.2, 0.3],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* Logo with glow */}
      <div className="title-logo relative mb-8 flex items-center justify-center">
        {/* Golden radial glow behind logo */}
        {!shouldReduceMotion && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 400,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05) 50%, transparent 70%)',
              filter: 'blur(20px)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0.7], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
        <motion.img
          src={logoWordmarkSrc}
          alt="Alchemy"
          className="title-logo-img relative w-80 max-w-[80vw]"
          style={{ filter: 'drop-shadow(0 4px 20px rgba(251, 191, 36, 0.3))' }}
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 15 }}
        />
      </div>

      {/* Buttons — individually staggered */}
      <div className="title-buttons flex flex-col items-center gap-4">
        {onResume && (
          <motion.button
            className={gameButtonClass({
              tone: 'blue',
              size: 'lg',
              className: 'title-button w-64 text-2xl font-bold',
            })}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={onResume}
          >
            Resume Game
          </motion.button>
        )}
        <motion.button
          data-testid="play-btn"
          className={gameButtonClass({
            tone: 'emerald',
            size: onResume ? 'md' : 'lg',
            className: `title-button w-64 ${onResume ? 'text-lg' : 'text-2xl'} font-bold flex items-center justify-center gap-2`,
          })}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: onResume ? 0.4 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          onClick={onPlay}
        >
          <SinglePlayerIcon />
          <span>{onResume ? 'New Game' : 'Play'}</span>
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'blue',
            size: 'lg',
            className: 'title-button w-64 text-xl font-bold flex items-center justify-center gap-2',
          })}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: onResume ? 0.5 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          onClick={onAdventure}
        >
          <AdventureIcon />
          <span>Adventure</span>
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'amber',
            size: 'lg',
            className: 'title-button w-64 text-xl font-bold flex items-center justify-center gap-2',
          })}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: onResume ? 0.6 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          onClick={onMultiplayer}
        >
          <MultiPlayerIcon />
          <span>Multiplayer</span>
        </motion.button>
        <motion.button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'md',
            className: 'title-button w-64 text-sm font-medium',
          })}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: onResume ? 0.7 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          onClick={onDeckBuilder}
        >
          Deck Builder
        </motion.button>
      </div>

      {/* Subtitle */}
      <motion.p
        className="title-subtitle mt-6 text-white/50 text-sm tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        A card game for wizards-in-training
      </motion.p>

      {/* Bottom-right quick controls */}
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              ref={settingsDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              tabIndex={-1}
              className="settings-dialog bg-slate-800/95 rounded-2xl p-5 sm:p-7 flex flex-col items-stretch gap-4 w-[95vw] max-w-[720px] max-h-[88dvh] overflow-hidden shadow-2xl border border-slate-600/40"
              style={{
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 0, 0, 0.3)',
              }}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white text-center">Settings</h2>
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
