import { createRNG, type SeededRNG } from '@engine/prng';
import { TIER_CONFIGS } from '@engine/ruleset';
import type { Tier } from '@engine/types';
import { createAIConfig, type AIDifficulty } from '@engine/aiConfig';
import { ELEMENTS } from '@engine/elements';
import { STARTER_DECKS, buildStarterDeck } from '@engine/starterDecks';
import type { GameInitConfig } from '@engine/gameInit';
import type { AIConfig } from '@engine/aiConfig';
import type { GameSessionMeta } from '../sessionMeta';

interface InitGameFn {
  (
    config: GameInitConfig,
    humanPlayer: 'player1',
    aiConfig?: AIConfig,
    sessionMeta?: GameSessionMeta,
  ): string;
}

interface StartSinglePlayerGameInput {
  humanDeckIds: string[];
  tier: Tier;
  fallbackDifficulty: AIDifficulty;
  initGame: InitGameFn;
  navigate: (path: string) => void;
  seed?: number;
  opponent?: {
    deckIds: string[];
    difficulty: AIDifficulty;
  };
  sessionMeta?: GameSessionMeta;
}

function pickOpponentDeck(
  humanDeckIds: string[],
  tier: Tier,
  rng: SeededRNG,
): string[] {
  const humanElements = new Set<string>();
  for (const id of humanDeckIds) {
    humanElements.add(id.split('_')[0]);
  }

  const availableElements = ELEMENTS.filter((element) => !humanElements.has(element));
  const aiElement = availableElements[Math.floor(rng() * availableElements.length)] ?? ELEMENTS[0];
  const monoDecks = STARTER_DECKS.filter((deck) => deck.type === 'mono' && deck.elements[0] === aiElement);
  const starterDeck = monoDecks[Math.floor(rng() * monoDecks.length)] ?? STARTER_DECKS[0];

  return buildStarterDeck(starterDeck, tier);
}

export function startSinglePlayerGame(input: StartSinglePlayerGameInput): string {
  const seed = input.seed ?? Date.now();
  const rng = createRNG(seed);

  const aiDifficulty = input.opponent?.difficulty ?? input.fallbackDifficulty;
  const aiConfig = createAIConfig(aiDifficulty, rng);
  const aiDeck = input.opponent?.deckIds ?? pickOpponentDeck(input.humanDeckIds, input.tier, rng);

  const gameId = input.initGame(
    {
      ruleset: TIER_CONFIGS[input.tier],
      player1Deck: input.humanDeckIds,
      player2Deck: aiDeck,
      rng,
    },
    'player1',
    aiConfig,
    input.sessionMeta ?? { mode: 'quickplay' },
  );

  input.navigate(`/game/${gameId}`);
  return gameId;
}
