import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerId } from '@engine/types';
import { createRNG } from '@engine/prng';
import { TIER_CONFIGS } from '@engine/ruleset';
import { ELEMENTS } from '@engine/elements';
import { getCardsByElement } from '@engine/cards';
import { useGameStore } from '@game/gameStore';
import { clearSavedGame } from '@storage/persistence';
import type { PeerSession } from '@network/peer';
import { TitleScreen, DeckSelector, DeckBuilder, MultiplayerLobby } from '@components/ui';

type SubScreen = 'title' | 'deck_select' | 'deck_builder' | 'multiplayer_lobby';

export function HomePage() {
  const [subScreen, setSubScreen] = useState<SubScreen>('title');
  const navigate = useNavigate();
  const initGame = useGameStore((s) => s.initGame);

  const handlePlay = useCallback(() => {
    setSubScreen('deck_select');
  }, []);

  const handleMultiplayer = useCallback(() => {
    setSubScreen('multiplayer_lobby');
  }, []);

  const handleDeckBuilder = useCallback(() => {
    setSubScreen('deck_builder');
  }, []);

  const handleBack = useCallback(() => {
    setSubScreen('title');
  }, []);

  const handleSelectDeck = useCallback(
    (deckCardIds: string[]) => {
      const humanElements = new Set<string>();
      for (const id of deckCardIds) {
        humanElements.add(id.split('_')[0]);
      }
      const rng = createRNG(Date.now());
      const availableElements = ELEMENTS.filter((el) => !humanElements.has(el));
      const aiElement = availableElements[Math.floor(rng() * availableElements.length)];
      const aiCards = getCardsByElement(aiElement);
      const aiDeck = aiCards.flatMap((c) => [c.id, c.id]);

      const gameId = initGame(
        {
          ruleset: TIER_CONFIGS.apprentice,
          player1Deck: deckCardIds,
          player2Deck: aiDeck,
          rng,
        },
        'player1',
      );

      navigate(`/game/${gameId}`);
    },
    [initGame, navigate],
  );

  const handleMultiplayerStart = useCallback(
    (session: PeerSession, isHost: boolean, localDeckIds: string[], remoteDeckIds: string[], seed: number) => {
      const player1Deck = isHost ? localDeckIds : remoteDeckIds;
      const player2Deck = isHost ? remoteDeckIds : localDeckIds;
      const localPlayer: PlayerId = isHost ? 'player1' : 'player2';

      const rng = createRNG(seed);

      const gameId = initGame(
        {
          ruleset: TIER_CONFIGS.apprentice,
          player1Deck,
          player2Deck,
          rng,
        },
        localPlayer,
      );

      // Multiplayer games aren't persisted across refresh
      clearSavedGame(gameId);

      navigate(`/game/${gameId}`, { state: { session, isMultiplayer: true } });
    },
    [initGame, navigate],
  );

  switch (subScreen) {
    case 'title':
      return <TitleScreen onPlay={handlePlay} onMultiplayer={handleMultiplayer} onDeckBuilder={handleDeckBuilder} />;
    case 'deck_select':
      return <DeckSelector onSelectDeck={handleSelectDeck} onBack={handleBack} />;
    case 'deck_builder':
      return <DeckBuilder onSelectDeck={handleSelectDeck} onBack={handleBack} />;
    case 'multiplayer_lobby':
      return <MultiplayerLobby onStartGame={handleMultiplayerStart} onBack={handleBack} />;
  }
}
