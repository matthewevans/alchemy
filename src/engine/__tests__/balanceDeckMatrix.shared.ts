import { simulateMatchup } from '../simulate';
import { STARTER_DECKS, buildStarterDeck } from '../starterDecks';
import type { AIConfig } from '../aiConfig';
import type { Tier } from '../types';

export const GAMES_PER_MATCHUP = Number(import.meta.env['BALANCE_GAMES_PER_MATCHUP'] ?? '12');
export const MAX_STEPS_PER_GAME = Number(import.meta.env['BALANCE_MAX_STEPS'] ?? '1000');
export const BALANCE_DEBUG = import.meta.env['BALANCE_DEBUG_MATRIX'] === '1';

// Guardrails are intentionally broad enough for deterministic CI stability.
// Tighten these as balance improves.
export const TIER_GUARDRAILS: Record<Tier, {
  minDrawRate: number;
  maxDrawRate: number;
  minAvgTurns: number;
  maxAvgTurns: number;
  maxSpread: number;
}> = {
  apprentice: {
    minDrawRate: 0,
    maxDrawRate: 0.2,
    minAvgTurns: 18,
    maxAvgTurns: 45,
    maxSpread: 0.85,
  },
  alchemist: {
    minDrawRate: 0,
    maxDrawRate: 0.15,
    minAvgTurns: 25,
    maxAvgTurns: 55,
    maxSpread: 0.8,
  },
  archmage: {
    minDrawRate: 0,
    maxDrawRate: 0.15,
    minAvgTurns: 25,
    maxAvgTurns: 55,
    maxSpread: 0.9,
  },
};

const BALANCE_AI_CONFIG: AIConfig = {
  difficulty: 'very_hard',
  personality: 'balanced',
  policy: 'tree_search',
  temperature: 0.08,
  playLookahead: true,
  combatLookahead: true,
  search: {
    enabled: true,
    maxDepth: 2,
    maxNodes: 24,
    maxBranching: 4,
    rolloutDepth: 1,
    useTransposition: true,
  },
  weights: {
    health: 1,
    aggression: 1,
    boardPresence: 1,
    boardPower: 1,
    boardDurability: 1,
    handSize: 0.8,
  },
};

export interface TierSummary {
  tier: Tier;
  drawRate: number;
  avgTurns: number;
  spread: number;
  deckWinRates: Record<string, number>;
  deckDecidedGames: Record<string, number>;
}

export function assertValidSimulationKnobs() {
  if (!Number.isInteger(GAMES_PER_MATCHUP) || GAMES_PER_MATCHUP <= 0) {
    throw new Error(`BALANCE_GAMES_PER_MATCHUP must be a positive integer, got: ${GAMES_PER_MATCHUP}`);
  }

  if (!Number.isInteger(MAX_STEPS_PER_GAME) || MAX_STEPS_PER_GAME < 100) {
    throw new Error(`BALANCE_MAX_STEPS must be an integer >= 100, got: ${MAX_STEPS_PER_GAME}`);
  }
}

export function runTierMatrix(tier: Tier): TierSummary {
  const decks = STARTER_DECKS.map((deck) => ({
    name: deck.name,
    cards: buildStarterDeck(deck, tier),
  }));

  const deckWins = Object.fromEntries(decks.map((deck) => [deck.name, 0])) as Record<string, number>;
  const deckDecidedGames = Object.fromEntries(decks.map((deck) => [deck.name, 0])) as Record<string, number>;

  let draws = 0;
  let totalGames = 0;
  let totalTurns = 0;

  const tierSeedOffset = tier === 'apprentice' ? 0 : tier === 'alchemist' ? 100_000 : 200_000;

  for (let i = 0; i < decks.length; i++) {
    for (let j = i + 1; j < decks.length; j++) {
      const deckA = decks[i];
      const deckB = decks[j];
      const stats = simulateMatchup(
        deckA.cards,
        deckB.cards,
        {
          tier,
          aiConfig: BALANCE_AI_CONFIG,
          maxSteps: MAX_STEPS_PER_GAME,
        },
        GAMES_PER_MATCHUP,
        500_000 + tierSeedOffset + i * 1000 + j * 17,
      );

      const decided = stats.deck1Wins + stats.deck2Wins;
      draws += stats.draws;
      totalGames += stats.games;
      totalTurns += stats.avgTurns * stats.games;

      deckWins[deckA.name] += stats.deck1Wins;
      deckWins[deckB.name] += stats.deck2Wins;
      deckDecidedGames[deckA.name] += decided;
      deckDecidedGames[deckB.name] += decided;
    }
  }

  const deckWinRates = Object.fromEntries(
    decks.map((deck) => {
      const decided = deckDecidedGames[deck.name];
      return [deck.name, decided > 0 ? deckWins[deck.name] / decided : 0];
    }),
  ) as Record<string, number>;

  const rates = Object.values(deckWinRates);
  const spread = rates.length > 0 ? Math.max(...rates) - Math.min(...rates) : 0;

  return {
    tier,
    drawRate: totalGames > 0 ? draws / totalGames : 0,
    avgTurns: totalGames > 0 ? totalTurns / totalGames : 0,
    spread,
    deckWinRates,
    deckDecidedGames,
  };
}
