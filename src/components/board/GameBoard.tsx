import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import type { CardInstance, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { useGameDispatch } from '@game/GameDispatchContext';
import { useScreenShake } from '@hooks/useScreenShake';
import { getDeckPrimaryElement, getBattlefieldBackground, getDeckAvatarPath } from '@components/card/cardUtils';
import { PlayerInfo } from './PlayerInfo';
import { HeroHUD } from './HeroHUD';
import { ActionButton } from './ActionButton';
import { CreatureSlots } from './CreatureSlots';
import { BattleLine } from './BattleLine';
import { BlockAssignmentLines } from './BlockAssignmentLines';
import { PlayerHand, OpponentHand } from '@components/hand';
import { TurnBanner } from '@components/phase';
import { AnimationOverlay } from '@components/animation';
import { CardPreview } from '@components/card';
import { TargetingPanel } from '@components/targeting/TargetingPanel';
import { gameButtonClass } from '@components/ui/buttonStyles';

const HINTS_DISMISSED_KEY = 'alchemy:gameplay-hints-dismissed';

function loadHintsDismissed(): boolean {
  try {
    return localStorage.getItem(HINTS_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function GameBoard() {
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const state = useGameStore((s) => s.state);
  const legalActions = useGameStore((s) => s.legalActions);
  const shakeClass = useScreenShake();
  const humanDeckIds = useGameStore((s) =>
    s.humanPlayer === 'player1' ? s.player1DeckIds : s.player2DeckIds,
  );
  const opponentDeckIds = useGameStore((s) =>
    s.humanPlayer === 'player1' ? s.player2DeckIds : s.player1DeckIds,
  );
  const opponentPlayer = getOpponent(humanPlayer);
  const inspectedCardId = useUIStore((s) => s.inspectedCardId);
  const inspectCard = useUIStore((s) => s.inspectCard);
  const selectHandCard = useUIStore((s) => s.selectHandCard);
  const dispatch = useGameDispatch();
  const [showHints, setShowHints] = useState(() => !loadHintsDismissed());
  const [discardViewerPlayerId, setDiscardViewerPlayerId] = useState<PlayerId | null>(null);

  const primaryElement = useMemo(() => getDeckPrimaryElement(humanDeckIds), [humanDeckIds]);
  const battlefieldBg = primaryElement ? getBattlefieldBackground(primaryElement) : undefined;
  const humanAvatar = useMemo(() => getDeckAvatarPath(humanDeckIds), [humanDeckIds]);
  const opponentAvatar = useMemo(() => getDeckAvatarPath(opponentDeckIds), [opponentDeckIds]);

  const phase = state?.phase;
  const validTargetPlayerIds = new Set(
    legalActions.flatMap((action) =>
      action.type === 'SELECT_TARGET' && action.targetRef.type === 'player'
        ? [action.targetRef.playerId]
        : [],
    ),
  );
  const canCancelTargeting = legalActions.some((a) => a.type === 'CANCEL_TARGETING');

  // Gate targeting prompt on legalActions (not phase type) so only the caster sees it
  const isLocalPlayerTargeting = canCancelTargeting || validTargetPlayerIds.size > 0
    || legalActions.some((a) => a.type === 'SELECT_TARGET');
  const discardViewerCards = useMemo(() => {
    if (!discardViewerPlayerId || !state) return [];
    return summarizeDiscard(state.players[discardViewerPlayerId].discard);
  }, [discardViewerPlayerId, state]);

  useEffect(() => {
    document.body.classList.add('game-active');
    try {
      // Screen Orientation API — only available in PWA / fullscreen context
      (screen.orientation as ScreenOrientation & { lock(o: string): Promise<void> })
        .lock('landscape').catch(() => {});
    } catch {
      // API unavailable — silently ignore
    }
    return () => {
      document.body.classList.remove('game-active');
      try {
        screen.orientation.unlock();
      } catch {
        // Ignore — unlock may not be available
      }
    };
  }, []);

  const handleDismissHints = () => {
    setShowHints(false);
    try {
      localStorage.setItem(HINTS_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage errors in private mode.
    }
  };

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white/50">
        Waiting for game...
      </div>
    );
  }

  return (
    <div
      className={`game-surface h-screen flex flex-col select-none bg-slate-950 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${shakeClass}`}
      style={{
        paddingRight: 'calc(var(--sidebar-w) + env(safe-area-inset-right))',
        ...(battlefieldBg
          ? { backgroundImage: `linear-gradient(to bottom, rgba(2,6,23,0.6), rgba(15,23,42,0.5), rgba(2,6,23,0.6)), url(${battlefieldBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundImage: 'linear-gradient(to bottom, #020617, #0f172a, #020617)' }),
      }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-hand-card]')) {
          selectHandCard(null);
        }
      }}
    >
      {/* ═══ Opponent hand — top edge ═══ */}
      <div className="shrink-0 pt-1 z-10">
        <OpponentHand />
      </div>

      {/* ═══ Opponent HeroHUD ═══ */}
      <div className="shrink-0 z-20">
        <HeroHUD
          playerId={opponentPlayer}
          isOpponent
          avatarSrc={opponentAvatar}
          isValidTarget={validTargetPlayerIds.has(opponentPlayer)}
          onHeroClick={
            validTargetPlayerIds.has(opponentPlayer)
              ? () =>
                  dispatch(
                    {
                      type: 'SELECT_TARGET',
                      targetRef: { type: 'player', playerId: opponentPlayer },
                    },
                    humanPlayer,
                  )
              : undefined
          }
          onDiscardClick={() => setDiscardViewerPlayerId(opponentPlayer)}
        />
      </div>

      {/* ═══ Main arena: battlefield ═══ */}
      <div className="flex-1 flex min-h-0 relative z-30">
        {/* Battlefield — takes all available width */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Opponent board */}
          <div className="relative z-20 flex-1 flex items-end justify-center pb-3 sm:pb-4 min-h-0">
            <CreatureSlots playerId={opponentPlayer} isOpponent />
          </div>

          {/* Battle line */}
          <div className="relative z-10 shrink-0 -translate-y-2">
            <BattleLine />
          </div>

          {/* Player board */}
          <div className="relative z-20 flex-1 flex items-start justify-center pt-1 min-h-0 -translate-y-2 sm:-translate-y-3" data-player-board={humanPlayer}>
            <CreatureSlots playerId={humanPlayer} isOpponent={false} />
          </div>
        </div>
      </div>

      {/* ═══ Player HeroHUD ═══ */}
      <div className="shrink-0 relative z-[35]">
        <HeroHUD
          playerId={humanPlayer}
          isOpponent={false}
          avatarSrc={humanAvatar}
          isValidTarget={validTargetPlayerIds.has(humanPlayer)}
          onHeroClick={
            validTargetPlayerIds.has(humanPlayer)
              ? () =>
                  dispatch(
                    {
                      type: 'SELECT_TARGET',
                      targetRef: { type: 'player', playerId: humanPlayer },
                    },
                    humanPlayer,
                  )
              : undefined
          }
          onDiscardClick={() => setDiscardViewerPlayerId(humanPlayer)}
        />
      </div>

      {/* ═══ Player hand spacer — reserves space for the collapsed hand peek ═══ */}
      <div className="shrink-0 hand-spacer" />

      {/* ═══ Player hand — fixed overlay at bottom, slides up on interaction.
           pointer-events:none on wrapper so clicks in the "empty" area above
           the visible cards pass through to the battlefield. ═══ */}
      <div
        className="fixed bottom-0 left-0 z-40 pointer-events-none"
        style={{
          right: 'calc(var(--sidebar-w) + env(safe-area-inset-right))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <PlayerHand />
      </div>

      {/* Fixed overlays */}
      <ActionButton />

      {/* Right sidebar — deck+discard only */}
      <div
        data-testid="right-sidebar"
        className="sidebar-panel fixed inset-y-0 right-0 z-[35] w-24 flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        style={{
          borderLeft: '1px solid rgba(148, 163, 184, 0.12)',
          boxShadow: 'inset 4px 0 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <PlayerInfo
          playerId={opponentPlayer}
          isOpponent
          onDiscardClick={() => setDiscardViewerPlayerId(opponentPlayer)}
        />
        {/* Decorative divider */}
        <div className="mx-3 shrink-0" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.2) 50%, transparent 100%)' }} />
        <PlayerInfo
          playerId={humanPlayer}
          isOpponent={false}
          onDiscardClick={() => setDiscardViewerPlayerId(humanPlayer)}
        />
      </div>

      {/* Turn banner overlay */}
      <TurnBanner />

      {/* Block assignment links */}
      <BlockAssignmentLines />

      {/* Combined targeting panel — card reveal + prompt + cancel */}
      <AnimatePresence>
        {isLocalPlayerTargeting && phase?.type === 'targeting' && (
          <TargetingPanel
            cardId={phase.sourceCardId}
            onCancel={canCancelTargeting ? () => dispatch({ type: 'CANCEL_TARGETING' }, humanPlayer) : undefined}
          />
        )}
      </AnimatePresence>

      {/* Discard prompt overlay */}
      <AnimatePresence>
        {phase?.type === 'discard' && phase.player === humanPlayer && (
          <motion.div
            className="fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="pointer-events-auto rounded-xl bg-slate-900/90 px-4 py-2 shadow-xl shadow-black/40 backdrop-blur-sm text-center"
              style={{ border: '1px solid rgba(251, 146, 60, 0.4)' }}
              animate={{
                borderColor: [
                  'rgba(251, 146, 60, 0.3)',
                  'rgba(251, 146, 60, 0.7)',
                  'rgba(251, 146, 60, 0.3)',
                ],
                boxShadow: [
                  '0 0 12px rgba(251, 146, 60, 0.1), 0 4px 20px rgba(0, 0, 0, 0.4)',
                  '0 0 24px rgba(251, 146, 60, 0.3), 0 4px 20px rgba(0, 0, 0, 0.4)',
                  '0 0 12px rgba(251, 146, 60, 0.1), 0 4px 20px rgba(0, 0, 0, 0.4)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-orange-200 text-sm font-semibold">
                Discard {phase.mustDiscard} {phase.mustDiscard === 1 ? 'card' : 'cards'}
              </p>
              <p className="text-white/70 text-xs mt-0.5">Tap a card in your hand to discard it</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New-player gameplay coach marks */}
      <AnimatePresence>
        {showHints && (
          <motion.div
            className="fixed left-2 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[45] max-w-xs rounded-xl border border-white/20 bg-slate-900/88 p-3 shadow-xl shadow-black/30 backdrop-blur-sm"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          >
            <p className="text-white text-sm font-semibold">Quick tips</p>
            <ul className="mt-1 space-y-1 text-white/75 text-xs">
              <li>Double-tap or drag a card to play it.</li>
              <li>Hold any card to inspect details.</li>
              <li>Tap highlighted units or heroes to target spells.</li>
            </ul>
            <button
              className={gameButtonClass({
                tone: 'neutral',
                size: 'sm',
                className: 'mt-2 w-full text-sm',
              })}
              onClick={handleDismissHints}
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation overlay */}
      <AnimationOverlay />

      {/* Graveyard / discard viewer */}
      <AnimatePresence>
        {discardViewerPlayerId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDiscardViewerPlayerId(null)}
          >
            {/* Ghostly backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />

            {/* Modal panel */}
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-slate-600/30 bg-slate-950/95 p-4 shadow-2xl"
              style={{
                boxShadow: '0 0 40px rgba(100, 116, 139, 0.15), 0 8px 32px rgba(0,0,0,0.5)',
              }}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-slate-300 text-lg font-bold flex items-center gap-2">
                  <span className="text-slate-500">💀</span>
                  {discardViewerPlayerId === humanPlayer ? 'Your' : 'Opponent'} Graveyard
                </h3>
                <button
                  type="button"
                  className={gameButtonClass({
                    tone: 'neutral',
                    size: 'sm',
                    className: 'px-4 py-2 text-xs',
                  })}
                  onClick={() => setDiscardViewerPlayerId(null)}
                >
                  Close
                </button>
              </div>

              {discardViewerCards.length === 0 ? (
                <p className="text-white/55 text-sm mt-4">No cards in graveyard.</p>
              ) : (
                <ul className="mt-3 max-h-80 overflow-auto space-y-1">
                  {discardViewerCards.map((item, i) => (
                    <motion.li
                      key={item.cardId}
                      className="flex items-center justify-between rounded-lg bg-slate-900/85 border border-white/8 px-3 py-2 cursor-pointer hover:bg-slate-800/85 transition-colors"
                      onClick={() => inspectCard(item.cardId)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.04, ease: 'easeOut' }}
                    >
                      <span className="text-white/90 text-sm">{item.name}</span>
                      <span className="text-white/50 text-xs">x{item.count}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card inspection overlay (long-press / graveyard click) */}
      <AnimatePresence>
        {inspectedCardId && (
          <CardPreview cardId={inspectedCardId} onDismiss={() => inspectCard(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function summarizeDiscard(discard: CardInstance[]): { cardId: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (let i = discard.length - 1; i >= 0; i -= 1) {
    const { cardId } = discard[i];
    if (!counts.has(cardId)) {
      order.push(cardId);
    }
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }

  return order.map((cardId) => ({
    cardId,
    name: CARD_REGISTRY[cardId]?.name ?? cardId,
    count: counts.get(cardId) ?? 0,
  }));
}
