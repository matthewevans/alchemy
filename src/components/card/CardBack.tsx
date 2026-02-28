interface CardBackProps {
  size?: 'hand' | 'board';
}

export function CardBack({ size = 'hand' }: CardBackProps) {
  const isHand = size === 'hand';
  const cardBackSrc = `${import.meta.env.BASE_URL}cardback.webp`;

  return (
    <div
      className="relative rounded-xl overflow-hidden select-none shadow-lg shadow-black/40"
      style={{
        width: isHand ? 'var(--card-width)' : 'var(--board-card-width)',
        height: isHand ? 'var(--card-height)' : 'var(--board-card-height)',
      }}
    >
      <img
        src={cardBackSrc}
        alt="Card back"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
