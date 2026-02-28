import { registerSW } from 'virtual:pwa-register';

let isRegistered = false;

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || isRegistered) {
    return;
  }

  isRegistered = true;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });
}
