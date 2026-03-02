import type { Element, Tier } from './types';
import { TIER_ORDER } from './ruleset';
import { ALL_CARDS } from './cards';

export interface StarterDeck {
  name: string;
  elements: Element[];
  playstyle: string;
  type: 'mono' | 'allied';
}

// ─── Archetype Card ID Sets ───

const ORIGINAL_FIRE_IDS = [
  'fire_ember_sprite', 'fire_flame_fox', 'fire_lava_hound', 'fire_fire_dancer',
  'fire_magma_golem', 'fire_phoenix_chick', 'fire_dragon_whelp',
  'fire_fireball', 'fire_eruption', 'fire_blazing_speed',
];

const FIRE_FORGE_IDS = [
  'fire_spark_striker', 'fire_forge_guardian', 'fire_fury_hound', 'fire_magma_sentinel',
  'fire_forge_hammer',
];

const FIRE_ARCHMAGE_IDS = [
  'fire_cinder_viper', 'fire_flameheart_knight', 'fire_inferno_dragon',
  'fire_furnace_blast', 'fire_flame_wave',
];

const ORIGINAL_WATER_IDS = [
  'water_tide_sprite', 'water_shell_crab', 'water_river_otter', 'water_coral_guardian',
  'water_storm_turtle', 'water_frost_serpent', 'water_tidal_whale',
  'water_splash', 'water_tidal_wave', 'water_healing_rain',
];

const WATER_DEPTHS_IDS = [
  'water_pearl_turtle', 'water_reef_shark', 'water_armored_seahorse', 'water_depth_leviathan',
  'water_riptide',
];

const WATER_ARCHMAGE_IDS = [
  'water_jellyfish_swarm', 'water_vampire_eel', 'water_kraken',
  'water_tidal_surge', 'water_maelstrom',
];

const ORIGINAL_SHADOW_IDS = [
  'shadow_sneaky_cat', 'shadow_bat_swarm', 'shadow_shade_wolf', 'shadow_ghost_knight',
  'shadow_nightmare_steed', 'shadow_vampire_lord', 'shadow_shadow_dragon',
  'shadow_dark_bolt', 'shadow_life_drain', 'shadow_doom',
];

const SHADOW_DREAD_IDS = [
  'shadow_venom_wisp', 'shadow_bone_sentinel', 'shadow_blood_raven', 'shadow_dread_knight',
  'shadow_shadow_strike',
];

const SHADOW_ARCHMAGE_IDS = [
  'shadow_shadow_asp', 'shadow_deaths_hand', 'shadow_abyssal_reaper',
  'shadow_soul_siphon', 'shadow_void_storm',
];

const ORIGINAL_AIR_IDS = [
  'air_breeze_fairy', 'air_cloud_kitten', 'air_wind_hawk', 'air_storm_sprite',
  'air_thunder_ram', 'air_sky_drake', 'air_tempest_eagle',
  'air_gust', 'air_lightning_bolt', 'air_tailwind',
];

const ANGEL_IDS = [
  'air_acolyte', 'air_temple_dove', 'air_priestess_of_light', 'air_angelic_scribe',
  'air_celestial_monk', 'air_archangel', 'air_seraph',
  'air_soothe', 'air_blessing', 'air_radiance',
];

const ORIGINAL_EARTH_IDS = [
  'earth_pebble_pup', 'earth_vine_crawler', 'earth_mushroom_guard', 'earth_boulder_bear',
  'earth_treant_sapling', 'earth_crystal_stag', 'earth_mountain_giant',
  'earth_entangle', 'earth_earthquake', 'earth_growth',
];

const DINOSAUR_IDS = [
  'earth_dino_hatchling', 'earth_raptor', 'earth_spike_tail', 'earth_triceratops_calf',
  'earth_pteranodon', 'earth_stegosaurus', 'earth_tyrant_rex',
  'earth_primal_roar', 'earth_tar_pit', 'earth_meteor_strike',
];

// ─── Curated Subsets for Archmage (5 best apprentice cards kept per element) ───

const FIRE_ARCHMAGE_KEPT = [
  'fire_ember_sprite', 'fire_fire_dancer', 'fire_magma_golem', 'fire_phoenix_chick', 'fire_dragon_whelp',
];

const WATER_ARCHMAGE_KEPT = [
  'water_tide_sprite', 'water_river_otter', 'water_storm_turtle', 'water_frost_serpent', 'water_tidal_whale',
];

const SHADOW_ARCHMAGE_KEPT = [
  'shadow_bat_swarm', 'shadow_ghost_knight', 'shadow_vampire_lord', 'shadow_shadow_dragon', 'shadow_doom',
];

// ─── Curated Subsets for Allied Decks ───

const STORMFRONT_ANGEL_PICKS = [
  'air_acolyte', 'air_priestess_of_light', 'air_angelic_scribe', 'air_archangel', 'air_soothe',
];

const DEEPWOOD_DINO_PICKS = [
  'earth_raptor', 'earth_spike_tail', 'earth_stegosaurus', 'earth_tyrant_rex', 'earth_tar_pit',
];

// ─── Starter Decks ───

export const STARTER_DECKS: StarterDeck[] = [
  // Mono decks
  { name: 'Inferno', elements: ['fire'], playstyle: 'Aggressive burns and swift attackers', type: 'mono' },
  { name: 'Tidepool', elements: ['water'], playstyle: 'Healing, card draw, and tough defenders', type: 'mono' },
  { name: 'Deepwood', elements: ['earth'], playstyle: 'Sturdy creatures and steady growth', type: 'mono' },
  { name: 'Stormfront', elements: ['air'], playstyle: 'Fast strikers and tricky spells', type: 'mono' },
  { name: 'Nightfall', elements: ['shadow'], playstyle: 'Ruthless removal and power plays', type: 'mono' },
  // Themed archetype decks
  { name: 'Divine Light', elements: ['air'], playstyle: 'Healing angels and protective blessings', type: 'mono' },
  { name: 'Jurassic', elements: ['earth'], playstyle: 'Massive dinosaurs and primal power', type: 'mono' },
  // Allied pair decks
  { name: 'Tsunami', elements: ['water', 'air'], playstyle: 'Evasive tempo with card advantage', type: 'allied' },
  { name: 'Ancient Grove', elements: ['air', 'earth'], playstyle: 'Swift creatures backed by sturdy walls', type: 'allied' },
  { name: 'Wildfire', elements: ['earth', 'fire'], playstyle: 'Big creatures with burn backup', type: 'allied' },
  { name: 'Hellfire', elements: ['fire', 'shadow'], playstyle: 'Aggressive damage and removal', type: 'allied' },
  { name: 'Deep Dark', elements: ['shadow', 'water'], playstyle: 'Draining life while drawing cards', type: 'allied' },
];

// ─── Card Pool Builders (per element × tier) ───

/**
 * Returns the unique card IDs available for an element at a given tier.
 * - Apprentice: 10 original cards
 * - Alchemist: 10 original + 5 alchemist = 15
 * - Archmage: 5 best apprentice + 5 alchemist + 5 archmage = 15
 */
function getElementPool(element: Element, tier: Tier, deckName: string): string[] {
  const tierIndex = TIER_ORDER.indexOf(tier);

  switch (element) {
    case 'fire': {
      if (tierIndex >= 2) return [...FIRE_ARCHMAGE_KEPT, ...FIRE_FORGE_IDS, ...FIRE_ARCHMAGE_IDS];
      if (tierIndex >= 1) return [...ORIGINAL_FIRE_IDS, ...FIRE_FORGE_IDS];
      return [...ORIGINAL_FIRE_IDS];
    }
    case 'water': {
      if (tierIndex >= 2) return [...WATER_ARCHMAGE_KEPT, ...WATER_DEPTHS_IDS, ...WATER_ARCHMAGE_IDS];
      if (tierIndex >= 1) return [...ORIGINAL_WATER_IDS, ...WATER_DEPTHS_IDS];
      return [...ORIGINAL_WATER_IDS];
    }
    case 'shadow': {
      if (tierIndex >= 2) return [...SHADOW_ARCHMAGE_KEPT, ...SHADOW_DREAD_IDS, ...SHADOW_ARCHMAGE_IDS];
      if (tierIndex >= 1) return [...ORIGINAL_SHADOW_IDS, ...SHADOW_DREAD_IDS];
      return [...ORIGINAL_SHADOW_IDS];
    }
    case 'air': {
      // Air has two sub-archetypes but no alchemist/archmage cards
      if (deckName === 'Divine Light') return ANGEL_IDS;
      if (deckName === 'Stormfront') {
        if (tierIndex >= 1) return [...ORIGINAL_AIR_IDS, ...STORMFRONT_ANGEL_PICKS];
        return [...ORIGINAL_AIR_IDS];
      }
      return [...ORIGINAL_AIR_IDS];
    }
    case 'earth': {
      if (deckName === 'Jurassic') return DINOSAUR_IDS;
      if (deckName === 'Deepwood') {
        if (tierIndex >= 1) return [...ORIGINAL_EARTH_IDS, ...DEEPWOOD_DINO_PICKS];
        return [...ORIGINAL_EARTH_IDS];
      }
      return [...ORIGINAL_EARTH_IDS];
    }
  }
}

/**
 * Returns the card pool for an allied deck's element contribution.
 * Uses the alchemist/archmage pool for that element.
 */
function getAlliedElementPool(element: Element, tier: Tier): string[] {
  const tierIndex = TIER_ORDER.indexOf(tier);

  switch (element) {
    case 'fire': {
      if (tierIndex >= 2) return [...FIRE_ARCHMAGE_KEPT, ...FIRE_FORGE_IDS, ...FIRE_ARCHMAGE_IDS];
      if (tierIndex >= 1) return [...ORIGINAL_FIRE_IDS, ...FIRE_FORGE_IDS];
      return [...ORIGINAL_FIRE_IDS];
    }
    case 'water': {
      if (tierIndex >= 2) return [...WATER_ARCHMAGE_KEPT, ...WATER_DEPTHS_IDS, ...WATER_ARCHMAGE_IDS];
      if (tierIndex >= 1) return [...ORIGINAL_WATER_IDS, ...WATER_DEPTHS_IDS];
      return [...ORIGINAL_WATER_IDS];
    }
    case 'shadow': {
      if (tierIndex >= 2) return [...SHADOW_ARCHMAGE_KEPT, ...SHADOW_DREAD_IDS, ...SHADOW_ARCHMAGE_IDS];
      if (tierIndex >= 1) return [...ORIGINAL_SHADOW_IDS, ...SHADOW_DREAD_IDS];
      return [...ORIGINAL_SHADOW_IDS];
    }
    case 'air': {
      // For allied decks, use original air + curated angel picks at alchemist+
      if (tierIndex >= 1) return [...ORIGINAL_AIR_IDS, ...STORMFRONT_ANGEL_PICKS];
      return [...ORIGINAL_AIR_IDS];
    }
    case 'earth': {
      if (tierIndex >= 1) return [...ORIGINAL_EARTH_IDS, ...DEEPWOOD_DINO_PICKS];
      return [...ORIGINAL_EARTH_IDS];
    }
  }
}

// ─── Build Function ───

/**
 * Builds a starter deck's card ID list for a given tier.
 * - Apprentice mono: 10 unique × 2 copies = 20 cards
 * - Alchemist/Archmage mono: 15 unique × 2 copies = 30 cards
 * - Apprentice allied: 10 + 10 = 20 cards (1 copy each)
 * - Alchemist/Archmage allied: 15 + 15 = 30 cards (1 copy each)
 */
export function buildStarterDeck(deck: StarterDeck, tier: Tier): string[] {
  if (deck.type === 'mono') {
    const pool = getElementPool(deck.elements[0], tier, deck.name);
    return pool.flatMap((id) => [id, id]);
  }

  // Allied: 1 copy of each card from both elements
  const pool0 = getAlliedElementPool(deck.elements[0], tier);
  const pool1 = getAlliedElementPool(deck.elements[1], tier);
  return [...pool0, ...pool1];
}

/**
 * Returns all card IDs that are eligible for a given tier (for deck builder filtering).
 * A card is eligible if its tier is at or below the requested tier in the tier order.
 */
export function getCardsForTier(tier: Tier): string[] {
  const tierIndex = TIER_ORDER.indexOf(tier);
  return ALL_CARDS
    .filter((c) => TIER_ORDER.indexOf(c.tier) <= tierIndex)
    .map((c) => c.id);
}
