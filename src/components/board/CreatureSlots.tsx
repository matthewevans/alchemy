import type { PlayerId } from '@engine/types';
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
  const selectedHandIndex = useUIStore((s) => s.selectedHandIndex);

  const isHumanTurn = activePlayer === humanPlayer;
  const isPlayerBoard = playerId === humanPlayer;
  const isPlayPhase = phase?.type === 'play';
  const showPlusOnEmpty = isPlayerBoard && isHumanTurn && isPlayPhase && selectedHandIndex !== null;

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

  const slots = Array.from({ length: maxBoardSize }, (_, i) => board[i] ?? null);

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1">
      {slots.map((permanent, slotIndex) => {
        if (permanent) {
          const isAttacking = allAttackers.includes(permanent.permanentId);
          const isBlocking = allBlockerIds.has(permanent.permanentId);

          return (
            <BoardCard
              key={permanent.permanentId}
              permanent={permanent}
              isAttacking={isAttacking}
              isBlocking={isBlocking}
              isValidTarget={false}
              isValidAttacker={false}
              isValidBlocker={false}
              onClick={() => {}}
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
