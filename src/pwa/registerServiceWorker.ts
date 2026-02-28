import { registerSW } from 'virtual:pwa-register';
import { markPendingAutoUpdate } from './updateMarker';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let isRegistered = false;

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || isRegistered) {
    return;
  }

  isRegistered = true;

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

      checkForUpdate();
      const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

      window.addEventListener(
        'beforeunload',
        () => {
          window.clearInterval(intervalId);
        },
        { once: true },
      );
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });
}
