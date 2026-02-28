import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useGameStore } from '@game/gameStore';
import { loadGame, loadActiveGameId } from '@storage/persistence';
import { consumeRecentAutoUpdateMarker } from './pwa/updateMarker';
import { router } from './router';
import './index.css';

const UPDATED_LABEL_MS = 4500;
const didAutoUpdate = consumeRecentAutoUpdateMarker();

function App() {
  const restoreGame = useGameStore((s) => s.restoreGame);
  const gameId = useGameStore((s) => s.gameId);
  const [showUpdatedLabel, setShowUpdatedLabel] = useState(didAutoUpdate);

  // On mount, if there's an active game but store is empty, restore + navigate
  useEffect(() => {
    if (gameId) return; // Already loaded

    const activeId = loadActiveGameId();
    if (!activeId) return;

    const saved = loadGame(activeId);
    if (saved) {
      restoreGame(saved.gameState, saved.rngState, saved.persisted);
      // GamePage will pick this up via store and set up controller
      router.navigate(`/game/${activeId}`, { replace: true });
    }
  }, [restoreGame, gameId]);

  useEffect(() => {
    if (!showUpdatedLabel) return;

    const timeoutId = window.setTimeout(() => {
      setShowUpdatedLabel(false);
    }, UPDATED_LABEL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showUpdatedLabel]);

  return (
    <>
      <RouterProvider router={router} />
      <div className="fixed right-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[60] pointer-events-none">
        <div className="rounded-md border border-slate-600/60 bg-slate-950/75 px-2 py-1 text-[10px] text-slate-300 shadow-lg shadow-black/40 backdrop-blur-sm">
          <span>{`v${__APP_VERSION__}`}</span>
          <span className="ml-1 text-slate-400">{__BUILD_HASH__}</span>
          {showUpdatedLabel && <span className="ml-2 text-emerald-300">updated</span>}
        </div>
      </div>
    </>
  );
}

export default App;
