import { CARD_REGISTRY } from '@engine/cards';
import type { Phase } from '@engine/types';

export interface CardCostPresentation {
  costOverride?: number;
  costHint?: string;
  highlightCost: boolean;
}

/**
 * Computes card-cost presentation for UI surfaces.
 * Domain rules remain in the engine; this maps active phase context into display state.
 */
export function getCardCostPresentation(
  cardId: string,
  phase: Phase | null | undefined,
): CardCostPresentation {
  const cardDef = CARD_REGISTRY[cardId];
  if (!cardDef) {
    return { highlightCost: false };
  }

  if (phase?.type !== 'combat_priority' || cardDef.type !== 'spell' || cardDef.spellSpeed !== 'instant') {
    return { highlightCost: false };
  }

  const surcharge = cardDef.instantSurcharge ?? 0;
  if (surcharge <= 0) {
    return { highlightCost: false };
  }

  const effectiveCost = cardDef.cost + surcharge;
  const windowLabel = phase.window === 'post_attackers' ? 'before blockers' : 'before combat damage';
  return {
    costOverride: effectiveCost,
    costHint: `Combat instant cast: ${cardDef.cost} base + ${surcharge} surcharge = ${effectiveCost} (${windowLabel}).`,
    highlightCost: true,
  };
}

