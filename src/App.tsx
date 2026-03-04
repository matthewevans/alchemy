import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { checkForServiceWorkerUpdate } from './pwa/registerServiceWorker';
import { consumeRecentAutoUpdateMarker } from './pwa/updateMarker';
import {
  useUpdateStatus,
  useDownloadProgress,
  useUpdateError,
  getUpdateDebugReport,
} from './pwa/updateStatus';
import {
  ensureStartupAssetsPreloaded,
  subscribeStartupPreload,
  type StartupPreloadProgress,
} from './startup/preloadAssets';
import { router } from './router';
import './index.css';

const UPDATED_LABEL_MS = 4500;
const didAutoUpdate = consumeRecentAutoUpdateMarker();

const UPDATE_STATUS_LABELS: Record<string, string> = {
  checking: 'checking…',
  activating: 'updating…',
};

const INITIAL_STARTUP_PROGRESS: StartupPreloadProgress = {
  phase: 'discovering',
  loaded: 0,
  failed: 0,
  total: 0,
  percent: 0,
};

function App() {
  const [showUpdatedLabel, setShowUpdatedLabel] = useState(didAutoUpdate);
  const [startupProgress, setStartupProgress] = useState<StartupPreloadProgress>(INITIAL_STARTUP_PROGRESS);
  const updateStatus = useUpdateStatus();
  const downloadProgress = useDownloadProgress();
  const updateError = useUpdateError();

  useEffect(() => {
    if (!showUpdatedLabel) return;

    const timeoutId = window.setTimeout(() => {
      setShowUpdatedLabel(false);
    }, UPDATED_LABEL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showUpdatedLabel]);

  useEffect(() => {
    const unsubscribe = subscribeStartupPreload((progress) => {
      setStartupProgress(progress);
    });
    void ensureStartupAssetsPreloaded();
    return unsubscribe;
  }, []);

  const statusLabel = updateStatus === 'downloading'
    ? `downloading… ${downloadProgress}%`
    : (UPDATE_STATUS_LABELS[updateStatus] ?? null);
  const preloadLabel = startupProgress.phase === 'complete'
    ? null
    : startupProgress.phase === 'discovering'
      ? 'assets…'
      : `assets… ${startupProgress.percent}%`;
  const isActive = updateStatus !== 'idle';
  const isDownloading = updateStatus === 'downloading';
  const isPreloading = startupProgress.phase !== 'complete';
  const hasUpdateIssue = Boolean(updateError);

  const handleShowUpdateDebug = () => {
    const report = getUpdateDebugReport();
    window.alert(report);
  };

  return (
    <>
      <RouterProvider router={router} />
      <div className="version-badge fixed left-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[1]">
        <div className="relative rounded-md border border-slate-600/60 bg-slate-950/75 px-2 py-1 text-[10px] text-slate-300 shadow-lg shadow-black/40 backdrop-blur-sm flex items-center gap-1 overflow-hidden">
          <span>{`v${__APP_VERSION__}`}</span>
          <span className="text-slate-400">{__BUILD_HASH__}</span>
          <button
            type="button"
            onClick={checkForServiceWorkerUpdate}
            className={`ml-1 text-slate-300/90 hover:text-white transition-colors cursor-pointer ${isActive ? 'animate-spin' : ''}`}
            aria-label="Check for updates"
            title="Check for updates"
          >
            ↻
          </button>
          {hasUpdateIssue && (
            <button
              type="button"
              onClick={handleShowUpdateDebug}
              className="ml-1 rounded px-1 text-[11px] font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-600/25 transition-colors cursor-pointer"
              aria-label="Updater debug info"
              title={`Updater issue: ${updateError}`}
            >
              x
            </button>
          )}
          {statusLabel && <span className="ml-1 text-cyan-300">{statusLabel}</span>}
          {hasUpdateIssue && <span className="ml-1 text-rose-300">update issue</span>}
          {preloadLabel && <span className="ml-1 text-amber-300">{preloadLabel}</span>}
          {showUpdatedLabel && !statusLabel && <span className="ml-1 text-emerald-300">updated</span>}
          {isDownloading && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px]">
              <div
                className="h-full bg-cyan-400 transition-[width] duration-200 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
          {!isDownloading && isPreloading && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px]">
              <div
                className="h-full bg-amber-400 transition-[width] duration-200 ease-out"
                style={{ width: `${startupProgress.percent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
