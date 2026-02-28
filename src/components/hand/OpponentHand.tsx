import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';
import { CardBack } from '@components/card/CardBack';

export function OpponentHand() {
  const opponentHandSize = useGameStore(
    (s) => s.state?.players[getOpponent(s.humanPlayer)].hand.length ?? 0,
  );

  if (opponentHandSize === 0) return null;

  const maxFanAngle = 12;
  const fanStep = opponentHandSize > 1 ? (maxFanAngle * 2) / (opponentHandSize - 1) : 0;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-start justify-center"
        style={{ height: 'calc(var(--card-height) * 0.45)' }}
      >
        {Array.from({ length: opponentHandSize }, (_, index) => {
          const angle = opponentHandSize > 1 ? -maxFanAngle + fanStep * index : 0;
          return (
            <div
              key={index}
              style={{
                transform: `rotate(${angle}deg)`,
                marginLeft: index === 0 ? 0 : 'calc(var(--card-width) * -0.55)',
                transformOrigin: 'bottom center',
                zIndex: index,
              }}
            >
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
                <CardBack />
              </div>
            </div>
          );
        })}
      </div>
      <span className="text-white/55 text-sm mt-0.5">
        {opponentHandSize} {opponentHandSize === 1 ? 'card' : 'cards'}
      </span>
    </div>
  );
}
