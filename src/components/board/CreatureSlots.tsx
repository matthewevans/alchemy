import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { GameAction, Permanent, Phase, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { useUIStore } from '@game/uiStore';
import { BoardCard } from '@components/card';
import { calculateBoardCardSize } from './boardSizing';
import { groupIntoStacks } from './boardStacking';
import { CardStackGroup } from './CardStackGroup';

interface CreatureSlotsProps {
  playerId: PlayerId;
  isOpponent: boolean;
}

/** Should this board fan out (show individual cards) rather than stacking? */
function shouldFanOut(
  phase: Phase | undefined,
  isPlayerBoard: boolean,
  humanPlayer: PlayerId,
  activePlayer: PlayerId | undefined,
): boolean {
  if (!phase) return false;

  // Targeting: both boards fan out so player can pick targets
  if (phase.type === 'targeting') return true;

  if (phase.type !== 'battle') return false;

  // Declare attackers: player's board fans out for attacker selection
  if (phase.step === 'declare_attackers' && isPlayerBoard) return true;

  // Declare blockers: both boards fan out (defender picks blockers, clicks attackers)
  if (phase.step === 'declare_blockers') {
    const defender = activePlayer ? getOpponent(activePlayer) : null;
    return humanPlayer === defender;
  }

  // Resolving: fan out so player can see individual combat
  if (phase.step === 'resolving') return true;

  return false;
}

export function CreatureSlots({ playerId, isOpponent }: CreatureSlotsProps) {
  const liveBoard = useGameStore((s) => s.state?.players[playerId].board ?? []);
  const boardSnapshot = useAnimationStore((s) => s.boardSnapshot);

  // Merge snapshot: fill null slots from pre-dispatch board so dying creatures
  // remain visible during combat animations preceding the death step.
  const board = useMemo(() => {
    if (!boardSnapshot) return liveBoard;
    const snapshot = boardSnapshot[playerId];
    if (!snapshot) return liveBoard;
    return liveBoard.map((slot, i) => slot ?? snapshot[i] ?? null);
  }, [liveBoard, boardSnapshot, playerId]);

  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameDispatch();
  const selectedBlockerId = useUIStore((s) => s.selectedBlockerId);
  const selectBlocker = useUIStore((s) => s.selectBlocker);
  const selectedAttackerId = useUIStore((s) => s.selectedAttackerId);
  const selectAttacker = useUIStore((s) => s.selectAttacker);
  const inspectCard = useUIStore((s) => s.inspectCard);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const boardScale = usePreferencesStore((s) => s.boardScale);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  const isPlayerBoard = playerId === humanPlayer;

  const isBattlePhase = phase?.type === 'battle';
  const tentativeAttackers = isBattlePhase && phase.step === 'declare_attackers' ? phase.tentativeAttackers : [];
  const confirmedAttackers = isBattlePhase && phase.step === 'declare_blockers' ? phase.confirmedAttackers : [];
  const resolvingAttackers = isBattlePhase && phase.step === 'resolving' ? phase.attackers : [];
  const allAttackers = [...tentativeAttackers, ...confirmedAttackers, ...resolvingAttackers];

  // During animation, only shift forward the creature whose combat_strike is playing
  const activeAttackerId = useAnimationStore((s) => {
    const step = s.activeStep;
    if (!step) return null;
    const strike = step.effects.find((e) => e.type === 'combat_strike');
    return strike && strike.type === 'combat_strike' ? strike.sourceId : null;
  });

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

  const creatures = useMemo(() => board.filter((p): p is Permanent => p !== null), [board]);

  const fanned = shouldFanOut(phase, isPlayerBoard, humanPlayer, activePlayer);
  const stacks = useMemo(() => fanned ? null : groupIntoStacks(creatures), [fanned, creatures]);

  // Visual slot count for sizing — stacks take fewer visual slots
  const visualSlotCount = stacks
    ? stacks.length
    : creatures.length;

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
    const container = layoutRef.current;
    if (!container || visualSlotCount === 0) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const baseWidth = (Number.parseFloat(rootStyles.getPropertyValue('--_board-w')) || 82) * boardScale;
    const baseHeight = (Number.parseFloat(rootStyles.getPropertyValue('--_board-h')) || 115) * boardScale;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setCardSize(
        calculateBoardCardSize({
          containerWidth: rect.width,
          containerHeight: rect.height,
          slotCount: visualSlotCount,
          baseWidth,
          baseHeight,
        }),
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [visualSlotCount, boardScale]);

  const cardWidth = cardSize?.width;
  const cardHeight = cardSize?.height;

  const getCardProps = (permanent: Permanent) => {
    // During combat animation, only the creature currently striking shifts forward
    const isAttacking = activeAttackerId
      ? permanent.permanentId === activeAttackerId
      : allAttackers.includes(permanent.permanentId);
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

    return {
      isAttacking,
      isBlocking,
      isValidTarget,
      isValidAttacker,
      isValidBlocker,
      isSelectedForBlock,
      onClick: () => handleCreatureClick(permanent.permanentId),
      onLongPress: () => inspectCard(permanent.cardId),
    };
  };

  return (
    <div
      ref={layoutRef}
      className="w-full h-full min-w-0 relative"
      data-board-player={playerId}
    >
      <div className="absolute inset-x-0 -top-8 -bottom-8 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-3 py-8 h-full w-fit mx-auto">
          <AnimatePresence mode="popLayout">
            {fanned || !stacks ? (
              creatures.map((permanent) => {
                const props = getCardProps(permanent);
                return (
                  <BoardCard
                    key={permanent.permanentId}
                    permanent={permanent}
                    isOpponentCard={isOpponent}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    {...props}
                  />
                );
              })
            ) : (
              stacks.map((entry) => {
                if (!entry) return null;

                if (entry.permanents.length === 1) {
                  const permanent = entry.permanents[0];
                  const props = getCardProps(permanent);
                  return (
                    <BoardCard
                      key={permanent.permanentId}
                      permanent={permanent}
                      isOpponentCard={isOpponent}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                      {...props}
                    />
                  );
                }

                return (
                  <CardStackGroup
                    key={`stack-${entry.stateKey}`}
                    permanents={entry.permanents}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    isOpponent={isOpponent}
                    getCardProps={getCardProps}
                  />
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
