import type { GameState, Keyword, Permanent, PlayerId } from './types';
import { getCurrentHealth, getEffectiveAttack } from './types';
import { CARD_REGISTRY, hasKeyword } from './cards';

export { hasKeyword };

export function getKeywords(permanent: Permanent): Keyword[] {
  return CARD_REGISTRY[permanent.cardId].keywords;
}

export function getCombatDamage(permanent: Permanent): number {
  let damage = getEffectiveAttack(permanent);
  if (hasKeyword(permanent, 'fury')) {
    damage *= 2;
  }
  return damage;
}

export function estimateDamageToCreature(permanent: Permanent, rawDamage: number): number {
  if (rawDamage <= 0) {
    return 0;
  }
  if (hasKeyword(permanent, 'armor') && !permanent.armorUsedThisTurn) {
    return Math.max(0, rawDamage - 1);
  }
  return rawDamage;
}

export function estimateGuaranteedUnblockedDamage(
  attackers: Permanent[],
  blockerCount: number,
): number {
  if (attackers.length === 0) {
    return 0;
  }
  const attackValues = attackers
    .map((attacker) => getCombatDamage(attacker))
    .sort((a, b) => b - a);
  const blockedCount = Math.min(blockerCount, attackValues.length);
  return attackValues.slice(blockedCount).reduce((sum, value) => sum + value, 0);
}

export function canKillInCombat(
  attacker: Permanent,
  defender: Permanent,
): boolean {
  if (hasKeyword(attacker, 'deathtouch') && getCombatDamage(attacker) > 0) {
    return true;
  }
  return estimateDamageToCreature(defender, getCombatDamage(attacker)) >= getCurrentHealth(defender);
}

export function evaluateSingleBlockOutcome(attacker: Permanent, blocker: Permanent): number {
  const attackerDamage = getCombatDamage(attacker);
  const blockerDamage = getCombatDamage(blocker);
  const damageToBlocker = estimateDamageToCreature(blocker, attackerDamage);
  const damageToAttacker = estimateDamageToCreature(attacker, blockerDamage);
  const attackerDies = (hasKeyword(blocker, 'deathtouch') && blockerDamage > 0)
    || damageToAttacker >= getCurrentHealth(attacker);
  const blockerDies = (hasKeyword(attacker, 'deathtouch') && attackerDamage > 0)
    || damageToBlocker >= getCurrentHealth(blocker);

  if (attackerDies && !blockerDies) {
    return -120 - getEffectiveAttack(attacker) * 10;
  }
  if (attackerDies && blockerDies) {
    return -25;
  }
  if (!attackerDies && blockerDies) {
    return 80 + getEffectiveAttack(blocker) * 5;
  }
  return -5;
}

export function resolveAttackerPermanents(state: GameState, attackerIds: string[], playerId: PlayerId): Permanent[] {
  const board = state.players[playerId].board;
  return attackerIds
    .map((permanentId) => board.find(
      (slot): slot is Permanent => slot !== null && slot.permanentId === permanentId,
    ))
    .filter((slot): slot is Permanent => slot !== undefined);
}

export function estimateWorstBlockOutcomeScore(
  attacker: Permanent,
  defendingCreatures: Permanent[],
): number {
  if (defendingCreatures.length === 0) {
    return getCombatDamage(attacker);
  }

  let worst = Number.POSITIVE_INFINITY;
  for (const blocker of defendingCreatures) {
    const outcome = evaluateSingleBlockOutcome(attacker, blocker);
    if (outcome < worst) {
      worst = outcome;
    }
  }
  return worst;
}
