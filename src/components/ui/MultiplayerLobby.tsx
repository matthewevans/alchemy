import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PeerSession } from '@network/peer';
import { createHostOffer, joinWithOffer } from '@network/connection';
import { createPeerSession } from '@network/peer';
import { DeckSelector } from './DeckSelector';

type LobbyStep =
  | { type: 'choose_role' }
  | { type: 'host_select_deck' }
  | { type: 'host_enter_answer'; inviteCode: string; completeConnection: (answer: string) => Promise<{ pc: RTCPeerConnection; channel: RTCDataChannel }>; hostDeckIds: string[] }
  | { type: 'host_connecting' }
  | { type: 'join_enter_invite' }
  | { type: 'join_select_deck'; inviteCode: string }
  | { type: 'join_waiting_answer'; answerCode: string; waitForConnection: () => Promise<{ pc: RTCPeerConnection; channel: RTCDataChannel }>; guestDeckIds: string[] }
  | { type: 'join_connecting' }
  | { type: 'error'; message: string };

interface MultiplayerLobbyProps {
  onStartGame: (session: PeerSession, isHost: boolean, localDeckIds: string[], remoteDeckIds: string[], seed: number) => void;
  onBack: () => void;
}

export function MultiplayerLobby({ onStartGame, onBack }: MultiplayerLobbyProps) {
  const [step, setStep] = useState<LobbyStep>({ type: 'choose_role' });
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track mounted state for async safety
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (!mountedRef.current) return;
      setCopied(true);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setCopied(false);
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      // Clipboard API unavailable or permission denied — fall back to selection
      // The code div has select-all, so users can manually copy
    }
  }, []);

  // ─── Host Flow ───

  const handleHost = useCallback(() => {
    setStep({ type: 'host_select_deck' });
  }, []);

  const handleHostDeckSelected = useCallback(async (deckIds: string[]) => {
    try {
      const { inviteCode, completeConnection } = await createHostOffer();
      if (!mountedRef.current) return;
      setStep({ type: 'host_enter_answer', inviteCode, completeConnection, hostDeckIds: deckIds });
    } catch (err) {
      if (!mountedRef.current) return;
      setStep({ type: 'error', message: err instanceof Error ? err.message : `Failed to create offer: ${err}` });
    }
  }, []);

  const handleHostConnect = useCallback(async () => {
    if (step.type !== 'host_enter_answer') return;
    const answerCode = inputCode.trim();
    if (!answerCode) return;

    // Capture values from closure before async
    const { completeConnection, hostDeckIds } = step;

    setStep({ type: 'host_connecting' });
    try {
      const conn = await completeConnection(answerCode);
      if (!mountedRef.current) return;
      const session = createPeerSession(conn);

      // Wait for guest to send deck
      const guestDeckIds = await new Promise<string[]>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for guest deck')), 30_000);
        session.onMessage((msg) => {
          if (msg.type === 'guest_deck') {
            clearTimeout(timeout);
            resolve(msg.deckIds);
          }
        });
        session.onDisconnect((reason) => {
          clearTimeout(timeout);
          reject(new Error(`Peer disconnected: ${reason}`));
        });
      });

      if (!mountedRef.current) { session.close(); return; }

      // Send game setup with shared seed
      const seed = Date.now();
      session.send({
        type: 'game_setup',
        seed,
        hostDeckIds,
        guestDeckIds,
        tier: 'apprentice',
      });

      onStartGame(session, true, hostDeckIds, guestDeckIds, seed);
    } catch (err) {
      if (!mountedRef.current) return;
      setStep({ type: 'error', message: err instanceof Error ? err.message : `Connection failed: ${err}` });
    }
  }, [step, inputCode, onStartGame]);

  // ─── Join Flow ───

  const handleJoin = useCallback(() => {
    setStep({ type: 'join_enter_invite' });
  }, []);

  const handleJoinEnterInvite = useCallback(() => {
    const code = inputCode.trim();
    if (!code) return;
    setInputCode('');
    setStep({ type: 'join_select_deck', inviteCode: code });
  }, [inputCode]);

  const handleJoinDeckSelected = useCallback(async (deckIds: string[]) => {
    if (step.type !== 'join_select_deck') return;
    try {
      const { answerCode, waitForConnection } = await joinWithOffer(step.inviteCode);
      if (!mountedRef.current) return;
      setStep({ type: 'join_waiting_answer', answerCode, waitForConnection, guestDeckIds: deckIds });
    } catch (err) {
      if (!mountedRef.current) return;
      setStep({ type: 'error', message: err instanceof Error ? err.message : `Failed to join: ${err}` });
    }
  }, [step]);

  const handleJoinConnect = useCallback(async () => {
    if (step.type !== 'join_waiting_answer') return;

    // Capture values from closure before async
    const { waitForConnection, guestDeckIds } = step;

    setStep({ type: 'join_connecting' });
    try {
      const conn = await waitForConnection();
      if (!mountedRef.current) return;
      const session = createPeerSession(conn);

      // Send our deck
      session.send({ type: 'guest_deck', deckIds: guestDeckIds });

      // Wait for game setup from host
      const setup = await new Promise<{ seed: number; hostDeckIds: string[]; guestDeckIds: string[] }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for game setup')), 30_000);
        session.onMessage((msg) => {
          if (msg.type === 'game_setup') {
            clearTimeout(timeout);
            resolve({ seed: msg.seed, hostDeckIds: msg.hostDeckIds, guestDeckIds: msg.guestDeckIds });
          }
        });
        session.onDisconnect((reason) => {
          clearTimeout(timeout);
          reject(new Error(`Peer disconnected: ${reason}`));
        });
      });

      if (!mountedRef.current) { session.close(); return; }

      onStartGame(session, false, guestDeckIds, setup.hostDeckIds, setup.seed);
    } catch (err) {
      if (!mountedRef.current) return;
      setStep({ type: 'error', message: err instanceof Error ? err.message : `Connection failed: ${err}` });
    }
  }, [step, onStartGame]);

  // ─── Deck Selection Screens ───

  if (step.type === 'host_select_deck') {
    return <DeckSelector onSelectDeck={handleHostDeckSelected} onBack={() => setStep({ type: 'choose_role' })} />;
  }

  if (step.type === 'join_select_deck') {
    return <DeckSelector onSelectDeck={handleJoinDeckSelected} onBack={() => setStep({ type: 'join_enter_invite' })} />;
  }

  // ─── Main Lobby UI ───

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
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
              className="px-10 py-4 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 text-white text-xl font-bold shadow-lg shadow-amber-500/30 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleHost}
            >
              Host Game
            </motion.button>
            <motion.button
              className="px-10 py-4 rounded-2xl bg-gradient-to-b from-blue-400 to-blue-600 text-white text-xl font-bold shadow-lg shadow-blue-500/30 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoin}
            >
              Join Game
            </motion.button>
            <motion.button
              className="mt-4 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm cursor-pointer hover:bg-white/10"
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
            >
              Back
            </motion.button>
          </motion.div>
        )}

        {step.type === 'host_enter_answer' && (
          <motion.div
            key="host-answer"
            className="flex flex-col items-center gap-4 max-w-md px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-xl font-bold">Share Invite Code</h3>
            <p className="text-white/50 text-sm text-center">Copy this code and send it to your opponent</p>
            <div className="w-full bg-slate-800 rounded-lg p-3 break-all text-xs font-mono text-amber-300 max-h-24 overflow-y-auto select-all">
              {step.inviteCode}
            </div>
            <motion.button
              className="px-6 py-2 rounded-lg bg-amber-500 text-white font-bold text-sm cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => copyToClipboard(step.inviteCode)}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </motion.button>

            <div className="w-full border-t border-white/10 my-2" />

            <p className="text-white/50 text-sm text-center">Paste their answer code below</p>
            <textarea
              className="w-full bg-slate-800 rounded-lg p-3 text-xs font-mono text-blue-300 resize-none h-20 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Paste answer code here..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
            />
            <motion.button
              className={`px-8 py-3 rounded-xl font-bold text-sm cursor-pointer ${
                inputCode.trim()
                  ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-white/30 cursor-not-allowed'
              }`}
              whileHover={inputCode.trim() ? { scale: 1.05 } : undefined}
              whileTap={inputCode.trim() ? { scale: 0.95 } : undefined}
              onClick={handleHostConnect}
              disabled={!inputCode.trim()}
            >
              Connect
            </motion.button>
          </motion.div>
        )}

        {step.type === 'join_enter_invite' && (
          <motion.div
            key="join-invite"
            className="flex flex-col items-center gap-4 max-w-md px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-xl font-bold">Join Game</h3>
            <p className="text-white/50 text-sm text-center">Paste the invite code from the host</p>
            <textarea
              className="w-full bg-slate-800 rounded-lg p-3 text-xs font-mono text-amber-300 resize-none h-20 outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Paste invite code here..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
            />
            <div className="flex gap-3">
              <motion.button
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm cursor-pointer hover:bg-white/10"
                whileTap={{ scale: 0.95 }}
                onClick={() => { setInputCode(''); setStep({ type: 'choose_role' }); }}
              >
                Back
              </motion.button>
              <motion.button
                className={`px-8 py-3 rounded-xl font-bold text-sm cursor-pointer ${
                  inputCode.trim()
                    ? 'bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-700 text-white/30 cursor-not-allowed'
                }`}
                whileHover={inputCode.trim() ? { scale: 1.05 } : undefined}
                whileTap={inputCode.trim() ? { scale: 0.95 } : undefined}
                onClick={handleJoinEnterInvite}
                disabled={!inputCode.trim()}
              >
                Next: Select Deck
              </motion.button>
            </div>
          </motion.div>
        )}

        {step.type === 'join_waiting_answer' && (
          <motion.div
            key="join-answer"
            className="flex flex-col items-center gap-4 max-w-md px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-xl font-bold">Share Answer Code</h3>
            <p className="text-white/50 text-sm text-center">Copy this code and send it back to the host</p>
            <div className="w-full bg-slate-800 rounded-lg p-3 break-all text-xs font-mono text-blue-300 max-h-24 overflow-y-auto select-all">
              {step.answerCode}
            </div>
            <motion.button
              className="px-6 py-2 rounded-lg bg-blue-500 text-white font-bold text-sm cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => copyToClipboard(step.answerCode)}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </motion.button>

            <div className="w-full border-t border-white/10 my-2" />

            <p className="text-white/50 text-sm text-center">Once the host has your code, click connect</p>
            <motion.button
              className="px-8 py-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinConnect}
            >
              Connect
            </motion.button>
          </motion.div>
        )}

        {(step.type === 'host_connecting' || step.type === 'join_connecting') && (
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
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium cursor-pointer hover:bg-white/10"
              whileTap={{ scale: 0.95 }}
              onClick={() => { setInputCode(''); setStep({ type: 'choose_role' }); }}
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
