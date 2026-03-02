export function calculateBoardCardSize({
  containerWidth,
  containerHeight,
  slotCount,
  baseWidth,
  baseHeight,
}: {
  containerWidth: number;
  containerHeight: number;
  slotCount: number;
  baseWidth: number;
  baseHeight: number;
}): { width: number; height: number } {
  const safeSlotCount = Math.max(slotCount, 1);
  const aspectRatio = baseHeight / baseWidth;
  const availableWidth = Math.max(0, containerWidth - 24);
  const perSlotWidth = (availableWidth - 8 * (safeSlotCount - 1)) / safeSlotCount;
  const maxHeight = Math.max(0, containerHeight * 0.85);
  const widthFromHeight = maxHeight / aspectRatio;
  // Cards fill available space when few, shrink naturally as more are added.
  // Cap at 2x base to prevent extreme sizing with a single creature.
  // Floor at 70% of base to keep cards readable — horizontal scroll handles overflow.
  const maxWidth = baseWidth * 2;
  const minWidth = baseWidth * 0.7;
  const width = Math.max(minWidth, Math.min(maxWidth, perSlotWidth, widthFromHeight));
  return { width, height: width * aspectRatio };
}

