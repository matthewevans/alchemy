import type { Permanent } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { getEffectiveAttack, getCurrentHealth } from '@engine/types';

export type CombatEquationPart =
  | { type: 'attack'; value: number }
  | { type: 'health'; value: number }
  | { type: 'armor'; value: number }
  | { type: 'fury'; multiplier: number }
  | { type: 'operator'; symbol: string }
  | { type: 'result'; text: string };

export interface CombatEquation {
  text: string;
  parts: CombatEquationPart[];
}

/**
 * Build a human-readable combat math equation for display.
 * Pure function — no store or DOM access.
 */
export function buildCombatEquation(
  attackerPermanent: Permanent,
  targetPermanent: Permanent | null,
  finalDamage: number,
): CombatEquation {
  const attackerDef = CARD_REGISTRY[attackerPermanent.cardId];
  const parts: CombatEquationPart[] = [];

  let baseAttack = getEffectiveAttack(attackerPermanent);
  const hasFury = attackerDef.keywords.includes('fury');

  // Attack value
  if (hasFury) {
    parts.push({ type: 'attack', value: baseAttack });
    parts.push({ type: 'operator', symbol: '×' });
    parts.push({ type: 'fury', multiplier: 2 });
    parts.push({ type: 'operator', symbol: '=' });
    baseAttack *= 2;
    parts.push({ type: 'attack', value: baseAttack });
  } else {
    parts.push({ type: 'attack', value: baseAttack });
  }

  // Target
  if (targetPermanent) {
    const targetDef = CARD_REGISTRY[targetPermanent.cardId];
    const hasArmor = targetDef.keywords.includes('armor') && !targetPermanent.armorUsedThisTurn;
    const targetHP = getCurrentHealth(targetPermanent);

    parts.push({ type: 'operator', symbol: '→' });

    if (hasArmor && baseAttack > 0) {
      parts.push({ type: 'armor', value: 1 });
      parts.push({ type: 'operator', symbol: '→' });
    }

    parts.push({ type: 'health', value: targetHP });
    parts.push({ type: 'operator', symbol: '=' });

    const remaining = targetHP - finalDamage;
    if (remaining <= 0) {
      parts.push({ type: 'result', text: 'defeated!' });
    } else {
      parts.push({ type: 'result', text: `${remaining} left` });
    }
  } else {
    // Player damage (unblocked)
    parts.push({ type: 'operator', symbol: '→' });
    parts.push({ type: 'result', text: 'player' });
  }

  const text = parts.map((p) => {
    switch (p.type) {
      case 'attack': return `${p.value} ⚔`;
      case 'health': return `${p.value} ♥`;
      case 'armor': return `${p.value} 🛡`;
      case 'fury': return `${p.multiplier}`;
      case 'operator': return p.symbol;
      case 'result': return p.text;
    }
  }).join(' ');

  return { text, parts };
}
