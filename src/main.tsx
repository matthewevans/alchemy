import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { useGameStore } from '@game/gameStore'
import { useAnimationStore } from '@game/animationStore'
import { useUIStore } from '@game/uiStore'
import { setAIDelay } from '@game/controllers/aiController'

if (import.meta.env.DEV) {
  Object.assign(window, { __gameStore: useGameStore, __animationStore: useAnimationStore, __uiStore: useUIStore });

  if ((window as Window & { __CYPRESS?: boolean }).__CYPRESS) {
    useAnimationStore.getState().setSpeedMultiplier(0.05);
    setAIDelay(50);
    useUIStore.setState({ flashTurnBanner: () => {} });
  }
}

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
