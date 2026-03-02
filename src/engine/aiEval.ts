import type { GameState, PlayerId } from './types';
import { getCurrentHealth, getEffectiveAttack, getOpponent } from './types';
import type { EvalWeights } from './aiConfig';

/**
 * Evaluate a game state from a player's perspective.
 * Returns a score where higher = better for the given player.
 * Pure function — no side effects, no RNG dependency.
 */
export function evaluateState(
  state: GameState,
  player: PlayerId,
  weights: EvalWeights,
): number {
  const opponent = getOpponent(player);
  const me = state.players[player];
  const them = state.players[opponent];

  // Immediate win/loss detection
  if (state.phase.type === 'game_over') {
    return state.phase.winner === player ? 10000 : -10000;
  }

  const myCreatures = me.board.filter((p) => p !== null);
  const theirCreatures = them.board.filter((p) => p !== null);

  // Health advantage: value of being alive and keeping health high
  const healthScore =
    weights.health * me.health - weights.aggression * them.health;

  // Board presence: more creatures = more options
  const presenceScore =
    weights.boardPresence * (myCreatures.length - theirCreatures.length);

  // Board power: total attack differential
  const myPower = myCreatures.reduce((sum, c) => sum + getEffectiveAttack(c!), 0);
  const theirPower = theirCreatures.reduce((sum, c) => sum + getEffectiveAttack(c!), 0);
  const powerScore = weights.boardPower * (myPower - theirPower);

  // Board durability: total remaining health of creatures
  const myDurability = myCreatures.reduce((sum, c) => sum + getCurrentHealth(c!), 0);
  const theirDurability = theirCreatures.reduce((sum, c) => sum + getCurrentHealth(c!), 0);
  const durabilityScore =
    weights.boardDurability * (myDurability - theirDurability);

  // Hand size: cards in hand = future options
  const handScore = weights.handSize * (me.hand.length - them.hand.length);

  return healthScore + presenceScore + powerScore + durabilityScore + handScore;
}

/**
 * Softmax action selection with temperature scaling.
 * Given scores for each action, returns the index of the chosen action.
 *
 * - temperature → 0: always picks the best action (argmax)
 * - temperature → ∞: uniform random selection
 */
export function softmaxSelect(scores: number[], temperature: number, rand: number): number {
  if (scores.length === 1) return 0;

  // Very low temperature: just pick the best
  if (temperature < 0.01) {
    let bestIdx = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIdx]) bestIdx = i;
    }
    return bestIdx;
  }

  // Compute softmax probabilities with numerical stability
  const scaled = scores.map((s) => s / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  // Sample from the distribution
  let threshold = rand * sum;
  for (let i = 0; i < exps.length; i++) {
    threshold -= exps[i];
    if (threshold <= 0) return i;
  }
  return exps.length - 1;
}
