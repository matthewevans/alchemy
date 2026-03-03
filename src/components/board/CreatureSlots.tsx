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
import { sortCreaturesForBlockers } from './blockerSorting';
import { CardStackGroup } from './CardStackGroup';

interface CreatureSlotsProps {
  playerId: PlayerId;
  isOpponent: boolean;
}

const EMPTY_ATTACKER_IDS: string[] = [];
const EMPTY_BLOCKERS: Record<string, string> = {};

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

  // Order blockers: attacker chooses damage assignment order for multi-blocks.
  if (phase.step === 'order_blockers') {
    return humanPlayer === activePlayer;
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
  const tentativeAttackers = isBattlePhase && phase.step === 'declare_attackers'
    ? phase.tentativeAttackers
    : EMPTY_ATTACKER_IDS;
  const confirmedAttackers = isBattlePhase && (phase.step === 'declare_blockers' || phase.step === 'order_blockers')
    ? phase.confirmedAttackers
    : EMPTY_ATTACKER_IDS;
  const resolvingAttackers = isBattlePhase && phase.step === 'resolving'
    ? phase.attackers
    : EMPTY_ATTACKER_IDS;
  const allAttackers = useMemo(
    () => [...tentativeAttackers, ...confirmedAttackers, ...resolvingAttackers],
    [tentativeAttackers, confirmedAttackers, resolvingAttackers],
  );

  // During animation, only shift forward the creature whose combat_strike is playing
  const activeAttackerId = useAnimationStore((s) => {
    const step = s.activeStep;
    if (!step) return null;
    const strike = step.effects.find((e) => e.type === 'combat_strike');
    return strike && strike.type === 'combat_strike' ? strike.sourceId : null;
  });

  const tentativeBlockers = isBattlePhase && phase.step === 'declare_blockers'
    ? phase.tentativeBlockers
    : EMPTY_BLOCKERS;
  const orderedBlockers = isBattlePhase && phase.step === 'order_blockers'
    ? phase.blockers
    : EMPTY_BLOCKERS;
  const resolvingBlockers = isBattlePhase && phase.step === 'resolving'
    ? phase.blockers
    : EMPTY_BLOCKERS;
  const allBlockers = useMemo(
    () => ({
      ...tentativeBlockers,
      ...orderedBlockers,
      ...resolvingBlockers,
    }),
    [tentativeBlockers, orderedBlockers, resolvingBlockers],
  );
  const allBlockerIds = useMemo(
    () => new Set(Object.keys(allBlockers)),
    [allBlockers],
  );

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
  const validOrderableBlockerIds = new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'SET_BLOCKER_ORDER' }> => a.type === 'SET_BLOCKER_ORDER')
      .map((a) => a.blockerPermanentIds[0]),
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

    // Battle: attacker chooses multi-block order
    if (isBattlePhase && phase.step === 'order_blockers') {
      if (humanPlayer !== activePlayer) return;
      if (isPlayerBoard) return;

      const attackerId = phase.blockers[permanentId];
      if (!attackerId) return;
      const reorderAction = legalActions.find(
        (a): a is Extract<GameAction, { type: 'SET_BLOCKER_ORDER' }> =>
          a.type === 'SET_BLOCKER_ORDER'
          && a.attackerPermanentId === attackerId
          && a.blockerPermanentIds[0] === permanentId,
      );
      if (reorderAction) {
        dispatch(reorderAction, humanPlayer);
      }
      return;
    }
  };

  const rawCreatures = useMemo(() => board.filter((p): p is Permanent => p !== null), [board]);

  const fanned = shouldFanOut(phase, isPlayerBoard, humanPlayer, activePlayer);

  // During blocker declaration/order, reorder the defender's creatures so each blocker
  // sits opposite its assigned attacker, minimizing line crossings.
  const creatures = useMemo(() => {
    const isBlockerPlanningPhase =
      phase
      && phase.type === 'battle'
      && (phase.step === 'declare_blockers' || phase.step === 'order_blockers');
    if (!phase || !isBlockerPlanningPhase) {
      return rawCreatures;
    }

    const defender = getOpponent(activePlayer ?? humanPlayer);
    if (playerId !== defender) {
      return rawCreatures;
    }

    const opponentId = getOpponent(playerId);
    const opponentBoard = useGameStore.getState().state?.players[opponentId].board ?? [];
    const opponentCreatures = opponentBoard.filter((p): p is Permanent => p !== null);

    const attackerBlockerOrder = phase.step === 'order_blockers' ? phase.attackerBlockerOrder : undefined;
    return sortCreaturesForBlockers(
      rawCreatures,
      opponentCreatures,
      confirmedAttackers,
      allBlockers,
      attackerBlockerOrder,
    );
  }, [rawCreatures, phase, playerId, confirmedAttackers, allBlockers, activePlayer, humanPlayer]);

  const stacks = useMemo(() => fanned ? null : groupIntoStacks(creatures), [fanned, creatures]);
  const stackCount = stacks?.length ?? 0;
  const [stackingActive, setStackingActive] = useState(false);
  const prioritizedOrderBlockers = useMemo(
    () =>
      isBattlePhase && phase.step === 'order_blockers'
        ? new Set(
            Object.values(phase.attackerBlockerOrder)
              .map((order) => order[0])
              .filter((id): id is string => Boolean(id)),
          )
        : null,
    [isBattlePhase, phase],
  );

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
    if (!container || creatures.length === 0) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const baseWidth = (Number.parseFloat(rootStyles.getPropertyValue('--_board-w')) || 82) * boardScale;
    const baseHeight = (Number.parseFloat(rootStyles.getPropertyValue('--_board-h')) || 115) * boardScale;
    const minWidth = baseWidth * 0.7;
    const gap = 8; // gap-2

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const availableWidth = Math.max(0, rect.width - 24);

      // Only stack when individual cards would shrink below minimum size
      const unstackedPerSlot = creatures.length > 0
        ? (availableWidth - gap * (creatures.length - 1)) / creatures.length
        : baseWidth;
      const shouldStack = !fanned
        && stackCount > 0
        && stackCount < creatures.length
        && unstackedPerSlot < minWidth;

      setStackingActive(shouldStack);

      const slotCount = shouldStack ? stackCount : creatures.length;
      const nextSize = calculateBoardCardSize({
        containerWidth: rect.width,
        containerHeight: rect.height,
        slotCount: Math.max(slotCount, 1),
        baseWidth,
        baseHeight,
      });
      setCardSize((prev) => {
        if (
          prev
          && Math.abs(prev.width - nextSize.width) < 0.01
          && Math.abs(prev.height - nextSize.height) < 0.01
        ) {
          return prev;
        }
        return nextSize;
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [creatures.length, stackCount, fanned, boardScale]);

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
    const isValidBlocker = validBlockerIds.has(permanent.permanentId) || validOrderableBlockerIds.has(permanent.permanentId);
    const isSelectedForBlock =
      isBattlePhase
      && (phase.step === 'declare_blockers' || phase.step === 'order_blockers')
      && (
        (isPlayerBoard && selectedBlockerId === permanent.permanentId)
        || (!isPlayerBoard && selectedAttackerId === permanent.permanentId)
        || (phase.step === 'order_blockers' && Boolean(prioritizedOrderBlockers?.has(permanent.permanentId)))
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
            {fanned || !stackingActive || !stacks ? (
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
