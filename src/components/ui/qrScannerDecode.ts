import jsQR from 'jsqr';

export function decodeQrFromFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  if (width <= 0 || height <= 0 || data.length === 0) {
    return null;
  }

  const decoded = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  const value = decoded?.data?.trim();
  return value ? value : null;
}

