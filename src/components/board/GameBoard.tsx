import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { getOpponent } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { useGameDispatch } from '@game/GameDispatchContext';
import { PlayerInfo } from './PlayerInfo';
import { CreatureSlots } from './CreatureSlots';
import { BattleLine } from './BattleLine';
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
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* ═══ Opponent hand — top edge ═══ */}
      <div className="shrink-0 pt-1">
        <OpponentHand />
      </div>

      {/* ═══ Main arena: battlefield + right sidebar ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* Battlefield — takes all available width */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Opponent board */}
          <div className="flex-1 flex items-end justify-center pb-1 min-h-0">
            <CreatureSlots playerId={opponentPlayer} isOpponent />
          </div>

          {/* Battle line + phase strip + combat controls */}
          <div className="shrink-0">
            <PhaseStrip />
            <BattleLine />
            <CombatControls />
          </div>

          {/* Player board */}
          <div className="flex-1 flex items-start justify-center pt-1 min-h-0" data-player-board={humanPlayer}>
            <CreatureSlots playerId={humanPlayer} isOpponent={false} />
          </div>
        </div>

        {/* Right sidebar — MTGA-style avatar panels */}
        <div className="shrink-0 w-24 flex flex-col justify-between border-l border-white/5 bg-slate-950/50">
          <PlayerInfo
            playerId={opponentPlayer}
            isOpponent
            isValidTarget={validTargetPlayerIds.has(opponentPlayer)}
            onClick={
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
          />
          <PlayerInfo
            playerId={humanPlayer}
            isOpponent={false}
            isValidTarget={validTargetPlayerIds.has(humanPlayer)}
            onClick={
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
          />
        </div>
      </div>

      {/* ═══ Player hand — bottom edge ═══ */}
      <div className="shrink-0">
        <PlayerHand />
      </div>

      {/* Turn banner overlay */}
      <TurnBanner />

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

      {/* Card inspection overlay (long-press) */}
      <AnimatePresence>
        {inspectedCardId && (
          <CardPreview cardId={inspectedCardId} onDismiss={() => inspectCard(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
