import { registerSW } from 'virtual:pwa-register';
import { markPendingAutoUpdate } from './updateMarker';
import { setUpdateStatus, getUpdateStatus } from './updateStatus';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

let isRegistered = false;
let manualCheckForUpdate: (() => Promise<void>) | null = null;

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

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            setUpdateStatus('activating');
          }
        });
      });

      const checkForUpdate = () => {
        return swRegistration.update().then(() => {});
      };
      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return;
        checkForUpdate();
      };

      manualCheckForUpdate = checkForUpdate;
      checkForUpdate();
      const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      window.addEventListener(
        'beforeunload',
        () => {
          window.clearInterval(intervalId);
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
