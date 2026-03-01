import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { GameAction, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { useUIStore } from '@game/uiStore';
import { BoardCard } from '@components/card';
import { calculateBoardCardSize } from './boardSizing';

interface CreatureSlotsProps {
  playerId: PlayerId;
  isOpponent: boolean;
}

export function CreatureSlots({ playerId, isOpponent }: CreatureSlotsProps) {
  const board = useGameStore((s) => s.state?.players[playerId].board ?? []);
  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameDispatch();
  const selectedHandIndex = useUIStore((s) => s.selectedHandIndex);
  const selectHandCard = useUIStore((s) => s.selectHandCard);
  const selectedBlockerId = useUIStore((s) => s.selectedBlockerId);
  const selectBlocker = useUIStore((s) => s.selectBlocker);
  const selectedAttackerId = useUIStore((s) => s.selectedAttackerId);
  const selectAttacker = useUIStore((s) => s.selectAttacker);
  const inspectCard = useUIStore((s) => s.inspectCard);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  const isPlayerBoard = playerId === humanPlayer;
  const isPlayPhase = phase?.type === 'play';
  const selectedCardPlayable = selectedHandIndex !== null && legalActions.some(
    (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD' && a.cardIndex === selectedHandIndex,
  );
  const showPlusOnEmpty = isPlayerBoard && activePlayer === humanPlayer && isPlayPhase && selectedCardPlayable;

  const isBattlePhase = phase?.type === 'battle';
  const tentativeAttackers = isBattlePhase && phase.step === 'declare_attackers' ? phase.tentativeAttackers : [];
  const confirmedAttackers = isBattlePhase && phase.step === 'declare_blockers' ? phase.confirmedAttackers : [];
  const resolvingAttackers = isBattlePhase && phase.step === 'resolving' ? phase.attackers : [];
  const allAttackers = [...tentativeAttackers, ...confirmedAttackers, ...resolvingAttackers];

  const tentativeBlockers = isBattlePhase && phase.step === 'declare_blockers' ? phase.tentativeBlockers : {};
  const resolvingBlockers = isBattlePhase && phase.step === 'resolving' ? phase.blockers : {};
  const allBlockerIds = new Set([
    ...Object.keys(tentativeBlockers),
    ...Object.keys(resolvingBlockers),
  ]);

  // Determine valid attackers / blockers / targets from legal actions
  const validAttackerIds = new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'DECLARE_ATTACKER' }> => a.type === 'DECLARE_ATTACKER')
      .map((a) => a.permanentId),
  );
  const undeclareAttackerIds = new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'UNDECLARE_ATTACKER' }> => a.type === 'UNDECLARE_ATTACKER')
      .map((a) => a.permanentId),
  );
  const validBlockerIds = new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'ASSIGN_BLOCKER' }> => a.type === 'ASSIGN_BLOCKER')
      .map((a) => a.blockerPermanentId),
  );
  const validTargetActions = legalActions.filter(
    (a): a is Extract<GameAction, { type: 'SELECT_TARGET' }> => a.type === 'SELECT_TARGET',
  );
  const validTargetPermanentIds = new Set(
    validTargetActions
      .filter((a) => a.targetRef.type === 'creature')
      .map((a) => (a.targetRef as { type: 'creature'; permanentId: string }).permanentId),
  );

  const handleCreatureClick = (permanentId: string) => {
    if (!phase) return;

    // Targeting phase: click valid target creature
    if (phase.type === 'targeting') {
      const targetAction = validTargetActions.find(
        (a) => a.targetRef.type === 'creature' && a.targetRef.permanentId === permanentId,
      );
      if (targetAction) {
        dispatch(targetAction, humanPlayer);
      }
      return;
    }

    // Battle: declare attackers
    if (isBattlePhase && phase.step === 'declare_attackers' && isPlayerBoard) {
      if (undeclareAttackerIds.has(permanentId)) {
        dispatch({ type: 'UNDECLARE_ATTACKER', permanentId }, humanPlayer);
      } else if (validAttackerIds.has(permanentId)) {
        dispatch({ type: 'DECLARE_ATTACKER', permanentId }, humanPlayer);
      }
      return;
    }

    // Battle: declare blockers
    if (isBattlePhase && phase.step === 'declare_blockers') {
      const defender = activePlayer ? getOpponent(activePlayer) : null;
      if (humanPlayer !== defender) return;

      if (isPlayerBoard) {
        const isAssignedBlocker = permanentId in tentativeBlockers;
        if (isAssignedBlocker) {
          const removeAction = legalActions.find(
            (a): a is Extract<GameAction, { type: 'REMOVE_BLOCKER' }> =>
              a.type === 'REMOVE_BLOCKER' && a.blockerPermanentId === permanentId,
          );
          if (removeAction) {
            dispatch(removeAction, humanPlayer);
          }
          selectBlocker(null);
          selectAttacker(null);
          return;
        }

        // If attacker is already selected, assign immediately.
        if (selectedAttackerId && confirmedAttackers.includes(selectedAttackerId)) {
          const assignAction = legalActions.find(
            (a): a is Extract<GameAction, { type: 'ASSIGN_BLOCKER' }> =>
              a.type === 'ASSIGN_BLOCKER'
              && a.blockerPermanentId === permanentId
              && a.attackerPermanentId === selectedAttackerId,
          );
          if (assignAction) {
            dispatch(assignAction, humanPlayer);
            selectBlocker(null);
            selectAttacker(null);
            return;
          }
        }

        // With one attacker, blocker click can auto-assign.
        if (confirmedAttackers.length === 1) {
          const loneAttackerId = confirmedAttackers[0];
          const assignAction = legalActions.find(
            (a): a is Extract<GameAction, { type: 'ASSIGN_BLOCKER' }> =>
              a.type === 'ASSIGN_BLOCKER'
              && a.blockerPermanentId === permanentId
              && a.attackerPermanentId === loneAttackerId,
          );
          if (assignAction) {
            dispatch(assignAction, humanPlayer);
            selectBlocker(null);
            selectAttacker(null);
            return;
          }
        }

        // Otherwise select own creature as potential blocker.
        if (validBlockerIds.has(permanentId)) {
          selectBlocker(selectedBlockerId === permanentId ? null : permanentId);
          if (selectedBlockerId !== permanentId) {
            selectAttacker(null);
          }
        }
      } else {
        if (!confirmedAttackers.includes(permanentId)) return;

        // Clicking opponent (attacker) creature: assign block if we have a blocker selected
        if (selectedBlockerId && confirmedAttackers.includes(permanentId)) {
          const assignAction = legalActions.find(
            (a): a is Extract<GameAction, { type: 'ASSIGN_BLOCKER' }> =>
              a.type === 'ASSIGN_BLOCKER' &&
              a.blockerPermanentId === selectedBlockerId &&
              a.attackerPermanentId === permanentId,
          );
          if (assignAction) {
            dispatch(assignAction, humanPlayer);
            selectBlocker(null);
            selectAttacker(null);
          }
        } else {
          // Allow attacker-first selection flow.
          selectAttacker(selectedAttackerId === permanentId ? null : permanentId);
          selectBlocker(null);
        }
      }
      return;
    }
  };

  const handleEmptySlotClick = (slotIndex: number) => {
    // Play phase: place creature in empty slot
    if (isPlayPhase && isPlayerBoard && selectedHandIndex !== null) {
      const playAction = legalActions.find(
        (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
          a.type === 'PLAY_CARD' && a.cardIndex === selectedHandIndex && a.targetSlot === slotIndex,
      );
      if (playAction) {
        dispatch(playAction, humanPlayer);
        selectHandCard(null);
      }
    }
  };

  const slots = [...board];
  if (showPlusOnEmpty && !slots.some((slot) => slot === null)) {
    slots.push(null);
  }

  useLayoutEffect(() => {
    if (
      (phase?.type !== 'battle' || phase.step !== 'declare_blockers')
      && (selectedBlockerId !== null || selectedAttackerId !== null)
    ) {
      selectBlocker(null);
      selectAttacker(null);
    }
  }, [phase, selectedBlockerId, selectedAttackerId, selectBlocker, selectAttacker]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || slots.length === 0) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const baseWidth = Number.parseFloat(rootStyles.getPropertyValue('--board-card-width')) || 82;
    const baseHeight = Number.parseFloat(rootStyles.getPropertyValue('--board-card-height')) || 115;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setCardSize(
        calculateBoardCardSize({
          containerWidth: rect.width,
          containerHeight: rect.height,
          slotCount: slots.length,
          baseWidth,
          baseHeight,
        }),
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [slots.length]);

  const cardWidth = cardSize?.width;
  const cardHeight = cardSize?.height;

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-2 px-3 py-1 w-full h-full overflow-hidden">
      <AnimatePresence mode="popLayout">
      {slots.map((permanent, slotIndex) => {
        if (permanent) {
          const isAttacking = allAttackers.includes(permanent.permanentId);
          const isBlocking = allBlockerIds.has(permanent.permanentId);
          const isValidTarget = validTargetPermanentIds.has(permanent.permanentId);
          const isValidAttacker = validAttackerIds.has(permanent.permanentId) || undeclareAttackerIds.has(permanent.permanentId);
          const isValidBlocker = validBlockerIds.has(permanent.permanentId);
          const isSelectedForBlock =
            isBattlePhase
            && phase.step === 'declare_blockers'
            && (
              (isPlayerBoard && selectedBlockerId === permanent.permanentId)
              || (!isPlayerBoard && selectedAttackerId === permanent.permanentId)
            );

          return (
            <BoardCard
              key={permanent.permanentId}
              permanent={permanent}
              isAttacking={isAttacking}
              isBlocking={isBlocking}
              isValidTarget={isValidTarget}
              isValidAttacker={isValidAttacker}
              isValidBlocker={isValidBlocker}
              isSelectedForBlock={isSelectedForBlock}
              isOpponentCard={isOpponent}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onClick={() => handleCreatureClick(permanent.permanentId)}
              onLongPress={() => inspectCard(permanent.cardId)}
            />
          );
        }

        return (
          <div
            key={`empty-${slotIndex}`}
            className={`
              flex items-center justify-center rounded-xl transition-colors
              ${showPlusOnEmpty
                ? 'border-2 border-dashed border-green-500/30 cursor-pointer hover:border-green-400/50 hover:bg-green-900/10'
                : 'border border-dashed border-slate-700/30'
              }
              ${isOpponent ? 'cursor-default' : ''}
            `}
            style={{
              width: cardWidth ? `${cardWidth}px` : 'var(--board-card-width)',
              height: cardHeight ? `${cardHeight}px` : 'var(--board-card-height)',
            }}
            data-slot-index={slotIndex}
            data-board-player={playerId}
            onClick={() => handleEmptySlotClick(slotIndex)}
          >
            {showPlusOnEmpty && (
              <span className="text-green-500/30 text-lg select-none">+</span>
            )}
          </div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
