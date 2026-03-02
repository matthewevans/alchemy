import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameAction, Permanent, Phase, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
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

  const handleEmptySlotClick = (slotIndex: number) => {
    // Play phase: place creature in empty slot or cast spell
    if (isPlayPhase && isPlayerBoard && selectedHandIndex !== null) {
      const playAction = legalActions.find(
        (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
          a.type === 'PLAY_CARD' && a.cardIndex === selectedHandIndex && a.targetSlot === slotIndex,
      );
      if (playAction) {
        dispatch(playAction, humanPlayer);
        selectHandCard(null);
        return;
      }
      // Spell cast — spells have no targetSlot, so any slot click triggers them
      const spellAction = legalActions.find(
        (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
          a.type === 'PLAY_CARD' && a.cardIndex === selectedHandIndex && a.targetSlot === undefined,
      );
      if (spellAction) {
        dispatch(spellAction, humanPlayer);
        selectHandCard(null);
      }
    }
  };

  const slots = useMemo(() => {
    const s = [...board];
    if (showPlusOnEmpty && !s.some((slot) => slot === null)) {
      s.push(null);
    }
    return s;
  }, [board, showPlusOnEmpty]);

  const fanned = shouldFanOut(phase, isPlayerBoard, humanPlayer, activePlayer);
  const stacks = useMemo(() => fanned ? null : groupIntoStacks(slots), [fanned, slots]);

  // Visual slot count for sizing — stacks take fewer visual slots
  const visualSlotCount = stacks
    ? stacks.length
    : slots.length;

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
    if (!container || visualSlotCount === 0) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const uiScale = Number.parseFloat(rootStyles.getPropertyValue('--ui-scale')) || 1;
    const baseWidth = (Number.parseFloat(rootStyles.getPropertyValue('--_board-w')) || 82) * uiScale;
    const baseHeight = (Number.parseFloat(rootStyles.getPropertyValue('--_board-h')) || 115) * uiScale;

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
  }, [visualSlotCount]);

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

  const renderEmptySlot = (slotIndex: number) => {
    if (showPlusOnEmpty) {
      return (
        <motion.div
          key={`empty-${slotIndex}`}
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-green-500/40 cursor-pointer"
          style={{
            width: cardWidth ? `${cardWidth}px` : 'var(--board-card-width)',
            height: cardHeight ? `${cardHeight}px` : 'var(--board-card-height)',
          }}
          animate={{
            borderColor: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.6)', 'rgba(34, 197, 94, 0.3)'],
            boxShadow: [
              'inset 0 0 12px rgba(34, 197, 94, 0.05)',
              'inset 0 0 20px rgba(34, 197, 94, 0.15)',
              'inset 0 0 12px rgba(34, 197, 94, 0.05)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', scale: 1.02 }}
          data-slot-index={slotIndex}
          data-board-player={playerId}
          onClick={() => handleEmptySlotClick(slotIndex)}
        >
          <motion.span
            className="text-green-400/40 text-xl font-bold select-none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            +
          </motion.span>
        </motion.div>
      );
    }

    return (
      <div
        key={`empty-${slotIndex}`}
        className={`
          flex items-center justify-center rounded-xl border border-dashed border-slate-700/30
          ${isOpponent ? 'cursor-default' : ''}
        `}
        style={{
          width: cardWidth ? `${cardWidth}px` : 'var(--board-card-width)',
          height: cardHeight ? `${cardHeight}px` : 'var(--board-card-height)',
        }}
        data-slot-index={slotIndex}
        data-board-player={playerId}
        onClick={() => handleEmptySlotClick(slotIndex)}
      />
    );
  };

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-2 px-3 py-1 w-full h-full overflow-hidden">
      <AnimatePresence mode="popLayout">
        {fanned || !stacks ? (
          // Fanned: render individual cards (used during combat/targeting)
          slots.map((permanent, slotIndex) => {
            if (permanent) {
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
            return renderEmptySlot(slotIndex);
          })
        ) : (
          // Stacked: group identical permanents
          stacks.map((entry, stackIndex) => {
            if (!entry) {
              return renderEmptySlot(entry === null && stackIndex < slots.length ? stackIndex : stackIndex);
            }

            if (entry.permanents.length === 1) {
              // Single card — render as normal BoardCard
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

            // Multi-card stack
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
  );
}
