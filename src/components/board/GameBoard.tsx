import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import type { CardInstance, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { useGameDispatch } from '@game/GameDispatchContext';
import { PlayerInfo } from './PlayerInfo';
import { CreatureSlots } from './CreatureSlots';
import { BattleLine } from './BattleLine';
import { BlockAssignmentLines } from './BlockAssignmentLines';
import { PlayerHand, OpponentHand } from '@components/hand';
import { CombatControls } from '@components/combat';
import { PhaseStrip, TurnBanner } from '@components/phase';
import { AnimationOverlay } from '@components/animation';
import { CardPreview } from '@components/card';
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
  const opponentPlayer = getOpponent(humanPlayer);
  const inspectedCardId = useUIStore((s) => s.inspectedCardId);
  const inspectCard = useUIStore((s) => s.inspectCard);
  const dispatch = useGameDispatch();
  const [showHints, setShowHints] = useState(() => !loadHintsDismissed());
  const [discardViewerPlayerId, setDiscardViewerPlayerId] = useState<PlayerId | null>(null);

  const phase = state?.phase;
  const isTargetingPhase = phase?.type === 'targeting';
  const validTargetPlayerIds = new Set(
    legalActions.flatMap((action) =>
      action.type === 'SELECT_TARGET' && action.targetRef.type === 'player'
        ? [action.targetRef.playerId]
        : [],
    ),
  );
  const canCancelTargeting = legalActions.some((a) => a.type === 'CANCEL_TARGETING');

  const targetingCardName = isTargetingPhase ? CARD_REGISTRY[phase.sourceCardId].name : null;
  const targetingEffectText =
    isTargetingPhase && phase.effectId in EFFECT_REGISTRY
      ? EFFECT_REGISTRY[phase.effectId].description
      : null;
  const discardViewerCards = useMemo(() => {
    if (!discardViewerPlayerId || !state) return [];
    return summarizeDiscard(state.players[discardViewerPlayerId].discard);
  }, [discardViewerPlayerId, state]);

  useEffect(() => {
    document.body.classList.add('game-active');
    return () => document.body.classList.remove('game-active');
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
      className="game-surface h-screen flex flex-col select-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={{ paddingRight: 'calc(6rem + env(safe-area-inset-right))' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ═══ Opponent hand — top edge ═══ */}
      <div className="shrink-0 pt-1 z-10">
        <OpponentHand />
      </div>

      {/* ═══ Main arena: battlefield ═══ */}
      <div
        className="flex-1 flex min-h-0 relative z-30"
        style={{ paddingBottom: 'calc(var(--card-height) * 0.28)' }}
      >
        {/* Battlefield — takes all available width */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Opponent board */}
          <div className="relative z-20 flex-1 flex items-end justify-center pb-3 sm:pb-4 min-h-0 overflow-hidden">
            <CreatureSlots playerId={opponentPlayer} isOpponent />
          </div>

          {/* Battle line */}
          <div className="relative z-10 shrink-0">
            <BattleLine />
          </div>

          {/* Player board */}
          <div className="relative z-20 flex-1 flex items-start justify-center pt-1 min-h-0 overflow-hidden -translate-y-2 sm:-translate-y-3" data-player-board={humanPlayer}>
            <CreatureSlots playerId={humanPlayer} isOpponent={false} />
          </div>
        </div>
      </div>

      {/* ═══ Player hand — bottom edge ═══ */}
      <div className="shrink-0 relative z-40">
        <PlayerHand />
      </div>

      {/* Fixed overlays — outside battlefield stacking context so their z-index beats hand z-40 */}
      <PhaseStrip />
      <CombatControls />

      {/* Right sidebar — full-height viewport panel */}
      <div
        data-testid="right-sidebar"
        className="fixed inset-y-0 right-0 z-[35] w-24 flex flex-col justify-between border-l border-white/10 bg-slate-950/72 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <PlayerInfo
          playerId={opponentPlayer}
          isOpponent
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
        <PlayerInfo
          playerId={humanPlayer}
          isOpponent={false}
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

      {/* Turn banner overlay */}
      <TurnBanner />

      {/* Block assignment links */}
      <BlockAssignmentLines />

      {/* Targeting prompt overlay */}
      {isTargetingPhase && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-amber-300/40 bg-slate-900/90 px-4 py-2 shadow-xl shadow-black/40 backdrop-blur-sm text-center">
            <p className="text-amber-200 text-sm font-semibold">
              Choose a target for {targetingCardName}
            </p>
            {targetingEffectText && (
              <p className="text-white/70 text-xs mt-0.5">{targetingEffectText}</p>
            )}
            {canCancelTargeting && (
              <button
                className={gameButtonClass({
                  tone: 'neutral',
                  size: 'sm',
                  className: 'mt-2 px-4 py-2 text-sm',
                })}
                onClick={() => dispatch({ type: 'CANCEL_TARGETING' }, humanPlayer)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* New-player gameplay coach marks */}
      {showHints && (
        <div className="fixed left-2 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 max-w-xs rounded-xl border border-white/20 bg-slate-900/88 p-3 shadow-xl shadow-black/30 backdrop-blur-sm">
          <p className="text-white text-sm font-semibold">Quick tips</p>
          <ul className="mt-1 space-y-1 text-white/75 text-xs">
            <li>Tap a card, then tap an empty slot to play.</li>
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
        </div>
      )}

      {/* Animation overlay */}
      <AnimationOverlay />

      {/* Graveyard / discard viewer */}
      <AnimatePresence>
        {discardViewerPlayerId && (
          <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-lg font-bold">
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
                  {discardViewerCards.map((item) => (
                    <li
                      key={item.cardId}
                      className="flex items-center justify-between rounded-lg bg-slate-900/85 border border-white/8 px-3 py-2 cursor-pointer hover:bg-slate-800/85 transition-colors"
                      onClick={() => inspectCard(item.cardId)}
                    >
                      <span className="text-white/90 text-sm">{item.name}</span>
                      <span className="text-white/50 text-xs">x{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
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
