import type { Element } from '@engine/types';

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
  fire: '/elements/fire.png',
  water: '/elements/water.png',
  earth: '/elements/earth.png',
  air: '/elements/air.png',
  shadow: '/elements/shadow.png',
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
