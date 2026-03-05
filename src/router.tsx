import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { AdventurePage } from './pages/AdventurePage';
import { AdventureDeckSelectPage } from './pages/AdventureDeckSelectPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/adventure', element: <AdventurePage /> },
  { path: '/adventure/deck-select/:nodeId', element: <AdventureDeckSelectPage /> },
  { path: '/game/:id', element: <GamePage /> },
], {
  basename: import.meta.env.BASE_URL,
});
