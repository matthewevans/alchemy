import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface CodeQrDisplayProps {
  code: string;
  color?: 'amber' | 'blue';
}

const DARK_COLORS: Record<NonNullable<CodeQrDisplayProps['color']>, string> = {
  amber: '#fbbf24',
  blue: '#60a5fa',
};

export function CodeQrDisplay({ code, color = 'amber' }: CodeQrDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const generate = async () => {
      if (!code.trim()) {
        if (active) setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(code, {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 8,
          color: {
            dark: DARK_COLORS[color],
            light: '#0f172a',
          },
        });
        if (active) setQrDataUrl(dataUrl);
      } catch {
        if (active) setQrDataUrl(null);
      }
    };

    void generate();

    return () => {
      active = false;
    };
  }, [code, color]);

  return (
    <div className="flex flex-col items-center gap-2">
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt="QR code for multiplayer code"
          className="w-44 h-44 rounded-xl border border-white/10 bg-slate-900 p-2"
        />
      ) : (
        <div className="w-44 h-44 rounded-xl border border-white/10 bg-slate-900/70 flex items-center justify-center text-xs text-white/40">
          QR unavailable
        </div>
      )}
      <p className="text-white/40 text-xs text-center">Let your friend scan this instead of copy/paste.</p>
    </div>
  );
}
