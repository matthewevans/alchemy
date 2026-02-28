import { useState, useCallback, useEffect } from 'react';
import type { PlayerId } from '@engine/types';
import { createRNG } from '@engine/prng';
import { TIER_CONFIGS } from '@engine/ruleset';
import { ELEMENTS } from '@engine/elements';
import { getCardsByElement } from '@engine/cards';
import { useGameStore } from '@game/gameStore';
import { useGameLoop } from '@hooks/useGameLoop';
import { loadGame, clearSavedGame, saveHistoryEntry } from '@storage/persistence';
import { TitleScreen, DeckSelector, DeckBuilder, GameOverScreen, MulliganOverlay } from '@components/ui';
import { GameBoard } from '@components/board';
import './index.css';

type AppScreen = 'title' | 'deck_select' | 'deck_builder' | 'playing' | 'game_over';

function PlayingScreen({ onGameOver }: { onGameOver: (winner: PlayerId) => void }) {
  useGameLoop();

  const phase = useGameStore((s) => s.state?.phase);

  // Detect game_over and notify parent
  if (phase?.type === 'game_over') {
    // Use a microtask to avoid updating parent during render
    queueMicrotask(() => onGameOver(phase.winner));
  }

  return (
    <>
      <GameBoard />
      <MulliganOverlay />
    </>
  );
}

function App() {
  const [screen, setScreen] = useState<AppScreen>('title');
  const [gameOverWinner, setGameOverWinner] = useState<PlayerId>('player1');

  const initGame = useGameStore((s) => s.initGame);
  const restoreGame = useGameStore((s) => s.restoreGame);
  const resetGame = useGameStore((s) => s.reset);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const player1DeckIds = useGameStore((s) => s.player1DeckIds);
  const player2DeckIds = useGameStore((s) => s.player2DeckIds);
  const turn = useGameStore((s) => s.state?.turn ?? 0);

  // Restore saved game on mount
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      restoreGame(saved.gameState, saved.rngState, saved.persisted);
      setScreen('playing');
    }
  }, [restoreGame]);

  const handlePlay = useCallback(() => {
    setScreen('deck_select');
  }, []);

  const handleDeckBuilder = useCallback(() => {
    setScreen('deck_builder');
  }, []);

  const handleSelectDeck = useCallback(
    (deckCardIds: string[]) => {
      // Determine human's element(s) from the chosen deck card IDs
      const humanElements = new Set<string>();
      for (const id of deckCardIds) {
        const el = id.split('_')[0];
        humanElements.add(el);
      }
      // Pick a random mono deck for the AI, different from the human's element(s)
      const rng = createRNG(Date.now());
      const availableElements = ELEMENTS.filter((el) => !humanElements.has(el));
      const aiElement = availableElements[Math.floor(rng() * availableElements.length)];
      const aiCards = getCardsByElement(aiElement);
      const aiDeck = aiCards.flatMap((c) => [c.id, c.id]); // mono deck: 2 copies each

      initGame(
        {
          ruleset: TIER_CONFIGS.apprentice,
          player1Deck: deckCardIds,
          player2Deck: aiDeck,
          rng,
        },
        'player1',
      );

      setScreen('playing');
    },
    [initGame],
  );

  const handleBack = useCallback(() => {
    setScreen('title');
  }, []);

  const handleGameOver = useCallback(
    (winner: PlayerId) => {
      setGameOverWinner(winner);
      setScreen('game_over');

      clearSavedGame();
      saveHistoryEntry({
        id: crypto.randomUUID(),
        playedAt: Date.now(),
        outcome: winner === humanPlayer ? 'win' : 'loss',
        humanPlayer,
        player1DeckIds,
        player2DeckIds,
        turns: turn,
      });
    },
    [humanPlayer, player1DeckIds, player2DeckIds, turn],
  );

  const handlePlayAgain = useCallback(() => {
    resetGame();
    setScreen('deck_select');
  }, [resetGame]);

  const handleMainMenu = useCallback(() => {
    resetGame();
    setScreen('title');
  }, [resetGame]);

  switch (screen) {
    case 'title':
      return <TitleScreen onPlay={handlePlay} onDeckBuilder={handleDeckBuilder} />;
    case 'deck_select':
      return <DeckSelector onSelectDeck={handleSelectDeck} onBack={handleBack} />;
    case 'deck_builder':
      return <DeckBuilder onSelectDeck={handleSelectDeck} onBack={handleBack} />;
    case 'playing':
      return <PlayingScreen onGameOver={handleGameOver} />;
    case 'game_over':
      return (
        <GameOverScreen
          winner={gameOverWinner}
          humanPlayer="player1"
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      );
  }
}

export default App;
