import type { GameState, Permanent, PlayerId } from './types';
import { getCurrentHealth, getEffectiveAttack, getOpponent } from './types';
import type { EvalWeights } from './aiConfig';
import { getKeywords } from './aiCombat';

/**
 * Intrinsic value of a creature beyond raw attack/health.
 * Keywords, tapped state, and summoning sickness affect tactical worth.
 */
function creatureValue(creature: Permanent): number {
  const attack = getEffectiveAttack(creature);
  const health = getCurrentHealth(creature);
  let value = attack + health;

  const keywords = getKeywords(creature);
  for (const keyword of keywords) {
    switch (keyword) {
      case 'deathtouch':
        value += 3 + Math.min(attack, 1) * 2;
        break;
      case 'fury':
        value += attack;
        break;
      case 'armor':
        value += creature.armorUsedThisTurn ? 0 : 1.5;
        break;
      case 'swift':
        value += creature.summonedThisTurn ? 2 : 0;
        break;
      case 'lifesteal':
        value += attack * 0.5;
        break;
      case 'blast':
        value += 1;
        break;
      case 'heal':
        value += 1;
        break;
      case 'draw':
        value += 1;
        break;
    }
  }

  if (creature.isTapped) {
    value -= 1.5;
  }

  if (creature.cantAttackThisTurn && attack > 0) {
    value -= 0.5;
  }

  return value;
}

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

  if (state.phase.type === 'game_over') {
    return state.phase.winner === player ? 10000 : -10000;
  }

  const myCreatures = me.board.filter((p): p is Permanent => p !== null);
  const theirCreatures = them.board.filter((p): p is Permanent => p !== null);

  const healthScore =
    weights.health * me.health - weights.aggression * them.health;

  const presenceScore =
    weights.boardPresence * (myCreatures.length - theirCreatures.length);

  const myPower = myCreatures.reduce((sum, c) => sum + getEffectiveAttack(c), 0);
  const theirPower = theirCreatures.reduce((sum, c) => sum + getEffectiveAttack(c), 0);
  const powerScore = weights.boardPower * (myPower - theirPower);

  const myDurability = myCreatures.reduce((sum, c) => sum + getCurrentHealth(c), 0);
  const theirDurability = theirCreatures.reduce((sum, c) => sum + getCurrentHealth(c), 0);
  const durabilityScore =
    weights.boardDurability * (myDurability - theirDurability);

  const handScore = weights.handSize * (me.hand.length - them.hand.length);

  const myCreatureValue = myCreatures.reduce((sum, c) => sum + creatureValue(c), 0);
  const theirCreatureValue = theirCreatures.reduce((sum, c) => sum + creatureValue(c), 0);
  const qualityScore = (myCreatureValue - theirCreatureValue) * 0.4;

  return healthScore + presenceScore + powerScore + durabilityScore + handScore + qualityScore;
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

  if (temperature < 0.01) {
    let bestIdx = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIdx]) bestIdx = i;
    }
    return bestIdx;
  }

  const scaled = scores.map((s) => s / temperature);
  const max = Math.max(...scaled);
  if (!isFinite(max)) return 0;
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  let threshold = rand * sum;
  for (let i = 0; i < exps.length; i++) {
    threshold -= exps[i];
    if (threshold <= 0) return i;
  }
  return exps.length - 1;
}
