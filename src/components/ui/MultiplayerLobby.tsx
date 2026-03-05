import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { PeerSession } from '@network/peer';
import { createPeerSession } from '@network/peer';
import type { HostResult } from '@network/connection';
import { hostRoom, joinRoom, parseRoomCode } from '@network/connection';
import { ELEMENTS } from '@engine/elements';
import { DeckSelector } from './DeckSelector';
import { gameButtonClass } from './buttonStyles';
import { ScreenChrome } from './ScreenChrome';

type LobbyStep =
  | { type: 'choose_role' }
  | { type: 'host_select_deck' }
  | { type: 'host_waiting'; roomCode: string; hostDeckIds: string[] }
  | { type: 'join_enter_code' }
  | { type: 'join_select_deck'; roomCode: string }
  | { type: 'connecting' }
  | { type: 'error'; message: string };

interface MultiplayerLobbyProps {
  onStartGame: (session: PeerSession, isHost: boolean, localDeckIds: string[], remoteDeckIds: string[], seed: number) => void;
  onBack: () => void;
}

interface FloatingIcon {
  id: number;
  element: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function useFloatingIcons(count: number): FloatingIcon[] {
  // useState lazy initializer is explicitly allowed to be impure (runs once)
  const [icons] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      element: ELEMENTS[i % ELEMENTS.length],
      x: Math.random() * 90 + 5,
      y: Math.random() * 80 + 10,
      size: Math.random() * 24 + 20,
      duration: Math.random() * 6 + 8,
      delay: Math.random() * 4,
    })),
  );
  return icons;
}

export function MultiplayerLobby({ onStartGame, onBack }: MultiplayerLobbyProps) {
  const [step, setStep] = useState<LobbyStep>({ type: 'choose_role' });
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const mountedRef = useRef(true);
  const hostRef = useRef<HostResult | null>(null);
  const sessionRef = useRef<PeerSession | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const floatingIcons = useFloatingIcons(shouldReduceMotion ? 0 : 8);
  const logoWordmarkSrc = `${import.meta.env.BASE_URL}logo_wordmark.webp`;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sessionRef.current?.close();
      hostRef.current?.destroy();
    };
  }, []);

  const hostDeckIds = step.type === 'host_waiting' ? step.hostDeckIds : null;

  // ─── Host Flow ───

  const handleHostDeckSelected = useCallback((deckIds: string[]) => {
    const host = hostRoom();
    hostRef.current = host;
    setStep({ type: 'host_waiting', roomCode: host.roomCode, hostDeckIds: deckIds });
  }, []);

  // Effect: wait for guest when host is waiting
  useEffect(() => {
    if (step.type !== 'host_waiting' || !hostDeckIds) return;

    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    (async () => {
      try {
        const { conn, destroyPeer } = await host.waitForGuest();
        if (cancelled || !mountedRef.current) { destroyPeer(); return; }

        setStep({ type: 'connecting' });
        const session = createPeerSession(conn, destroyPeer);
        sessionRef.current = session;

        // Wait for guest to send their deck
        const guestDeckIds = await new Promise<string[]>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout waiting for opponent deck')), 30_000);
          const unsubMsg = session.onMessage((msg) => {
            if (msg.type === 'guest_deck') {
              clearTimeout(timeout);
              unsubMsg();
              unsubDc();
              resolve(msg.deckIds);
            }
          });
          const unsubDc = session.onDisconnect((reason) => {
            clearTimeout(timeout);
            unsubMsg();
            unsubDc();
            reject(new Error(`Opponent disconnected: ${reason}`));
          });
        });

        if (cancelled || !mountedRef.current) { session.close(); return; }

        const seed = Date.now();
        const sent = session.send({
          type: 'game_setup',
          seed,
          hostDeckIds,
          guestDeckIds,
          tier: 'apprentice',
        });
        if (!sent) throw new Error('Failed to send game setup. Connection may have been lost.');

        sessionRef.current = null;
        hostRef.current = null;
        onStartGame(session, true, hostDeckIds, guestDeckIds, seed);
      } catch (err) {
        sessionRef.current?.close();
        sessionRef.current = null;
        if (cancelled || !mountedRef.current) return;
        setStep({ type: 'error', message: err instanceof Error ? err.message : `Connection failed: ${err}` });
      }
    })();

    return () => {
      cancelled = true;
      sessionRef.current?.close();
      sessionRef.current = null;
    };
  }, [step.type, hostDeckIds, onStartGame]);

  // ─── Join Flow ───

  const handleJoinSubmitCode = useCallback(() => {
    const code = parseRoomCode(codeInput);
    if (!code) {
      setCodeError('Enter a 5-character room code');
      return;
    }
    setCodeError('');
    setStep({ type: 'join_select_deck', roomCode: code });
  }, [codeInput]);

  const handleJoinDeckSelected = useCallback(async (deckIds: string[]) => {
    if (step.type !== 'join_select_deck') return;
    const { roomCode } = step;

    setStep({ type: 'connecting' });
    try {
      const { conn, destroyPeer } = await joinRoom(roomCode);
      if (!mountedRef.current) { destroyPeer(); return; }

      const session = createPeerSession(conn, destroyPeer);
      sessionRef.current = session;

      const sent = session.send({ type: 'guest_deck', deckIds });
      if (!sent) throw new Error('Failed to send deck. Connection may have been lost.');

      // Wait for game setup from host
      const setup = await new Promise<{ seed: number; hostDeckIds: string[]; guestDeckIds: string[] }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for game setup')), 30_000);
        const unsubMsg = session.onMessage((msg) => {
          if (msg.type === 'game_setup') {
            clearTimeout(timeout);
            unsubMsg();
            unsubDc();
            resolve({ seed: msg.seed, hostDeckIds: msg.hostDeckIds, guestDeckIds: msg.guestDeckIds });
          }
        });
        const unsubDc = session.onDisconnect((reason) => {
          clearTimeout(timeout);
          unsubMsg();
          unsubDc();
          reject(new Error(`Host disconnected: ${reason}`));
        });
      });

      if (!mountedRef.current) { session.close(); return; }

      sessionRef.current = null;
      onStartGame(session, false, deckIds, setup.hostDeckIds, setup.seed);
    } catch (err) {
      sessionRef.current?.close();
      sessionRef.current = null;
      if (!mountedRef.current) return;
      setStep({ type: 'error', message: err instanceof Error ? err.message : `Connection failed: ${err}` });
    }
  }, [step, onStartGame]);

  const handleBack = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    hostRef.current?.destroy();
    hostRef.current = null;
    setCodeInput('');
    setCodeError('');
    setStep({ type: 'choose_role' });
  }, []);

  // ─── Deck Selection Screens ───

  if (step.type === 'host_select_deck') {
    return <DeckSelector onSelectDeck={handleHostDeckSelected} onBack={handleBack} />;
  }

  if (step.type === 'join_select_deck') {
    return <DeckSelector onSelectDeck={handleJoinDeckSelected} onBack={() => { setStep({ type: 'join_enter_code' }); }} />;
  }

  // ─── Main Lobby UI ───

  const backHandler = step.type === 'choose_role' ? onBack
    : step.type === 'connecting' ? null
    : handleBack;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-white overflow-hidden relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <ScreenChrome onBack={backHandler ?? undefined} />
      {/* Floating element icons */}
      {floatingIcons.map((icon) => (
        <motion.img
          key={icon.id}
          src={`${import.meta.env.BASE_URL}elements/${icon.element}.webp`}
          alt=""
          className="absolute opacity-[0.07] pointer-events-none"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            width: icon.size,
            height: icon.size,
          }}
          animate={{
            y: [0, -15, 0],
            x: [0, 8, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: icon.duration,
            delay: icon.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo with glow */}
        <div className="title-logo relative mb-8 flex items-center justify-center pointer-events-none">
          {!shouldReduceMotion && (
            <motion.div
              className="absolute"
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
            initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.7, y: 20 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.8, type: 'spring', stiffness: 200, damping: 15 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step.type === 'choose_role' && (
            <motion.div
              key="choose"
              className="title-buttons flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.button
                className={gameButtonClass({ tone: 'amber', size: 'lg', className: 'title-button w-64 text-xl font-bold' })}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep({ type: 'host_select_deck' })}
              >
                Host Game
              </motion.button>
              <motion.button
                className={gameButtonClass({ tone: 'blue', size: 'lg', className: 'title-button w-64 text-xl font-bold' })}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setCodeInput(''); setCodeError(''); setStep({ type: 'join_enter_code' }); }}
              >
                Join Game
              </motion.button>
              <motion.p
                className="title-subtitle mt-6 text-white/50 text-sm tracking-wide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Challenge a friend via peer-to-peer
              </motion.p>
            </motion.div>
          )}

          {step.type === 'host_waiting' && (
            <motion.div
              key="host-waiting"
              className="flex flex-col items-center gap-6 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-xl font-bold">Your Room Code</h3>
              <p className="text-white/50 text-sm text-center">Tell your friend this code</p>

              <div className="flex gap-2">
                {step.roomCode.split('').map((char, i) => (
                  <motion.div
                    key={i}
                    className="w-14 h-16 rounded-xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-3xl font-bold text-amber-200 tracking-wider"
                    initial={{ opacity: 0, y: 20, scale: 0.5, rotate: -10 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 400, damping: 15 }}
                    style={{
                      textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
                    }}
                  >
                    {char}
                  </motion.div>
                ))}
              </div>

              {/* Pulsing glow under room code */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute pointer-events-none"
                  style={{
                    width: 280,
                    height: 60,
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(251, 191, 36, 0.12), transparent 70%)',
                    filter: 'blur(15px)',
                  }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <div className="flex items-center gap-3 text-white/50">
                <motion.div
                  className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-sm">Waiting for opponent...</span>
              </div>
            </motion.div>
          )}

          {step.type === 'join_enter_code' && (
            <motion.div
              key="join-code"
              className="flex flex-col items-center gap-4 max-w-sm px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-xl font-bold">Join Game</h3>
              <p className="text-white/50 text-sm text-center">Enter the room code from the host</p>

              <input
                className="w-48 bg-slate-800 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-blue-200 uppercase outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 placeholder:tracking-normal placeholder:text-base"
                maxLength={5}
                placeholder="CODE"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase().slice(0, 5));
                  setCodeError('');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinSubmitCode(); }}
                autoFocus
              />
              {codeError && <p className="text-red-400 text-xs">{codeError}</p>}

              <motion.button
                className={gameButtonClass({
                  tone: 'blue',
                  size: 'md',
                  disabled: codeInput.length < 5,
                  className: 'w-64 font-bold text-sm mt-2',
                })}
                whileHover={codeInput.length >= 5 ? { scale: 1.05 } : undefined}
                whileTap={codeInput.length >= 5 ? { scale: 0.95 } : undefined}
                onClick={handleJoinSubmitCode}
                disabled={codeInput.length < 5}
              >
                Next: Select Deck
              </motion.button>
            </motion.div>
          )}

          {step.type === 'connecting' && (
            <motion.div
              key="connecting"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-white/70">Connecting...</p>
            </motion.div>
          )}

          {step.type === 'error' && (
            <motion.div
              key="error"
              className="flex flex-col items-center gap-4 max-w-md px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-xl font-bold text-red-400">Connection Error</h3>
              <p className="text-white/60 text-sm text-center">{step.message}</p>
              <motion.button
                className={gameButtonClass({ tone: 'neutral', size: 'md', className: 'px-6 font-medium' })}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
