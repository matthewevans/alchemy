import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsQR from 'jsqr';
import { decodeQrFromFrame } from './qrScannerDecode';

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

describe('decodeQrFromFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trimmed QR data when decode succeeds', () => {
    vi.mocked(jsQR).mockReturnValue({ data: '  abc123  ' } as ReturnType<typeof jsQR>);
    const data = new Uint8ClampedArray(4 * 10 * 10);

    const decoded = decodeQrFromFrame(data, 10, 10);
    expect(decoded).toBe('abc123');
  });

  it('returns null for empty frames', () => {
    const decoded = decodeQrFromFrame(new Uint8ClampedArray(), 0, 0);
    expect(decoded).toBeNull();
    expect(jsQR).not.toHaveBeenCalled();
  });

  it('returns null when decoder finds no QR', () => {
    vi.mocked(jsQR).mockReturnValue(null);
    const data = new Uint8ClampedArray(4 * 20 * 20);

    const decoded = decodeQrFromFrame(data, 20, 20);
    expect(decoded).toBeNull();
  });
});

