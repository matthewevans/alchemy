import { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useGameStore } from '@game/gameStore';
import { loadGame, loadActiveGameId } from '@storage/persistence';
import { checkForServiceWorkerUpdate } from './pwa/registerServiceWorker';
import { consumeRecentAutoUpdateMarker } from './pwa/updateMarker';
import { router } from './router';
import './index.css';

const UPDATED_LABEL_MS = 4500;
const didAutoUpdate = consumeRecentAutoUpdateMarker();

function App() {
  const restoreGame = useGameStore((s) => s.restoreGame);
  const [showUpdatedLabel, setShowUpdatedLabel] = useState(didAutoUpdate);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const didRestore = useRef(false);

  // On cold start only, restore an in-progress game from localStorage
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    if (useGameStore.getState().gameId) return;

    const activeId = loadActiveGameId();
    if (!activeId) return;

    const saved = loadGame(activeId);
    if (saved) {
      restoreGame(saved.gameState, saved.rngState, saved.persisted);
      router.navigate(`/game/${activeId}`, { replace: true });
    }
  }, [restoreGame]);

  useEffect(() => {
    if (!showUpdatedLabel) return;

    const timeoutId = window.setTimeout(() => {
      setShowUpdatedLabel(false);
    }, UPDATED_LABEL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showUpdatedLabel]);

  const handleManualUpdateCheck = () => {
    const didCheck = checkForServiceWorkerUpdate();
    if (!didCheck) return;

    setIsCheckingUpdate(true);
    window.setTimeout(() => {
      setIsCheckingUpdate(false);
    }, 900);
  };

  return (
    <>
      <RouterProvider router={router} />
      <div className="fixed left-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[60]">
        <div className="rounded-md border border-slate-600/60 bg-slate-950/75 px-2 py-1 text-[10px] text-slate-300 shadow-lg shadow-black/40 backdrop-blur-sm flex items-center gap-1">
          <span>{`v${__APP_VERSION__}`}</span>
          <span className="text-slate-400">{__BUILD_HASH__}</span>
          <button
            type="button"
            onClick={handleManualUpdateCheck}
            className={`ml-1 text-slate-300/90 hover:text-white transition-colors cursor-pointer ${isCheckingUpdate ? 'animate-spin' : ''}`}
            aria-label="Check for updates"
            title="Check for updates"
          >
            ↻
          </button>
          {showUpdatedLabel && <span className="ml-1 text-emerald-300">updated</span>}
        </div>
      </div>
    </>
  );
}

export default App;
