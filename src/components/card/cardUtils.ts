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
  air: '#a855f7',
  shadow: '#64748b',
};

const ELEMENT_BG_COLORS: Record<Element, string> = {
  fire: 'rgba(239, 68, 68, 0.15)',
  water: 'rgba(59, 130, 246, 0.15)',
  earth: 'rgba(34, 197, 94, 0.15)',
  air: 'rgba(168, 85, 247, 0.15)',
  shadow: 'rgba(100, 116, 139, 0.15)',
};

/** Rich gradient for card art areas */
const ELEMENT_ART_GRADIENTS: Record<Element, string> = {
  fire: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 40%, #f97316 70%, #fbbf24 100%)',
  water: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #38bdf8 70%, #67e8f9 100%)',
  earth: 'linear-gradient(135deg, #14532d 0%, #16a34a 40%, #4ade80 70%, #a3e635 100%)',
  air: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 40%, #c084fc 70%, #e9d5ff 100%)',
  shadow: 'linear-gradient(135deg, #0f172a 0%, #334155 40%, #64748b 70%, #94a3b8 100%)',
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
  air: 'linear-gradient(180deg, #e9d5ff 0%, #a855f7 50%, #581c87 100%)',
  shadow: 'linear-gradient(180deg, #94a3b8 0%, #64748b 50%, #1e293b 100%)',
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

/** Battlefield background images keyed by element. */
const BATTLEFIELD_BACKGROUNDS: Partial<Record<Element, string>> = {
  fire: `${ASSET_BASE}battlefield/landscape/fire_molten.webp`,
  water: `${ASSET_BASE}battlefield/landscape/water_moonlit_ocean_temple.webp`,
  earth: `${ASSET_BASE}battlefield/landscape/earth_jurassic.webp`,
  air: `${ASSET_BASE}battlefield/landscape/air_angelic_sky.webp`,
};

const ALL_BATTLEFIELD_BACKGROUNDS = Object.values(BATTLEFIELD_BACKGROUNDS) as string[];

/** Returns the battlefield background for an element; falls back deterministically. */
export function getBattlefieldBackground(element: Element): string {
  const bg = BATTLEFIELD_BACKGROUNDS[element];
  if (bg) return bg;
  // Deterministic pick based on element name so it's stable across re-renders
  let hash = 0;
  for (const ch of element) hash = (hash + ch.charCodeAt(0)) | 0;
  return ALL_BATTLEFIELD_BACKGROUNDS[Math.abs(hash) % ALL_BATTLEFIELD_BACKGROUNDS.length];
}

/** Player avatar images keyed by element. */
const AVATAR_PATHS: Record<Element, string> = {
  fire: `${ASSET_BASE}avatar/fire_mage.webp`,
  water: `${ASSET_BASE}avatar/water_sorcerer.webp`,
  earth: `${ASSET_BASE}avatar/earth_druid.webp`,
  air: `${ASSET_BASE}avatar/air_windcaller.webp`,
  shadow: `${ASSET_BASE}avatar/shadow_trickster.webp`,
};

export function getAvatarPath(element: Element): string {
  return AVATAR_PATHS[element];
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
