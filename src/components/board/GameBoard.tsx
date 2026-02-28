import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';
import { PlayerInfo } from './PlayerInfo';
import { CreatureSlots } from './CreatureSlots';
import { BattleLine } from './BattleLine';

export function GameBoard() {
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const state = useGameStore((s) => s.state);
  const opponentPlayer = getOpponent(humanPlayer);

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white/50">
        Waiting for game...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Opponent info */}
      <div className="flex justify-center">
        <PlayerInfo playerId={opponentPlayer} isOpponent />
      </div>

      {/* Opponent board */}
      <div className="flex-1 flex items-end justify-center">
        <CreatureSlots playerId={opponentPlayer} isOpponent />
      </div>

      {/* Battle line */}
      <BattleLine />

      {/* Player board */}
      <div className="flex-1 flex items-start justify-center">
        <CreatureSlots playerId={humanPlayer} isOpponent={false} />
      </div>

      {/* Player info + phase strip placeholder */}
      <div className="flex justify-center">
        <PlayerInfo playerId={humanPlayer} isOpponent={false} />
      </div>

      {/* Hand area placeholder */}
      <div className="h-[calc(var(--card-height)+1.5rem)] shrink-0" />
    </div>
  );
}
