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
  const maxHeight = Math.max(0, containerHeight * 0.94);
  const widthFromHeight = maxHeight / aspectRatio;
  const width = Math.max(20, Math.min(baseWidth, perSlotWidth, widthFromHeight));
  return { width, height: width * aspectRatio };
}

