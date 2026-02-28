import type { GameAction, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { BoardCard } from '@components/card';

interface CreatureSlotsProps {
  playerId: PlayerId;
  isOpponent: boolean;
}

export function CreatureSlots({ playerId, isOpponent }: CreatureSlotsProps) {
  const board = useGameStore((s) => s.state?.players[playerId].board ?? []);
  const maxBoardSize = useGameStore((s) => s.state?.ruleset.maxBoardSize ?? 5);
  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameStore((s) => s.dispatch);
  const selectedHandIndex = useUIStore((s) => s.selectedHandIndex);
  const selectHandCard = useUIStore((s) => s.selectHandCard);
  const selectedBlockerId = useUIStore((s) => s.selectedBlockerId);
  const selectBlocker = useUIStore((s) => s.selectBlocker);

  const isPlayerBoard = playerId === humanPlayer;
  const isPlayPhase = phase?.type === 'play';
  const showPlusOnEmpty = isPlayerBoard && activePlayer === humanPlayer && isPlayPhase && selectedHandIndex !== null;

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
        // Clicking own creature: select as potential blocker
        if (validBlockerIds.has(permanentId)) {
          selectBlocker(selectedBlockerId === permanentId ? null : permanentId);
        }
      } else {
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
          }
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

  const slots = Array.from({ length: maxBoardSize }, (_, i) => board[i] ?? null);

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1">
      {slots.map((permanent, slotIndex) => {
        if (permanent) {
          const isAttacking = allAttackers.includes(permanent.permanentId);
          const isBlocking = allBlockerIds.has(permanent.permanentId);
          const isValidTarget = validTargetPermanentIds.has(permanent.permanentId);
          const isValidAttacker = validAttackerIds.has(permanent.permanentId) || undeclareAttackerIds.has(permanent.permanentId);
          const isValidBlocker = validBlockerIds.has(permanent.permanentId);

          return (
            <BoardCard
              key={permanent.permanentId}
              permanent={permanent}
              isAttacking={isAttacking}
              isBlocking={isBlocking}
              isValidTarget={isValidTarget}
              isValidAttacker={isValidAttacker}
              isValidBlocker={isValidBlocker}
              onClick={() => handleCreatureClick(permanent.permanentId)}
            />
          );
        }

        return (
          <div
            key={`empty-${slotIndex}`}
            className={`
              flex items-center justify-center rounded-lg
              border-2 border-dashed border-slate-600/40
              ${showPlusOnEmpty ? 'border-green-500/40 cursor-pointer hover:border-green-400/60 hover:bg-green-900/10' : ''}
              ${isOpponent ? 'cursor-default' : ''}
            `}
            style={{
              width: 'var(--board-card-width)',
              height: 'var(--board-card-height)',
            }}
            onClick={() => handleEmptySlotClick(slotIndex)}
          >
            {showPlusOnEmpty && (
              <span className="text-green-500/40 text-xl select-none">+</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
