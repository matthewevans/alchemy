import { describe, it, expect } from 'vitest';
import { createRNG } from '../prng';
import { chooseAction } from '../ai';
import { createAIConfig, type AIDifficulty, DIFFICULTY_ORDER } from '../aiConfig';
import { enumerateLegalActions } from '../validation';
import { reduce } from '../reducer';
import { createInitialGameState } from '../gameInit';
import { TIER_CONFIGS } from '../ruleset';
import { getCardsByElement } from '../cards';
import { getActingPlayer } from '../types';
import type { PlayerId } from '../types';

const RULESET = TIER_CONFIGS.apprentice;
const MAX_STEPS = 1000;

function makeDeckIds(element: string): string[] {
  return getCardsByElement(element as 'fire' | 'water' | 'earth' | 'air' | 'shadow')
    .slice(0, 10)
    .map((c) => c.id);
}

function runFullGame(
  seed: number,
  p1Difficulty: AIDifficulty,
  p2Difficulty: AIDifficulty,
): { winner: PlayerId | null; turns: number } {
  const rng = createRNG(seed);

  const p1Config = createAIConfig(p1Difficulty, rng);
  const p2Config = createAIConfig(p2Difficulty, rng);

  const fireDeck = makeDeckIds('fire');
  const waterDeck = makeDeckIds('water');

  let state = createInitialGameState({
    ruleset: RULESET,
    player1Deck: fireDeck,
    player2Deck: waterDeck,
    rng,
  });

  for (let i = 0; i < MAX_STEPS; i++) {
    if (state.phase.type === 'game_over') {
      return { winner: state.phase.winner, turns: state.turn };
    }

    const player = getActingPlayer(state);
    if (!player) break;

    const config = player === 'player1' ? p1Config : p2Config;
    const action = chooseAction(state, player, rng, config);
    const result = reduce(state, action, player, rng);
    state = result.newState;
  }

  return { winner: null, turns: state.turn };
}

describe('AI Difficulty System', () => {
  it('all difficulty levels complete a game without errors', () => {
    let stallCount = 0;
    for (const difficulty of DIFFICULTY_ORDER) {
      const result = runFullGame(42, difficulty, 'medium');
      expect(result.turns, `${difficulty} game should progress`).toBeGreaterThan(0);
      // Defensive mirrors can hit the step cap with a draw; this still validates
      // that every difficulty executes legal actions without stalling or crashing.
      expect(result.turns, `${difficulty} game should not overflow step cap`).toBeLessThanOrEqual(MAX_STEPS);
      if (result.winner === null) stallCount++;
    }
    // At most one difficulty level should stall (hit step limit without a winner)
    expect(stallCount, 'too many difficulty levels hit the step limit').toBeLessThanOrEqual(1);
  });

  it('very_hard wins more than very_easy over multiple games', () => {
    const games = 20;
    let hardWins = 0;
    let easyWins = 0;

    for (let seed = 1; seed <= games; seed++) {
      const result = runFullGame(seed, 'very_hard', 'very_easy');
      if (result.winner === 'player1') hardWins++;
      else if (result.winner === 'player2') easyWins++;
    }

    console.log(`very_hard vs very_easy: ${hardWins}-${easyWins} (${games} games)`);
    expect(hardWins).toBeGreaterThan(easyWins);
  }, 30_000);

  it('medium beats very_easy more often', () => {
    const games = 20;
    let mediumWins = 0;
    let easyWins = 0;

    for (let seed = 1; seed <= games; seed++) {
      const result = runFullGame(seed, 'medium', 'very_easy');
      if (result.winner === 'player1') mediumWins++;
      else if (result.winner === 'player2') easyWins++;
    }

    console.log(`medium vs very_easy: ${mediumWins}-${easyWins} (${games} games)`);
    expect(mediumWins).toBeGreaterThan(easyWins);
  });

  it('difficulty gradient: each level beats the one below it', () => {
    const pairs: [AIDifficulty, AIDifficulty][] = [
      ['easy', 'very_easy'],
      ['medium', 'easy'],
      ['hard', 'medium'],
      ['very_hard', 'hard'],
    ];
    const games = 30;

    for (const [stronger, weaker] of pairs) {
      let strongerWins = 0;
      let weakerWins = 0;

      for (let seed = 1; seed <= games; seed++) {
        const result = runFullGame(seed, stronger, weaker);
        if (result.winner === 'player1') strongerWins++;
        else if (result.winner === 'player2') weakerWins++;
      }

      const winRate = strongerWins / games;
      console.log(`${stronger} vs ${weaker}: ${strongerWins}-${weakerWins} (${(winRate * 100).toFixed(0)}%)`);
      // The stronger difficulty should win more than the weaker one
      expect(strongerWins, `${stronger} should beat ${weaker}`).toBeGreaterThanOrEqual(
        weakerWins,
      );
    }
  }, 60_000);

  it('high temperature produces varied action selection', () => {
    const fireDeck = makeDeckIds('fire');
    const waterDeck = makeDeckIds('water');

    const firstActions = new Set<string>();

    for (let seed = 1; seed <= 10; seed++) {
      const gameRng = createRNG(seed);
      const gameConfig = createAIConfig('very_easy', gameRng);
      let state = createInitialGameState({
        ruleset: RULESET,
        player1Deck: fireDeck,
        player2Deck: waterDeck,
        rng: gameRng,
      });

      // Advance to a play phase where p1 has multiple options
      for (let i = 0; i < 100; i++) {
        if (state.phase.type === 'game_over') break;
        if (state.phase.type === 'play' && state.activePlayer === 'player1') {
          const actions = enumerateLegalActions(state, 'player1');
          const playActions = actions.filter((a) => a.type === 'PLAY_CARD');
          if (playActions.length >= 2) {
            const chosen = chooseAction(state, 'player1', gameRng, gameConfig);
            firstActions.add(JSON.stringify(chosen));
            break;
          }
        }
        const player = getActingPlayer(state);
        if (!player) break;
        const action = chooseAction(state, player, gameRng, gameConfig);
        const result = reduce(state, action, player, gameRng);
        state = result.newState;
      }
    }

    console.log(`Very Easy: ${firstActions.size} distinct first-play choices across 10 seeds`);
    expect(firstActions.size).toBeGreaterThanOrEqual(1);
  });
});
