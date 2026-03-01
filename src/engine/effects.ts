import type { Keyword, TargetingType } from './types';

export type EffectStep =
  | { type: 'damage'; amount: number; target: 'selected' | 'all_enemy_creatures' | 'all_creatures' | 'self' | 'opponent' }
  | { type: 'heal'; amount: number; target: 'selected' | 'self' | 'opponent' }
  | { type: 'draw'; amount: number }
  | { type: 'bounce'; target: 'selected' | 'all_enemy_creatures' }
  | { type: 'buff'; attack: number; health: number; target: 'selected' | 'own_creatures'; duration: 'end_of_turn' }
  | { type: 'grant_keyword'; keyword: Keyword; target: 'selected' | 'own_creatures'; duration: 'end_of_turn' }
  | { type: 'destroy'; target: 'selected' }
  | { type: 'prevent_attack'; target: 'selected' };

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  steps: EffectStep[];
  targetingType?: TargetingType;
}

export const EFFECT_REGISTRY: Record<string, EffectDefinition> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Deal 3 damage to a target creature',
    steps: [{ type: 'damage', amount: 3, target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  eruption: {
    id: 'eruption',
    name: 'Eruption',
    description: 'Deal 2 damage to all enemy creatures',
    steps: [{ type: 'damage', amount: 2, target: 'all_enemy_creatures' }],
  },
  blazing_speed: {
    id: 'blazing_speed',
    name: 'Blazing Speed',
    description: 'Give a creature Swift until end of turn',
    steps: [{ type: 'grant_keyword', keyword: 'swift', target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  splash: {
    id: 'splash',
    name: 'Splash',
    description: 'Draw 2 cards',
    steps: [{ type: 'draw', amount: 2 }],
  },
  tidal_wave: {
    id: 'tidal_wave',
    name: 'Tidal Wave',
    description: "Return all enemy creatures to their owner's hand",
    steps: [{ type: 'bounce', target: 'all_enemy_creatures' }],
  },
  healing_rain: {
    id: 'healing_rain',
    name: 'Healing Rain',
    description: 'Restore 4 health to your hero',
    steps: [{ type: 'heal', amount: 4, target: 'self' }],
  },
  entangle: {
    id: 'entangle',
    name: 'Entangle',
    description: 'Target creature cannot attack next turn',
    steps: [{ type: 'prevent_attack', target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Deal 2 damage to ALL creatures',
    steps: [{ type: 'damage', amount: 2, target: 'all_creatures' }],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Give a creature +2/+2 until end of turn',
    steps: [{ type: 'buff', attack: 2, health: 2, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  gust: {
    id: 'gust',
    name: 'Gust',
    description: "Return a target creature to its owner's hand",
    steps: [{ type: 'bounce', target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'any' },
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    description: 'Deal 3 damage to any target',
    steps: [{ type: 'damage', amount: 3, target: 'selected' }],
    targetingType: { kind: 'any' },
  },
  tailwind: {
    id: 'tailwind',
    name: 'Tailwind',
    description: 'All your creatures gain Swift until end of turn',
    steps: [{ type: 'grant_keyword', keyword: 'swift', target: 'own_creatures', duration: 'end_of_turn' }],
  },
  dark_bolt: {
    id: 'dark_bolt',
    name: 'Dark Bolt',
    description: 'Deal 2 damage to a creature, take 1 damage yourself',
    steps: [
      { type: 'damage', amount: 2, target: 'selected' },
      { type: 'damage', amount: 1, target: 'self' },
    ],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  life_drain: {
    id: 'life_drain',
    name: 'Life Drain',
    description: 'Deal 3 damage to opponent, heal 3',
    steps: [
      { type: 'damage', amount: 3, target: 'opponent' },
      { type: 'heal', amount: 3, target: 'self' },
    ],
  },
  doom: {
    id: 'doom',
    name: 'Doom',
    description: 'Destroy any creature',
    steps: [{ type: 'destroy', target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'any' },
  },

  // ─── Angel/Priest Effects ───
  soothe: {
    id: 'soothe',
    name: 'Soothe',
    description: 'Restore 3 health to your hero',
    steps: [{ type: 'heal', amount: 3, target: 'self' }],
  },
  blessing: {
    id: 'blessing',
    name: 'Blessing',
    description: 'Give a creature +1/+3 until end of turn',
    steps: [{ type: 'buff', attack: 1, health: 3, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  radiance: {
    id: 'radiance',
    name: 'Radiance',
    description: 'Restore 5 health and draw a card',
    steps: [
      { type: 'heal', amount: 5, target: 'self' },
      { type: 'draw', amount: 1 },
    ],
  },

  // ─── Dinosaur Effects ───
  primal_roar: {
    id: 'primal_roar',
    name: 'Primal Roar',
    description: 'Give a creature +2/+1 until end of turn',
    steps: [{ type: 'buff', attack: 2, health: 1, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  tar_pit: {
    id: 'tar_pit',
    name: 'Tar Pit',
    description: 'Deal 1 damage to a creature and prevent its attack',
    steps: [
      { type: 'damage', amount: 1, target: 'selected' },
      { type: 'prevent_attack', target: 'selected' },
    ],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  meteor_strike: {
    id: 'meteor_strike',
    name: 'Meteor Strike',
    description: 'Deal 3 damage to all enemy creatures',
    steps: [{ type: 'damage', amount: 3, target: 'all_enemy_creatures' }],
  },
};
