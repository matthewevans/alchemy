import type { Permanent } from '@engine/types';
import { BoardCard } from '@components/card';

const STACK_OFFSET = 8; // px offset between stacked cards

interface CardStackGroupProps {
  permanents: Permanent[];
  cardWidth?: number;
  cardHeight?: number;
  isOpponent: boolean;
  getCardProps: (permanent: Permanent) => {
    isAttacking: boolean;
    isBlocking: boolean;
    isValidTarget: boolean;
    isValidAttacker: boolean;
    isValidBlocker: boolean;
    isSelectedForBlock: boolean;
    onClick: () => void;
    onLongPress: () => void;
  };
}

export function CardStackGroup({
  permanents,
  cardWidth,
  cardHeight,
  isOpponent,
  getCardProps,
}: CardStackGroupProps) {
  const count = permanents.length;
  const effectiveWidth = (cardWidth ?? 82) + (count - 1) * STACK_OFFSET;

  return (
    <div
      className="relative"
      style={{
        width: `${effectiveWidth}px`,
        height: cardHeight ? `${cardHeight}px` : 'var(--board-card-height)',
      }}
    >
      {permanents.map((permanent, i) => {
        const props = getCardProps(permanent);
        return (
          <div
            key={permanent.permanentId}
            className="absolute top-0"
            style={{
              left: `${i * STACK_OFFSET}px`,
              zIndex: i,
            }}
          >
            <BoardCard
              permanent={permanent}
              isOpponentCard={isOpponent}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              {...props}
            />

            {/* Stack count badge on the front card */}
            {i === count - 1 && count > 1 && (
              <div
                className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-slate-900 border border-slate-500/50 text-white font-bold z-10 pointer-events-none"
                style={{
                  width: 'calc(var(--card-font-scale) * 0.8rem)',
                  height: 'calc(var(--card-font-scale) * 0.8rem)',
                  fontSize: 'calc(var(--card-font-scale) * 0.45rem)',
                }}
              >
                {count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
