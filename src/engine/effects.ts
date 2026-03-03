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
  easyDescription?: string;
  steps: EffectStep[];
  targetingType?: TargetingType;
}

export const EFFECT_REGISTRY: Record<string, EffectDefinition> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Deal 3 damage to a target creature',
    easyDescription: 'Hurts a bad guy for 3',
    steps: [{ type: 'damage', amount: 3, target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  eruption: {
    id: 'eruption',
    name: 'Eruption',
    description: 'Deal 2 damage to all enemy creatures',
    easyDescription: 'Hurts all bad guys for 2',
    steps: [{ type: 'damage', amount: 2, target: 'all_enemy_creatures' }],
  },
  blazing_speed: {
    id: 'blazing_speed',
    name: 'Blazing Speed',
    description: 'Give a creature Swift until end of turn',
    easyDescription: 'Makes a friend fight right away',
    steps: [{ type: 'grant_keyword', keyword: 'swift', target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  splash: {
    id: 'splash',
    name: 'Splash',
    description: 'Draw 2 cards',
    easyDescription: 'Get 2 new cards',
    steps: [{ type: 'draw', amount: 2 }],
  },
  tidal_wave: {
    id: 'tidal_wave',
    name: 'Tidal Wave',
    description: "Return all enemy creatures to their owner's hand",
    easyDescription: 'Sends all bad guys home',
    steps: [{ type: 'bounce', target: 'all_enemy_creatures' }],
  },
  healing_rain: {
    id: 'healing_rain',
    name: 'Healing Rain',
    description: 'Restore 4 health to your hero',
    easyDescription: 'Gives you 4 hearts',
    steps: [{ type: 'heal', amount: 4, target: 'self' }],
  },
  entangle: {
    id: 'entangle',
    name: 'Entangle',
    description: 'Target creature cannot attack next turn',
    easyDescription: 'Stops a bad guy from fighting',
    steps: [{ type: 'prevent_attack', target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Deal 2 damage to ALL creatures',
    easyDescription: 'Hurts everyone for 2',
    steps: [{ type: 'damage', amount: 2, target: 'all_creatures' }],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Give a creature +2/+2 until end of turn',
    easyDescription: 'Makes a friend bigger this turn',
    steps: [{ type: 'buff', attack: 2, health: 2, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  gust: {
    id: 'gust',
    name: 'Gust',
    description: "Return a target creature to its owner's hand",
    easyDescription: 'Sends a creature back home',
    steps: [{ type: 'bounce', target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'any' },
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    description: 'Deal 3 damage to any target',
    easyDescription: 'Zaps anything for 3',
    steps: [{ type: 'damage', amount: 3, target: 'selected' }],
    targetingType: { kind: 'any' },
  },
  tailwind: {
    id: 'tailwind',
    name: 'Tailwind',
    description: 'All your creatures gain Swift until end of turn',
    easyDescription: 'All your friends fight right away',
    steps: [{ type: 'grant_keyword', keyword: 'swift', target: 'own_creatures', duration: 'end_of_turn' }],
  },
  dark_bolt: {
    id: 'dark_bolt',
    name: 'Dark Bolt',
    description: 'Deal 2 damage to a creature, take 1 damage yourself',
    easyDescription: 'Hurts a bad guy for 2, you lose 1',
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
    easyDescription: 'Hurts enemy for 3, gives you 3 hearts',
    steps: [
      { type: 'damage', amount: 3, target: 'opponent' },
      { type: 'heal', amount: 3, target: 'self' },
    ],
  },
  doom: {
    id: 'doom',
    name: 'Doom',
    description: 'Destroy any creature',
    easyDescription: 'Beats any creature instantly',
    steps: [{ type: 'destroy', target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'any' },
  },

  // ─── Angel/Priest Effects ───
  soothe: {
    id: 'soothe',
    name: 'Soothe',
    description: 'Restore 3 health to your hero',
    easyDescription: 'Gives you 3 hearts',
    steps: [{ type: 'heal', amount: 3, target: 'self' }],
  },
  blessing: {
    id: 'blessing',
    name: 'Blessing',
    description: 'Give a creature +1/+3 until end of turn',
    easyDescription: 'Makes a friend tougher this turn',
    steps: [{ type: 'buff', attack: 1, health: 3, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  radiance: {
    id: 'radiance',
    name: 'Radiance',
    description: 'Restore 5 health and draw a card',
    easyDescription: 'Gives 5 hearts and a new card',
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
    easyDescription: 'Makes a friend stronger this turn',
    steps: [{ type: 'buff', attack: 2, health: 1, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  tar_pit: {
    id: 'tar_pit',
    name: 'Tar Pit',
    description: 'Deal 1 damage to a creature and prevent its attack',
    easyDescription: 'Hurts and traps a bad guy',
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
    easyDescription: 'Hurts all bad guys for 3',
    steps: [{ type: 'damage', amount: 3, target: 'all_enemy_creatures' }],
  },

  // ─── Fire Forge Effects ───
  forge_hammer: {
    id: 'forge_hammer',
    name: 'Forge Hammer',
    description: 'Give a creature +2/+0 until end of turn',
    easyDescription: 'Makes a friend hit harder this turn',
    steps: [{ type: 'buff', attack: 2, health: 0, target: 'selected', duration: 'end_of_turn' }],
    targetingType: { kind: 'creature', controller: 'own' },
  },
  furnace_blast: {
    id: 'furnace_blast',
    name: 'Furnace Blast',
    description: 'Deal 4 damage to target enemy creature',
    easyDescription: 'Hurts a bad guy for 4',
    steps: [{ type: 'damage', amount: 4, target: 'selected' }],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  flame_wave: {
    id: 'flame_wave',
    name: 'Flame Wave',
    description: 'Deal 3 damage to all enemy creatures and 2 damage to enemy hero',
    easyDescription: 'Hurts all bad guys for 3 and enemy for 2',
    steps: [
      { type: 'damage', amount: 3, target: 'all_enemy_creatures' },
      { type: 'damage', amount: 2, target: 'opponent' },
    ],
  },

  // ─── Water Depths Effects ───
  riptide: {
    id: 'riptide',
    name: 'Riptide',
    description: 'Deal 1 damage to all enemy creatures and draw 1 card',
    easyDescription: 'Hurts all bad guys and get a card',
    steps: [
      { type: 'damage', amount: 1, target: 'all_enemy_creatures' },
      { type: 'draw', amount: 1 },
    ],
  },
  tidal_surge: {
    id: 'tidal_surge',
    name: 'Tidal Surge',
    description: "Return target creature to its owner's hand and draw 2 cards",
    easyDescription: 'Sends a creature home, get 2 cards',
    steps: [
      { type: 'bounce', target: 'selected' },
      { type: 'draw', amount: 2 },
    ],
    targetingType: { kind: 'creature', controller: 'any' },
  },
  maelstrom: {
    id: 'maelstrom',
    name: 'Maelstrom',
    description: 'Deal 2 damage to ALL creatures and draw 1 card',
    easyDescription: 'Hurts everyone for 2, get a card',
    steps: [
      { type: 'damage', amount: 2, target: 'all_creatures' },
      { type: 'draw', amount: 1 },
    ],
  },

  // ─── Shadow Dread Effects ───
  shadow_strike: {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    description: 'Deal 3 damage to enemy creature, take 1 damage yourself',
    easyDescription: 'Hurts a bad guy for 3, you lose 1',
    steps: [
      { type: 'damage', amount: 3, target: 'selected' },
      { type: 'damage', amount: 1, target: 'self' },
    ],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  soul_siphon: {
    id: 'soul_siphon',
    name: 'Soul Siphon',
    description: 'Deal 2 damage to enemy creature, heal 2 to your hero',
    easyDescription: 'Hurts a bad guy for 2, gives 2 hearts',
    steps: [
      { type: 'damage', amount: 2, target: 'selected' },
      { type: 'heal', amount: 2, target: 'self' },
    ],
    targetingType: { kind: 'creature', controller: 'opponent' },
  },
  void_storm: {
    id: 'void_storm',
    name: 'Void Storm',
    description: 'Deal 2 damage to all creatures and 3 damage to opponent hero',
    easyDescription: 'Hurts everyone for 2 and enemy for 3',
    steps: [
      { type: 'damage', amount: 2, target: 'all_creatures' },
      { type: 'damage', amount: 3, target: 'opponent' },
    ],
  },
};
