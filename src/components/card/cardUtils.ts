import type { Element } from '@engine/types';

const ELEMENT_COLORS: Record<Element, string> = {
  fire: 'var(--fire)',
  water: 'var(--water)',
  earth: 'var(--earth)',
  air: 'var(--air)',
  shadow: 'var(--shadow)',
};

const ELEMENT_BG_COLORS: Record<Element, string> = {
  fire: 'rgba(239, 68, 68, 0.12)',
  water: 'rgba(59, 130, 246, 0.12)',
  earth: 'rgba(34, 197, 94, 0.12)',
  air: 'rgba(168, 85, 247, 0.12)',
  shadow: 'rgba(100, 116, 139, 0.12)',
};

export function getElementColor(element: Element): string {
  return ELEMENT_COLORS[element];
}

export function getElementBg(element: Element): string {
  return ELEMENT_BG_COLORS[element];
}
