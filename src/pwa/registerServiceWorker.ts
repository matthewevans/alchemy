import { registerSW } from 'virtual:pwa-register';
import { usePreferencesStore } from '@game/preferencesStore';
import { markPendingAutoUpdate } from './updateMarker';
import { setUpdateStatus, getUpdateStatus, setDownloadProgress } from './updateStatus';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

/** Simulated progress: ticks every 200ms, decelerating toward 95%. */
const PROGRESS_TICK_MS = 200;
const PROGRESS_RATE = 0.08;
const PROGRESS_CEILING = 95;

let isRegistered = false;
let manualCheckForUpdate: (() => Promise<void>) | null = null;
let progressIntervalId: number | null = null;
let simulatedProgress = 0;

function startProgressSimulation() {
  stopProgressSimulation();
  simulatedProgress = 0;
  setDownloadProgress(0);
  progressIntervalId = window.setInterval(() => {
    simulatedProgress += (PROGRESS_CEILING - simulatedProgress) * PROGRESS_RATE;
    setDownloadProgress(simulatedProgress);
  }, PROGRESS_TICK_MS);
}

function stopProgressSimulation() {
  if (progressIntervalId !== null) {
    window.clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
}

function completeProgress() {
  stopProgressSimulation();
  setDownloadProgress(100);
}

export function checkForServiceWorkerUpdate(): boolean {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || !manualCheckForUpdate) {
    return false;
  }

  setUpdateStatus('checking');
  manualCheckForUpdate().then(() => {
    // If status is still 'checking' after the update() promise resolves,
    // no new SW was found — reset to idle.
    if (getUpdateStatus() === 'checking') {
      setUpdateStatus('idle');
    }
  });
  return true;
}

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || isRegistered) {
    return;
  }

  isRegistered = true;
  let hasReloadedOnControllerChange = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloadedOnControllerChange) return;
    hasReloadedOnControllerChange = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      completeProgress();
      setUpdateStatus('activating');
      markPendingAutoUpdate();
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) return;

      // Surface the download phase — fires when a new SW starts installing
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        if (!newWorker) return;
        setUpdateStatus('downloading');
        startProgressSimulation();

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            completeProgress();
            setUpdateStatus('activating');
          }
        });
      });

      // Manual checks always go through; auto checks respect the preference.
      const doUpdate = () => swRegistration.update().then(() => {});
      const autoCheck = () => {
        if (!usePreferencesStore.getState().autoUpdateEnabled) return Promise.resolve();
        return doUpdate();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return;
        autoCheck();
      };

      manualCheckForUpdate = doUpdate;
      autoCheck();
      const intervalId = window.setInterval(autoCheck, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      window.addEventListener(
        'beforeunload',
        () => {
          window.clearInterval(intervalId);
          stopProgressSimulation();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          manualCheckForUpdate = null;
        },
        { once: true },
      );
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });
}
