import type { CardDefinition, Element, Tier } from './types';
import { EFFECT_REGISTRY } from './effects';

export const ALL_CARDS: CardDefinition[] = [
  // ─── Fire Creatures ───
  { id: 'fire_ember_sprite', name: 'Ember Sprite', type: 'creature', element: 'fire', cost: 1, attack: 1, health: 2, keywords: ['swift'], tier: 'apprentice' },
  { id: 'fire_flame_fox', name: 'Flame Fox', type: 'creature', element: 'fire', cost: 1, attack: 2, health: 1, keywords: [], tier: 'apprentice' },
  { id: 'fire_lava_hound', name: 'Lava Hound', type: 'creature', element: 'fire', cost: 2, attack: 2, health: 3, keywords: [], tier: 'apprentice' },
  { id: 'fire_fire_dancer', name: 'Fire Dancer', type: 'creature', element: 'fire', cost: 2, attack: 1, health: 2, keywords: ['blast'], tier: 'apprentice' },
  { id: 'fire_magma_golem', name: 'Magma Golem', type: 'creature', element: 'fire', cost: 3, attack: 3, health: 4, keywords: [], tier: 'apprentice' },
  { id: 'fire_phoenix_chick', name: 'Phoenix Chick', type: 'creature', element: 'fire', cost: 4, attack: 3, health: 3, keywords: ['swift'], tier: 'apprentice' },
  { id: 'fire_dragon_whelp', name: 'Dragon Whelp', type: 'creature', element: 'fire', cost: 5, attack: 5, health: 4, keywords: ['blast'], tier: 'apprentice' },

  // ─── Fire Spells ───
  { id: 'fire_fireball', name: 'Fireball', type: 'spell', element: 'fire', cost: 2, keywords: [], tier: 'apprentice', effectId: 'fireball', targetingType: EFFECT_REGISTRY.fireball.targetingType },
  { id: 'fire_eruption', name: 'Eruption', type: 'spell', element: 'fire', cost: 3, keywords: [], tier: 'apprentice', effectId: 'eruption' },
  { id: 'fire_blazing_speed', name: 'Blazing Speed', type: 'spell', element: 'fire', cost: 1, keywords: [], tier: 'apprentice', effectId: 'blazing_speed', targetingType: EFFECT_REGISTRY.blazing_speed.targetingType },

  // ─── Water Creatures ───
  { id: 'water_tide_sprite', name: 'Tide Sprite', type: 'creature', element: 'water', cost: 1, attack: 1, health: 2, keywords: ['draw'], tier: 'apprentice' },
  { id: 'water_shell_crab', name: 'Shell Crab', type: 'creature', element: 'water', cost: 1, attack: 0, health: 4, keywords: [], tier: 'apprentice' },
  { id: 'water_river_otter', name: 'River Otter', type: 'creature', element: 'water', cost: 2, attack: 2, health: 2, keywords: ['draw'], tier: 'apprentice' },
  { id: 'water_coral_guardian', name: 'Coral Guardian', type: 'creature', element: 'water', cost: 2, attack: 1, health: 4, keywords: [], tier: 'apprentice' },
  { id: 'water_storm_turtle', name: 'Storm Turtle', type: 'creature', element: 'water', cost: 3, attack: 2, health: 5, keywords: ['heal'], tier: 'apprentice' },
  { id: 'water_frost_serpent', name: 'Frost Serpent', type: 'creature', element: 'water', cost: 4, attack: 4, health: 3, keywords: [], tier: 'apprentice' },
  { id: 'water_tidal_whale', name: 'Tidal Whale', type: 'creature', element: 'water', cost: 5, attack: 3, health: 6, keywords: ['heal'], tier: 'apprentice' },

  // ─── Water Spells ───
  { id: 'water_splash', name: 'Splash', type: 'spell', element: 'water', cost: 1, keywords: [], tier: 'apprentice', effectId: 'splash' },
  { id: 'water_tidal_wave', name: 'Tidal Wave', type: 'spell', element: 'water', cost: 4, keywords: [], tier: 'apprentice', effectId: 'tidal_wave' },
  { id: 'water_healing_rain', name: 'Healing Rain', type: 'spell', element: 'water', cost: 2, keywords: [], tier: 'apprentice', effectId: 'healing_rain' },

  // ─── Earth Creatures ───
  { id: 'earth_pebble_pup', name: 'Pebble Pup', type: 'creature', element: 'earth', cost: 1, attack: 1, health: 3, keywords: [], tier: 'apprentice' },
  { id: 'earth_vine_crawler', name: 'Vine Crawler', type: 'creature', element: 'earth', cost: 1, attack: 2, health: 1, keywords: ['swift'], tier: 'apprentice' },
  { id: 'earth_mushroom_guard', name: 'Mushroom Guard', type: 'creature', element: 'earth', cost: 2, attack: 1, health: 4, keywords: ['heal'], tier: 'apprentice' },
  { id: 'earth_boulder_bear', name: 'Boulder Bear', type: 'creature', element: 'earth', cost: 2, attack: 3, health: 2, keywords: [], tier: 'apprentice' },
  { id: 'earth_treant_sapling', name: 'Treant Sapling', type: 'creature', element: 'earth', cost: 3, attack: 2, health: 5, keywords: [], tier: 'apprentice' },
  { id: 'earth_crystal_stag', name: 'Crystal Stag', type: 'creature', element: 'earth', cost: 4, attack: 3, health: 5, keywords: ['draw'], tier: 'apprentice' },
  { id: 'earth_mountain_giant', name: 'Mountain Giant', type: 'creature', element: 'earth', cost: 5, attack: 4, health: 6, keywords: [], tier: 'apprentice' },

  // ─── Earth Spells ───
  { id: 'earth_entangle', name: 'Entangle', type: 'spell', element: 'earth', cost: 1, keywords: [], tier: 'apprentice', effectId: 'entangle', targetingType: EFFECT_REGISTRY.entangle.targetingType },
  { id: 'earth_earthquake', name: 'Earthquake', type: 'spell', element: 'earth', cost: 3, keywords: [], tier: 'apprentice', effectId: 'earthquake' },
  { id: 'earth_growth', name: 'Growth', type: 'spell', element: 'earth', cost: 2, keywords: [], tier: 'apprentice', effectId: 'growth', targetingType: EFFECT_REGISTRY.growth.targetingType },

  // ─── Air Creatures ───
  { id: 'air_breeze_fairy', name: 'Breeze Fairy', type: 'creature', element: 'air', cost: 1, attack: 1, health: 1, keywords: ['swift', 'draw'], tier: 'apprentice' },
  { id: 'air_cloud_kitten', name: 'Cloud Kitten', type: 'creature', element: 'air', cost: 1, attack: 1, health: 2, keywords: [], tier: 'apprentice' },
  { id: 'air_wind_hawk', name: 'Wind Hawk', type: 'creature', element: 'air', cost: 2, attack: 3, health: 1, keywords: ['swift'], tier: 'apprentice' },
  { id: 'air_storm_sprite', name: 'Storm Sprite', type: 'creature', element: 'air', cost: 2, attack: 2, health: 2, keywords: ['blast'], tier: 'apprentice' },
  { id: 'air_thunder_ram', name: 'Thunder Ram', type: 'creature', element: 'air', cost: 3, attack: 3, health: 3, keywords: [], tier: 'apprentice' },
  { id: 'air_sky_drake', name: 'Sky Drake', type: 'creature', element: 'air', cost: 4, attack: 4, health: 3, keywords: ['swift'], tier: 'apprentice' },
  { id: 'air_tempest_eagle', name: 'Tempest Eagle', type: 'creature', element: 'air', cost: 5, attack: 5, health: 5, keywords: [], tier: 'apprentice' },

  // ─── Air Spells ───
  { id: 'air_gust', name: 'Gust', type: 'spell', element: 'air', cost: 1, keywords: [], tier: 'apprentice', effectId: 'gust', targetingType: EFFECT_REGISTRY.gust.targetingType },
  { id: 'air_lightning_bolt', name: 'Lightning Bolt', type: 'spell', element: 'air', cost: 2, keywords: [], tier: 'apprentice', effectId: 'lightning_bolt', targetingType: EFFECT_REGISTRY.lightning_bolt.targetingType },
  { id: 'air_tailwind', name: 'Tailwind', type: 'spell', element: 'air', cost: 3, keywords: [], tier: 'apprentice', effectId: 'tailwind' },

  // ─── Shadow Creatures ───
  { id: 'shadow_sneaky_cat', name: 'Sneaky Cat', type: 'creature', element: 'shadow', cost: 1, attack: 2, health: 1, keywords: ['swift'], tier: 'apprentice' },
  { id: 'shadow_bat_swarm', name: 'Bat Swarm', type: 'creature', element: 'shadow', cost: 2, attack: 2, health: 2, keywords: ['blast'], tier: 'apprentice' },
  { id: 'shadow_shade_wolf', name: 'Shade Wolf', type: 'creature', element: 'shadow', cost: 2, attack: 3, health: 1, keywords: [], tier: 'apprentice' },
  { id: 'shadow_ghost_knight', name: 'Ghost Knight', type: 'creature', element: 'shadow', cost: 3, attack: 3, health: 3, keywords: [], tier: 'apprentice', effectId: 'ghost_knight_etb' },
  { id: 'shadow_nightmare_steed', name: 'Nightmare Steed', type: 'creature', element: 'shadow', cost: 3, attack: 2, health: 4, keywords: [], tier: 'apprentice' },
  { id: 'shadow_vampire_lord', name: 'Vampire Lord', type: 'creature', element: 'shadow', cost: 4, attack: 4, health: 3, keywords: ['lifesteal'], tier: 'apprentice' },
  { id: 'shadow_shadow_dragon', name: 'Shadow Dragon', type: 'creature', element: 'shadow', cost: 5, attack: 5, health: 5, keywords: [], tier: 'apprentice', effectId: 'shadow_dragon_etb' },

  // ─── Shadow Spells ───
  { id: 'shadow_dark_bolt', name: 'Dark Bolt', type: 'spell', element: 'shadow', cost: 1, keywords: [], tier: 'apprentice', effectId: 'dark_bolt', targetingType: EFFECT_REGISTRY.dark_bolt.targetingType },
  { id: 'shadow_life_drain', name: 'Life Drain', type: 'spell', element: 'shadow', cost: 3, keywords: [], tier: 'apprentice', effectId: 'life_drain' },
  { id: 'shadow_doom', name: 'Doom', type: 'spell', element: 'shadow', cost: 4, keywords: [], tier: 'apprentice', effectId: 'doom', targetingType: EFFECT_REGISTRY.doom.targetingType },
];

export const CARD_REGISTRY: Record<string, CardDefinition> = Object.fromEntries(
  ALL_CARDS.map((card) => [card.id, card]),
);

export function getCardsByElement(element: Element): CardDefinition[] {
  return ALL_CARDS.filter((card) => card.element === element);
}

export function getCardsByTier(tier: Tier): CardDefinition[] {
  return ALL_CARDS.filter((card) => card.tier === tier);
}
