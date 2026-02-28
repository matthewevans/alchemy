import { registerSW } from 'virtual:pwa-register';
import { markPendingAutoUpdate } from './updateMarker';

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
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });
}
