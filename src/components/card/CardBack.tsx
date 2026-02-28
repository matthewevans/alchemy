interface CardBackProps {
  size?: 'hand' | 'board';
}

export function CardBack({ size = 'hand' }: CardBackProps) {
  const isHand = size === 'hand';

  return (
    <div
      className="relative rounded-xl overflow-hidden select-none shadow-lg shadow-black/40"
      style={{
        width: isHand ? 'var(--card-width)' : 'var(--board-card-width)',
        height: isHand ? 'var(--card-height)' : 'var(--board-card-height)',
      }}
    >
      <img
        src="/cardback.png"
        alt="Card back"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
