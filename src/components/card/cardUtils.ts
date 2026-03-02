import type { Element } from '@engine/types';

const ASSET_BASE = import.meta.env.BASE_URL;

/** Path to card art image. Returns path regardless of whether file exists — callers should handle missing art via onError. */
export function getCardArtPath(cardId: string, element: Element): string {
  return `${ASSET_BASE}cards/${element}/${cardId}.webp`;
}

const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  earth: '#22c55e',
  air: '#eab308',
  shadow: '#a855f7',
};

const ELEMENT_BG_COLORS: Record<Element, string> = {
  fire: 'rgba(239, 68, 68, 0.15)',
  water: 'rgba(59, 130, 246, 0.15)',
  earth: 'rgba(34, 197, 94, 0.15)',
  air: 'rgba(234, 179, 8, 0.15)',
  shadow: 'rgba(168, 85, 247, 0.15)',
};

/** Rich gradient for card art areas */
const ELEMENT_ART_GRADIENTS: Record<Element, string> = {
  fire: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 40%, #f97316 70%, #fbbf24 100%)',
  water: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #38bdf8 70%, #67e8f9 100%)',
  earth: 'linear-gradient(135deg, #14532d 0%, #16a34a 40%, #4ade80 70%, #a3e635 100%)',
  air: 'linear-gradient(135deg, #78350f 0%, #ca8a04 40%, #fbbf24 70%, #fef3c7 100%)',
  shadow: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 40%, #c084fc 70%, #e9d5ff 100%)',
};

/** Element icon image paths */
const ELEMENT_ICON_PATHS: Record<Element, string> = {
  fire: `${ASSET_BASE}elements/fire.webp`,
  water: `${ASSET_BASE}elements/water.webp`,
  earth: `${ASSET_BASE}elements/earth.webp`,
  air: `${ASSET_BASE}elements/air.webp`,
  shadow: `${ASSET_BASE}elements/shadow.webp`,
};

/** Card frame gradient (the outer border area) */
const ELEMENT_FRAME_GRADIENTS: Record<Element, string> = {
  fire: 'linear-gradient(180deg, #fbbf24 0%, #ef4444 50%, #991b1b 100%)',
  water: 'linear-gradient(180deg, #67e8f9 0%, #3b82f6 50%, #1e3a8a 100%)',
  earth: 'linear-gradient(180deg, #a3e635 0%, #22c55e 50%, #14532d 100%)',
  air: 'linear-gradient(180deg, #fef3c7 0%, #eab308 50%, #78350f 100%)',
  shadow: 'linear-gradient(180deg, #e9d5ff 0%, #a855f7 50%, #581c87 100%)',
};

export function getElementColor(element: Element): string {
  return ELEMENT_COLORS[element];
}

export function getElementBg(element: Element): string {
  return ELEMENT_BG_COLORS[element];
}

export function getElementArtGradient(element: Element): string {
  return ELEMENT_ART_GRADIENTS[element];
}

export function getElementIconPath(element: Element): string {
  return ELEMENT_ICON_PATHS[element];
}

export function getElementFrameGradient(element: Element): string {
  return ELEMENT_FRAME_GRADIENTS[element];
}

/** Player avatar images keyed by element. */
const AVATAR_PATHS: Record<Element, string> = {
  fire: `${ASSET_BASE}avatar/fire_mage.webp`,
  water: `${ASSET_BASE}avatar/water_sorcerer.webp`,
  earth: `${ASSET_BASE}avatar/earth_dino.webp`,
  air: `${ASSET_BASE}avatar/air_alchemist.webp`,
  shadow: `${ASSET_BASE}avatar/shadow_trickster.webp`,
};

const ELEMENTAL_CHAMPION_AVATAR_PATH = `${ASSET_BASE}avatar/elemental_champion.webp`;

export function getAvatarPath(element: Element): string {
  return AVATAR_PATHS[element];
}

/** Resolve avatar by deck composition; mixed decks use a neutral champion portrait. */
export function getDeckAvatarPath(cardIds: string[]): string {
  const counts: Partial<Record<Element, number>> = {};
  for (const id of cardIds) {
    const element = id.split('_')[0] as Element;
    if (element in AVATAR_PATHS) {
      counts[element] = (counts[element] ?? 0) + 1;
    }
  }

  let bestCount = 0;
  const leaders: Element[] = [];
  for (const [element, count] of Object.entries(counts) as [Element, number][]) {
    if (count > bestCount) {
      bestCount = count;
      leaders.length = 0;
      leaders.push(element);
    } else if (count === bestCount) {
      leaders.push(element);
    }
  }

  if (leaders.length !== 1) return ELEMENTAL_CHAMPION_AVATAR_PATH;
  return getAvatarPath(leaders[0]);
}

/** Determine the most common element in a list of card IDs (by ID prefix convention). */
export function getDeckPrimaryElement(cardIds: string[]): Element | null {
  const counts: Partial<Record<string, number>> = {};
  for (const id of cardIds) {
    const el = id.split('_')[0];
    counts[el] = (counts[el] ?? 0) + 1;
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [el, count] of Object.entries(counts)) {
    if (count! > bestCount) {
      best = el;
      bestCount = count!;
    }
  }
  return best as Element | null;
}
