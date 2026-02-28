import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';
import { PlayerInfo } from './PlayerInfo';
import { CreatureSlots } from './CreatureSlots';
import { BattleLine } from './BattleLine';
import { PlayerHand, OpponentHand } from '@components/hand';
import { CombatControls } from '@components/combat';
import { PhaseStrip, TurnBanner } from '@components/phase';

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
          <div className="flex-1 flex items-start justify-center pt-1 min-h-0">
            <CreatureSlots playerId={humanPlayer} isOpponent={false} />
          </div>
        </div>

        {/* Right sidebar — MTGA-style avatar panels */}
        <div className="shrink-0 w-16 flex flex-col justify-between border-l border-white/5 bg-slate-950/50">
          <PlayerInfo playerId={opponentPlayer} isOpponent />
          <PlayerInfo playerId={humanPlayer} isOpponent={false} />
        </div>
      </div>

      {/* ═══ Player hand — bottom edge ═══ */}
      <div className="shrink-0">
        <PlayerHand />
      </div>

      {/* Turn banner overlay */}
      <TurnBanner />
    </div>
  );
}
