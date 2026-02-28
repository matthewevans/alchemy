import { registerSW } from 'virtual:pwa-register';
import { markPendingAutoUpdate } from './updateMarker';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

let isRegistered = false;
let manualCheckForUpdate: (() => void) | null = null;

export function checkForServiceWorkerUpdate(): boolean {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || !manualCheckForUpdate) {
    return false;
  }

  manualCheckForUpdate();
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
      markPendingAutoUpdate();
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) return;

      const checkForUpdate = () => {
        void swRegistration.update();
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
