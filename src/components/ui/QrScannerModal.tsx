import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameButtonClass } from './buttonStyles';
import { decodeQrFromFrame } from './qrScannerDecode';

type BarcodeDetectorResult = {
  rawValue?: string;
};

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<BarcodeDetectorResult[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title: string;
}

export function QrScannerModal({ open, onClose, onScan, title }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopScanning = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current !== null) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
    canvasRef.current = null;
    scannedRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanning();
      return;
    }

    let cancelled = false;

    const startScanning = async () => {
      setError(null);
      setReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is unavailable in this browser.');
        return;
      }

      try {
        const Detector = (window as WindowWithBarcodeDetector).BarcodeDetector;
        if (Detector) {
          try {
            detectorRef.current = new Detector({ formats: ['qr_code'] });
          } catch {
            detectorRef.current = null;
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = stream;
        canvasRef.current = document.createElement('canvas');

        const video = videoRef.current;
        if (!video) {
          stopScanning();
          setError('Unable to start camera preview.');
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setReady(true);

        const scanFrame = async () => {
          if (cancelled || scannedRef.current) return;
          const activeVideo = videoRef.current;
          const activeDetector = detectorRef.current;
          if (!activeVideo || !activeDetector) return;

          if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              let raw: string | null = null;

              if (activeDetector) {
                const results = await activeDetector.detect(activeVideo);
                raw = results.find((item) => item.rawValue?.trim())?.rawValue?.trim() ?? null;
              } else {
                const canvas = canvasRef.current;
                const width = activeVideo.videoWidth;
                const height = activeVideo.videoHeight;
                if (canvas && width > 0 && height > 0) {
                  canvas.width = width;
                  canvas.height = height;
                  const context = canvas.getContext('2d', { willReadFrequently: true });
                  if (context) {
                    context.drawImage(activeVideo, 0, 0, width, height);
                    const frame = context.getImageData(0, 0, width, height);
                    raw = decodeQrFromFrame(frame.data, frame.width, frame.height);
                  }
                }
              }

              if (raw) {
                scannedRef.current = true;
                stopScanning();
                onScan(raw);
                return;
              }
            } catch {
              // Keep scanning; detection can fail on some frames.
            }
          }

          rafRef.current = requestAnimationFrame(() => {
            void scanFrame();
          });
        };

        await scanFrame();
      } catch (err) {
        stopScanning();
        setError(err instanceof Error ? err.message : 'Failed to access camera.');
      }
    };

    void startScanning();

    return () => {
      cancelled = true;
      stopScanning();
    };
  }, [open, onScan, stopScanning]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4 flex flex-col items-center gap-4"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-white/55 text-sm text-center">Point your camera at your friend&apos;s QR code.</p>

            <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/15 bg-slate-900 relative">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
              {!ready && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
                  Starting camera...
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-red-300/90 text-center px-4">
                  {error}
                </div>
              )}
            </div>

            <button
              className={gameButtonClass({
                tone: 'neutral',
                size: 'sm',
                className: 'px-6 py-2 text-sm',
              })}
              onClick={() => {
                stopScanning();
                onClose();
              }}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
