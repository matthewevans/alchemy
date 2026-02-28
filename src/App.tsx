import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useGameStore } from '@game/gameStore';
import { loadGame, loadActiveGameId } from '@storage/persistence';
import { router } from './router';
import './index.css';

function App() {
  const restoreGame = useGameStore((s) => s.restoreGame);
  const gameId = useGameStore((s) => s.gameId);

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

  return <RouterProvider router={router} />;
}

export default App;
