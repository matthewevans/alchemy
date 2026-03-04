interface StartupLoadingOverlayProps {
  label: string;
  loaded: number;
  total: number;
  failed: number;
  percent: number;
}

export function StartupLoadingOverlay({
  label,
  loaded,
  total,
  failed,
  percent,
}: StartupLoadingOverlayProps) {
  const logoWordmarkSrc = `${import.meta.env.BASE_URL}logo_wordmark.webp`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/98 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/70 bg-slate-900/75 p-6 shadow-2xl shadow-black/70 backdrop-blur-sm">
        <div className="mb-5 flex justify-center">
          <img
            src={logoWordmarkSrc}
            alt="Alchemy"
            className="h-14 w-auto max-w-[80%]"
            draggable={false}
          />
        </div>

        <p className="text-center text-sm tracking-wide text-slate-300">{label}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width] duration-200 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          {loaded + failed}/{total || 0} assets
          {failed > 0 ? ` (${failed} failed)` : ''}
        </p>
      </div>
    </div>
  );
}
