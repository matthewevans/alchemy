import { beforeAll, describe, expect, it } from 'vitest';
import { getCardsByElement } from '../cards';
import { createInitialGameState } from '../gameInit';
import { chooseAction } from '../ai';
import { DEFAULT_AI_CONFIG } from '../aiConfig';
import { createRNG } from '../prng';
import { reduce } from '../reducer';
import { TIER_CONFIGS } from '../ruleset';
import { getActingPlayer } from '../types';
import type { PlayerId } from '../types';

const ELEMENTS = ['fire', 'water', 'earth', 'air', 'shadow'] as const;
type Element = (typeof ELEMENTS)[number];

const GAMES_PER_MATCHUP = 80;
const MAX_STEPS_PER_GAME = 1000;

// Guardrails are intentionally broad to avoid flakiness and catch only major drift.
const MIN_FIRST_PLAYER_WIN_RATE = 0.4;
const MAX_FIRST_PLAYER_WIN_RATE = 0.7;
const MIN_ELEMENT_WIN_RATE = 0.3;
const MAX_ELEMENT_WIN_RATE = 0.75;
const MAX_PAIR_DOMINANCE_RATE = 0.92;
const MIN_AVG_TURNS = 12;
const MAX_AVG_TURNS = 30;

interface MatchupResult {
  p1Wins: number;
  p2Wins: number;
  avgTurns: number;
}

interface BalanceSummary {
  matrix: Record<string, MatchupResult>;
  aggregateByElement: Record<Element, number>;
  firstPlayerWinRate: number;
}

function buildMonoDeck(element: Element): string[] {
  // Use the first 10 cards per element (original set) for balanced mono decks
  return getCardsByElement(element).slice(0, 10).flatMap((card) => [card.id, card.id]);
}

function runGame(seed: number, p1: Element, p2: Element, startingPlayer: PlayerId): { winner: PlayerId; turns: number } {
  const rng = createRNG(seed);
  let state = createInitialGameState({
    ruleset: TIER_CONFIGS.apprentice,
    player1Deck: buildMonoDeck(p1),
    player2Deck: buildMonoDeck(p2),
    rng,
    startingPlayer,
  });

  for (let step = 0; step < MAX_STEPS_PER_GAME; step++) {
    if (state.phase.type === 'game_over') {
      return { winner: state.phase.winner, turns: state.turn };
    }

    const actingPlayer = getActingPlayer(state)!;
    const action = chooseAction(state, actingPlayer, rng, DEFAULT_AI_CONFIG);
    const result = reduce(state, action, actingPlayer, rng);
    state = result.newState;
  }

  throw new Error(`Simulation exceeded ${MAX_STEPS_PER_GAME} steps (${p1} vs ${p2})`);
}

function runMonoBalanceSuite(): BalanceSummary {
  if (GAMES_PER_MATCHUP % 2 !== 0) {
    throw new Error('GAMES_PER_MATCHUP must be even to pair seeds across starting players');
  }

  const matrix: Record<string, MatchupResult> = {};
  let firstPlayerWins = 0;
  let totalGames = 0;

  for (const p1 of ELEMENTS) {
    for (const p2 of ELEMENTS) {
      let p1Wins = 0;
      let p2Wins = 0;
      let totalTurns = 0;

      for (let i = 0; i < GAMES_PER_MATCHUP / 2; i++) {
        const seed = 100_000 + i + p1.charCodeAt(0) * 31 + p2.charCodeAt(0) * 97;
        const pairedStarts: PlayerId[] = ['player1', 'player2'];

        for (const startingPlayer of pairedStarts) {
          const game = runGame(seed, p1, p2, startingPlayer);
          totalTurns += game.turns;

          if (game.winner === 'player1') {
            p1Wins += 1;
          } else {
            p2Wins += 1;
          }

          if (game.winner === startingPlayer) {
            firstPlayerWins += 1;
          }
          totalGames += 1;
        }
      }

      matrix[`${p1}_vs_${p2}`] = {
        p1Wins,
        p2Wins,
        avgTurns: Number((totalTurns / GAMES_PER_MATCHUP).toFixed(2)),
      };
    }
  }

  const winCounts: Record<Element, number> = {
    fire: 0,
    water: 0,
    earth: 0,
    air: 0,
    shadow: 0,
  };
  const gameCounts: Record<Element, number> = {
    fire: 0,
    water: 0,
    earth: 0,
    air: 0,
    shadow: 0,
  };

  for (const [key, stats] of Object.entries(matrix)) {
    const [p1, p2] = key.split('_vs_') as [Element, Element];

    winCounts[p1] += stats.p1Wins;
    gameCounts[p1] += stats.p1Wins + stats.p2Wins;

    winCounts[p2] += stats.p2Wins;
    gameCounts[p2] += stats.p1Wins + stats.p2Wins;
  }

  const aggregateByElement: Record<Element, number> = {
    fire: Number((winCounts.fire / gameCounts.fire).toFixed(3)),
    water: Number((winCounts.water / gameCounts.water).toFixed(3)),
    earth: Number((winCounts.earth / gameCounts.earth).toFixed(3)),
    air: Number((winCounts.air / gameCounts.air).toFixed(3)),
    shadow: Number((winCounts.shadow / gameCounts.shadow).toFixed(3)),
  };

  return {
    matrix,
    aggregateByElement,
    firstPlayerWinRate: Number((firstPlayerWins / totalGames).toFixed(3)),
  };
}

let summary: BalanceSummary;

beforeAll(() => {
  summary = runMonoBalanceSuite();
  if (import.meta.env['BALANCE_DEBUG'] === '1') {
    // Useful when tuning cards locally without spamming default test output.
    console.log(JSON.stringify(summary, null, 2));
  }
});

describe('balance simulations', () => {
  it('keeps first-player edge within guardrails', () => {
    expect(summary.firstPlayerWinRate).toBeGreaterThanOrEqual(MIN_FIRST_PLAYER_WIN_RATE);
    expect(summary.firstPlayerWinRate).toBeLessThanOrEqual(MAX_FIRST_PLAYER_WIN_RATE);
  });

  it('keeps aggregate element win rates within guardrails', () => {
    for (const element of ELEMENTS) {
      const rate = summary.aggregateByElement[element];
      expect(rate).toBeGreaterThanOrEqual(MIN_ELEMENT_WIN_RATE);
      expect(rate).toBeLessThanOrEqual(MAX_ELEMENT_WIN_RATE);
    }
  });

  it('avoids extreme dominance in any mono matchup', () => {
    for (const result of Object.values(summary.matrix)) {
      const dominantRate = Math.max(result.p1Wins, result.p2Wins) / (result.p1Wins + result.p2Wins);
      expect(dominantRate).toBeLessThanOrEqual(MAX_PAIR_DOMINANCE_RATE);
    }
  });

  it('keeps matchup lengths in healthy bounds', () => {
    for (const result of Object.values(summary.matrix)) {
      expect(result.avgTurns).toBeGreaterThanOrEqual(MIN_AVG_TURNS);
      expect(result.avgTurns).toBeLessThanOrEqual(MAX_AVG_TURNS);
    }
  });
});
