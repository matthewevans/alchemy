import type { Permanent } from '@engine/types';
import { BoardCard } from '@components/card';

const STACK_OFFSET_X = 8; // px horizontal offset between stacked cards
const STACK_OFFSET_Y = 4; // px vertical offset between stacked cards

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
  const effectiveWidth = (cardWidth ?? 82) + (count - 1) * STACK_OFFSET_X;

  return (
    <div
      className="relative"
      style={{
        width: `${effectiveWidth}px`,
        height: cardHeight
          ? `${cardHeight + (count - 1) * STACK_OFFSET_Y}px`
          : `calc(var(--board-card-height) + ${(count - 1) * STACK_OFFSET_Y}px)`,
      }}
    >
      {permanents.map((permanent, i) => {
        const props = getCardProps(permanent);
        return (
          <div
            key={permanent.permanentId}
            className="absolute"
            style={{
              left: `${i * STACK_OFFSET_X}px`,
              top: `${i * STACK_OFFSET_Y}px`,
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
                className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-amber-500 border-2 border-amber-300 text-black font-black z-10 pointer-events-none shadow-lg shadow-amber-500/40"
                style={{
                  width: 'calc(var(--card-font-scale) * 1.3rem)',
                  height: 'calc(var(--card-font-scale) * 1.3rem)',
                  fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
                }}
              >
                {count}×
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
