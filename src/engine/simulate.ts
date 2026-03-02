import type { PlayerId, Tier } from './types';
import type { AIConfig } from './aiConfig';
import { getActingPlayer } from './types';
import { createRNG } from './prng';
import { createInitialGameState } from './gameInit';
import { TIER_CONFIGS } from './ruleset';
import { chooseAction } from './ai';
import { reduce } from './reducer';
import { enumerateLegalActions } from './validation';

// ─── Types ───

export interface SimulationConfig {
  tier: Tier;
  aiConfig: AIConfig;
  maxSteps?: number;
}

export interface GameResult {
  winner: PlayerId | null;
  turns: number;
  player1Health: number;
  player2Health: number;
}

export interface MatchupStats {
  games: number;
  deck1Wins: number;
  deck2Wins: number;
  draws: number;
  avgTurns: number;
  avgHealthMargin: number;
}

// ─── Simulation ───

const DEFAULT_MAX_STEPS = 500;

export function simulateGame(
  deck1: string[],
  deck2: string[],
  config: SimulationConfig,
  seed: number,
): GameResult {
  const rng = createRNG(seed);
  const ruleset = TIER_CONFIGS[config.tier];

  let state = createInitialGameState({
    ruleset,
    player1Deck: deck1,
    player2Deck: deck2,
    rng,
  });

  const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;

  for (let step = 0; step < maxSteps; step++) {
    if (state.phase.type === 'game_over') break;

    const acting = getActingPlayer(state);
    if (!acting) break;

    const legal = enumerateLegalActions(state, acting);
    if (legal.length === 0) break;

    const action = chooseAction(state, acting, rng, config.aiConfig);
    const result = reduce(state, action, acting, rng);
    state = result.newState;
  }

  return {
    winner: state.phase.type === 'game_over' ? state.phase.winner : null,
    turns: state.turn,
    player1Health: state.players.player1.health,
    player2Health: state.players.player2.health,
  };
}

export function simulateMatchup(
  deck1: string[],
  deck2: string[],
  config: SimulationConfig,
  numGames: number,
  baseSeed = 0,
): MatchupStats {
  let deck1Wins = 0;
  let deck2Wins = 0;
  let draws = 0;
  let totalTurns = 0;
  let totalHealthMargin = 0;

  for (let i = 0; i < numGames; i++) {
    // Alternate who goes first to reduce first-player advantage bias
    const p1First = i % 2 === 0;
    const d1 = p1First ? deck1 : deck2;
    const d2 = p1First ? deck2 : deck1;

    const result = simulateGame(d1, d2, config, baseSeed + i);
    totalTurns += result.turns;

    if (result.winner === null) {
      draws++;
    } else if (p1First) {
      if (result.winner === 'player1') deck1Wins++;
      else deck2Wins++;
      totalHealthMargin += Math.abs(result.player1Health - result.player2Health);
    } else {
      if (result.winner === 'player1') deck2Wins++;
      else deck1Wins++;
      totalHealthMargin += Math.abs(result.player1Health - result.player2Health);
    }
  }

  const decided = deck1Wins + deck2Wins;
  return {
    games: numGames,
    deck1Wins,
    deck2Wins,
    draws,
    avgTurns: totalTurns / numGames,
    avgHealthMargin: decided > 0 ? totalHealthMargin / decided : 0,
  };
}
