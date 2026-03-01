import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PeerSession } from '@network/peer';
import { createPeerSession } from '@network/peer';
import type { HostResult } from '@network/connection';
import { hostRoom, joinRoom, parseRoomCode } from '@network/connection';
import { DeckSelector } from './DeckSelector';
import { gameButtonClass } from './buttonStyles';

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

export function MultiplayerLobby({ onStartGame, onBack }: MultiplayerLobbyProps) {
  const [step, setStep] = useState<LobbyStep>({ type: 'choose_role' });
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const mountedRef = useRef(true);
  const hostRef = useRef<HostResult | null>(null);
  const sessionRef = useRef<PeerSession | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sessionRef.current?.close();
      hostRef.current?.destroy();
    };
  }, []);

  // ─── Host Flow ───

  const handleHostDeckSelected = useCallback((deckIds: string[]) => {
    const host = hostRoom();
    hostRef.current = host;
    setStep({ type: 'host_waiting', roomCode: host.roomCode, hostDeckIds: deckIds });
  }, []);

  // Effect: wait for guest when host is waiting
  useEffect(() => {
    if (step.type !== 'host_waiting') return;

    const host = hostRef.current;
    if (!host) return;

    const { hostDeckIds } = step;
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
  }, [step.type, step.type === 'host_waiting' ? step.hostDeckIds : null, onStartGame]);

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

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <AnimatePresence mode="wait">
        {step.type === 'choose_role' && (
          <motion.div
            key="choose"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-3xl font-bold mb-2">Multiplayer</h2>
            <p className="text-white/50 text-sm mb-4">Challenge a friend via peer-to-peer</p>
            <motion.button
              className={gameButtonClass({ tone: 'amber', size: 'lg', className: 'px-10 text-xl font-bold' })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep({ type: 'host_select_deck' })}
            >
              Host Game
            </motion.button>
            <motion.button
              className={gameButtonClass({ tone: 'blue', size: 'lg', className: 'px-10 text-xl font-bold' })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setCodeInput(''); setCodeError(''); setStep({ type: 'join_enter_code' }); }}
            >
              Join Game
            </motion.button>
            <motion.button
              className={gameButtonClass({ tone: 'neutral', size: 'sm', className: 'mt-4 px-6 py-2 rounded-xl text-sm' })}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
            >
              Back
            </motion.button>
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
                <div
                  key={i}
                  className="w-14 h-16 rounded-xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-3xl font-bold text-amber-200 tracking-wider"
                >
                  {char}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-white/50">
              <motion.div
                className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-sm">Waiting for opponent...</span>
            </div>

            <motion.button
              className={gameButtonClass({ tone: 'neutral', size: 'sm', className: 'mt-2 px-6 py-2 text-sm' })}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
            >
              Cancel
            </motion.button>
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

            <div className="flex gap-3 mt-2">
              <motion.button
                className={gameButtonClass({ tone: 'neutral', size: 'sm', className: 'px-6 py-2 text-sm' })}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
              >
                Back
              </motion.button>
              <motion.button
                className={gameButtonClass({
                  tone: 'blue',
                  size: 'md',
                  disabled: codeInput.length < 5,
                  className: 'px-8 font-bold text-sm',
                })}
                whileHover={codeInput.length >= 5 ? { scale: 1.05 } : undefined}
                whileTap={codeInput.length >= 5 ? { scale: 0.95 } : undefined}
                onClick={handleJoinSubmitCode}
                disabled={codeInput.length < 5}
              >
                Next: Select Deck
              </motion.button>
            </div>
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
  );
}
