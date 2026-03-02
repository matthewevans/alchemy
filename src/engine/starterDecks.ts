import type { Element, Tier } from './types';
import { TIER_ORDER } from './ruleset';
import { ALL_CARDS } from './cards';

// ─── Types ───

export interface StarterDeck {
  name: string;
  elements: Element[];
  playstyle: string;
  type: 'mono' | 'allied';
  cards: Record<Tier, string[]>;
}

// ─── Helpers ───

/** Readable deck definition: deck(['fire_ember_sprite', 2], ['fire_fireball', 1]) → [id, id, id] */
function deck(...entries: [string, number][]): string[] {
  return entries.flatMap(([id, count]) => Array(count).fill(id));
}

// ─── Starter Decks ───

export const STARTER_DECKS: StarterDeck[] = [

  // ════════════════════════════════════════════
  //  MONO DECKS
  // ════════════════════════════════════════════

  // ── Inferno (Fire) ──
  {
    name: 'Inferno',
    elements: ['fire'],
    playstyle: 'Aggressive burns and swift attackers',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['fire_ember_sprite', 2], ['fire_flame_fox', 2], ['fire_lava_hound', 2],
        ['fire_fire_dancer', 2], ['fire_magma_golem', 2], ['fire_phoenix_chick', 2],
        ['fire_dragon_whelp', 2], ['fire_fireball', 2], ['fire_eruption', 2],
        ['fire_blazing_speed', 2],
      ),
      alchemist: deck(
        ['fire_ember_sprite', 2], ['fire_flame_fox', 2], ['fire_lava_hound', 2],
        ['fire_fire_dancer', 2], ['fire_magma_golem', 2], ['fire_phoenix_chick', 2],
        ['fire_dragon_whelp', 2], ['fire_fireball', 2], ['fire_eruption', 2],
        ['fire_blazing_speed', 2],
        ['fire_forge_guardian', 2], ['fire_spark_striker', 2], ['fire_fury_hound', 2],
        ['fire_magma_sentinel', 2], ['fire_forge_hammer', 2],
      ),
      archmage: deck(
        ['fire_ember_sprite', 2], ['fire_fire_dancer', 2], ['fire_magma_golem', 2],
        ['fire_phoenix_chick', 2], ['fire_dragon_whelp', 2],
        ['fire_forge_guardian', 2], ['fire_spark_striker', 2], ['fire_fury_hound', 2],
        ['fire_magma_sentinel', 2], ['fire_forge_hammer', 2],
        ['fire_cinder_viper', 2], ['fire_flameheart_knight', 2], ['fire_inferno_dragon', 2],
        ['fire_furnace_blast', 2], ['fire_flame_wave', 2],
      ),
    },
  },

  // ── Tidepool (Water) ──
  {
    name: 'Tidepool',
    elements: ['water'],
    playstyle: 'Healing, card draw, and tough defenders',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['water_tide_sprite', 2], ['water_shell_crab', 2], ['water_river_otter', 2],
        ['water_coral_guardian', 2], ['water_storm_turtle', 2], ['water_frost_serpent', 2],
        ['water_tidal_whale', 2], ['water_splash', 2], ['water_tidal_wave', 2],
        ['water_healing_rain', 2],
      ),
      alchemist: deck(
        ['water_tide_sprite', 2], ['water_shell_crab', 2], ['water_river_otter', 2],
        ['water_coral_guardian', 2], ['water_storm_turtle', 2], ['water_frost_serpent', 2],
        ['water_tidal_whale', 2], ['water_splash', 2], ['water_tidal_wave', 2],
        ['water_healing_rain', 2],
        ['water_pearl_turtle', 2], ['water_reef_shark', 2], ['water_armored_seahorse', 2],
        ['water_depth_leviathan', 2], ['water_riptide', 2],
      ),
      archmage: deck(
        ['water_tide_sprite', 2], ['water_river_otter', 2], ['water_storm_turtle', 2],
        ['water_frost_serpent', 2], ['water_tidal_whale', 2],
        ['water_pearl_turtle', 2], ['water_reef_shark', 2], ['water_armored_seahorse', 2],
        ['water_depth_leviathan', 2], ['water_riptide', 2],
        ['water_jellyfish_swarm', 2], ['water_vampire_eel', 2], ['water_kraken', 2],
        ['water_tidal_surge', 2], ['water_maelstrom', 2],
      ),
    },
  },

  // ── Deepwood (Earth) ──
  {
    name: 'Deepwood',
    elements: ['earth'],
    playstyle: 'Sturdy creatures and steady growth',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['earth_pebble_pup', 2], ['earth_vine_crawler', 2], ['earth_mushroom_guard', 2],
        ['earth_boulder_bear', 2], ['earth_treant_sapling', 2], ['earth_crystal_stag', 2],
        ['earth_mountain_giant', 2], ['earth_entangle', 2], ['earth_earthquake', 2],
        ['earth_growth', 2],
      ),
      alchemist: deck(
        ['earth_pebble_pup', 2], ['earth_vine_crawler', 2], ['earth_mushroom_guard', 2],
        ['earth_boulder_bear', 2], ['earth_treant_sapling', 2], ['earth_crystal_stag', 2],
        ['earth_mountain_giant', 2], ['earth_entangle', 2], ['earth_earthquake', 2],
        ['earth_growth', 2],
        ['earth_raptor', 2], ['earth_spike_tail', 2], ['earth_stegosaurus', 2],
        ['earth_tyrant_rex', 2], ['earth_tar_pit', 2],
      ),
      archmage: deck(
        ['earth_pebble_pup', 2], ['earth_vine_crawler', 2], ['earth_mushroom_guard', 2],
        ['earth_boulder_bear', 2], ['earth_treant_sapling', 2], ['earth_crystal_stag', 2],
        ['earth_mountain_giant', 2], ['earth_entangle', 2], ['earth_earthquake', 2],
        ['earth_growth', 2],
        ['earth_raptor', 2], ['earth_spike_tail', 2], ['earth_stegosaurus', 2],
        ['earth_tyrant_rex', 2], ['earth_tar_pit', 2],
      ),
    },
  },

  // ── Stormfront (Air) ──
  {
    name: 'Stormfront',
    elements: ['air'],
    playstyle: 'Fast strikers and tricky spells',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['air_breeze_fairy', 2], ['air_cloud_kitten', 2], ['air_wind_hawk', 2],
        ['air_storm_sprite', 2], ['air_thunder_ram', 2], ['air_sky_drake', 2],
        ['air_tempest_eagle', 2], ['air_gust', 2], ['air_lightning_bolt', 2],
        ['air_tailwind', 2],
      ),
      alchemist: deck(
        ['air_breeze_fairy', 2], ['air_cloud_kitten', 2], ['air_wind_hawk', 2],
        ['air_storm_sprite', 2], ['air_thunder_ram', 2], ['air_sky_drake', 2],
        ['air_tempest_eagle', 2], ['air_gust', 2], ['air_lightning_bolt', 2],
        ['air_tailwind', 2],
        ['air_acolyte', 2], ['air_priestess_of_light', 2], ['air_angelic_scribe', 2],
        ['air_archangel', 2], ['air_soothe', 2],
      ),
      archmage: deck(
        ['air_breeze_fairy', 2], ['air_cloud_kitten', 2], ['air_wind_hawk', 2],
        ['air_storm_sprite', 2], ['air_thunder_ram', 2], ['air_sky_drake', 2],
        ['air_tempest_eagle', 2], ['air_gust', 2], ['air_lightning_bolt', 2],
        ['air_tailwind', 2],
        ['air_acolyte', 2], ['air_priestess_of_light', 2], ['air_angelic_scribe', 2],
        ['air_archangel', 2], ['air_soothe', 2],
      ),
    },
  },

  // ── Nightfall (Shadow) ──
  {
    name: 'Nightfall',
    elements: ['shadow'],
    playstyle: 'Ruthless removal and power plays',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['shadow_sneaky_cat', 2], ['shadow_bat_swarm', 2], ['shadow_shade_wolf', 2],
        ['shadow_ghost_knight', 2], ['shadow_nightmare_steed', 2], ['shadow_vampire_lord', 2],
        ['shadow_shadow_dragon', 2], ['shadow_dark_bolt', 2], ['shadow_life_drain', 2],
        ['shadow_doom', 2],
      ),
      alchemist: deck(
        ['shadow_sneaky_cat', 2], ['shadow_bat_swarm', 2], ['shadow_shade_wolf', 2],
        ['shadow_ghost_knight', 2], ['shadow_nightmare_steed', 2], ['shadow_vampire_lord', 2],
        ['shadow_shadow_dragon', 2], ['shadow_dark_bolt', 2], ['shadow_life_drain', 2],
        ['shadow_doom', 2],
        ['shadow_venom_wisp', 2], ['shadow_bone_sentinel', 2], ['shadow_blood_raven', 2],
        ['shadow_dread_knight', 2], ['shadow_shadow_strike', 2],
      ),
      archmage: deck(
        ['shadow_bat_swarm', 2], ['shadow_ghost_knight', 2], ['shadow_vampire_lord', 2],
        ['shadow_shadow_dragon', 2], ['shadow_doom', 2],
        ['shadow_venom_wisp', 2], ['shadow_bone_sentinel', 2], ['shadow_blood_raven', 2],
        ['shadow_dread_knight', 2], ['shadow_shadow_strike', 2],
        ['shadow_shadow_asp', 2], ['shadow_deaths_hand', 2], ['shadow_abyssal_reaper', 2],
        ['shadow_soul_siphon', 2], ['shadow_void_storm', 2],
      ),
    },
  },

  // ════════════════════════════════════════════
  //  THEMED ARCHETYPE DECKS
  // ════════════════════════════════════════════

  // ── Divine Light (Air — Angels) ──
  {
    name: 'Divine Light',
    elements: ['air'],
    playstyle: 'Healing angels and protective blessings',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['air_acolyte', 2], ['air_temple_dove', 2], ['air_priestess_of_light', 2],
        ['air_angelic_scribe', 2], ['air_celestial_monk', 2], ['air_archangel', 2],
        ['air_seraph', 2], ['air_soothe', 2], ['air_blessing', 2],
        ['air_radiance', 2],
      ),
      alchemist: deck(
        ['air_acolyte', 2], ['air_temple_dove', 2], ['air_priestess_of_light', 2],
        ['air_angelic_scribe', 2], ['air_celestial_monk', 2], ['air_archangel', 2],
        ['air_seraph', 2], ['air_soothe', 2], ['air_blessing', 2],
        ['air_radiance', 2],
        ['air_cloud_kitten', 2], ['air_thunder_ram', 2], ['air_lightning_bolt', 2],
        ['air_gust', 2], ['air_tailwind', 2],
      ),
      archmage: deck(
        ['air_acolyte', 2], ['air_temple_dove', 2], ['air_priestess_of_light', 2],
        ['air_angelic_scribe', 2], ['air_celestial_monk', 2], ['air_archangel', 2],
        ['air_seraph', 2], ['air_soothe', 2], ['air_blessing', 2],
        ['air_radiance', 2],
        ['air_cloud_kitten', 2], ['air_thunder_ram', 2], ['air_lightning_bolt', 2],
        ['air_gust', 2], ['air_tailwind', 2],
      ),
    },
  },

  // ── Jurassic (Earth — Dinosaurs) ──
  {
    name: 'Jurassic',
    elements: ['earth'],
    playstyle: 'Massive dinosaurs and primal power',
    type: 'mono',
    cards: {
      apprentice: deck(
        ['earth_dino_hatchling', 2], ['earth_raptor', 2], ['earth_spike_tail', 2],
        ['earth_triceratops_calf', 2], ['earth_pteranodon', 2], ['earth_stegosaurus', 2],
        ['earth_tyrant_rex', 2], ['earth_primal_roar', 2], ['earth_tar_pit', 2],
        ['earth_meteor_strike', 2],
      ),
      alchemist: deck(
        ['earth_dino_hatchling', 2], ['earth_raptor', 2], ['earth_spike_tail', 2],
        ['earth_triceratops_calf', 2], ['earth_pteranodon', 2], ['earth_stegosaurus', 2],
        ['earth_tyrant_rex', 2], ['earth_primal_roar', 2], ['earth_tar_pit', 2],
        ['earth_meteor_strike', 2],
        ['earth_pebble_pup', 2], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_growth', 2],
      ),
      archmage: deck(
        ['earth_dino_hatchling', 2], ['earth_raptor', 2], ['earth_spike_tail', 2],
        ['earth_triceratops_calf', 2], ['earth_pteranodon', 2], ['earth_stegosaurus', 2],
        ['earth_tyrant_rex', 2], ['earth_primal_roar', 2], ['earth_tar_pit', 2],
        ['earth_meteor_strike', 2],
        ['earth_pebble_pup', 2], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_growth', 2],
      ),
    },
  },

  // ════════════════════════════════════════════
  //  ALLIED PAIR DECKS (existing)
  // ════════════════════════════════════════════

  // ── Tsunami (Water + Air) ──
  {
    name: 'Tsunami',
    elements: ['water', 'air'],
    playstyle: 'Evasive tempo with card advantage',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['water_tide_sprite', 1], ['water_shell_crab', 1], ['water_river_otter', 1],
        ['water_coral_guardian', 1], ['water_storm_turtle', 1], ['water_frost_serpent', 1],
        ['water_tidal_whale', 1], ['water_splash', 1], ['water_tidal_wave', 1],
        ['water_healing_rain', 1],
        ['air_breeze_fairy', 1], ['air_cloud_kitten', 1], ['air_wind_hawk', 1],
        ['air_storm_sprite', 1], ['air_thunder_ram', 1], ['air_sky_drake', 1],
        ['air_tempest_eagle', 1], ['air_gust', 1], ['air_lightning_bolt', 1],
        ['air_tailwind', 1],
      ),
      alchemist: deck(
        ['water_tide_sprite', 1], ['water_shell_crab', 1], ['water_river_otter', 1],
        ['water_coral_guardian', 1], ['water_storm_turtle', 1], ['water_frost_serpent', 1],
        ['water_tidal_whale', 1], ['water_splash', 1], ['water_tidal_wave', 1],
        ['water_healing_rain', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
        ['air_breeze_fairy', 1], ['air_cloud_kitten', 1], ['air_wind_hawk', 1],
        ['air_storm_sprite', 1], ['air_thunder_ram', 1], ['air_sky_drake', 1],
        ['air_tempest_eagle', 1], ['air_gust', 1], ['air_lightning_bolt', 1],
        ['air_tailwind', 1],
        ['air_acolyte', 1], ['air_priestess_of_light', 1], ['air_angelic_scribe', 1],
        ['air_archangel', 1], ['air_soothe', 1],
      ),
      archmage: deck(
        ['water_tide_sprite', 1], ['water_river_otter', 1], ['water_storm_turtle', 1],
        ['water_frost_serpent', 1], ['water_tidal_whale', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
        ['water_jellyfish_swarm', 1], ['water_vampire_eel', 1], ['water_kraken', 1],
        ['water_tidal_surge', 1], ['water_maelstrom', 1],
        ['air_breeze_fairy', 1], ['air_cloud_kitten', 1], ['air_wind_hawk', 1],
        ['air_storm_sprite', 1], ['air_thunder_ram', 1], ['air_sky_drake', 1],
        ['air_tempest_eagle', 1], ['air_gust', 1], ['air_lightning_bolt', 1],
        ['air_tailwind', 1],
        ['air_acolyte', 1], ['air_priestess_of_light', 1], ['air_angelic_scribe', 1],
        ['air_archangel', 1], ['air_soothe', 1],
      ),
    },
  },

  // ── Ancient Grove (Air + Earth) ──
  {
    name: 'Ancient Grove',
    elements: ['air', 'earth'],
    playstyle: 'Swift creatures backed by sturdy walls',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['air_breeze_fairy', 1], ['air_cloud_kitten', 1], ['air_wind_hawk', 1],
        ['air_storm_sprite', 1], ['air_thunder_ram', 1], ['air_sky_drake', 1],
        ['air_tempest_eagle', 1], ['air_gust', 1], ['air_lightning_bolt', 1],
        ['air_tailwind', 1],
        ['earth_pebble_pup', 1], ['earth_vine_crawler', 1], ['earth_mushroom_guard', 1],
        ['earth_boulder_bear', 1], ['earth_treant_sapling', 1], ['earth_crystal_stag', 1],
        ['earth_mountain_giant', 1], ['earth_entangle', 1], ['earth_earthquake', 1],
        ['earth_growth', 1],
      ),
      alchemist: deck(
        ['air_breeze_fairy', 1], ['air_cloud_kitten', 1], ['air_wind_hawk', 1],
        ['air_storm_sprite', 1], ['air_thunder_ram', 1], ['air_sky_drake', 1],
        ['air_tempest_eagle', 1], ['air_gust', 1], ['air_lightning_bolt', 1],
        ['air_tailwind', 1],
        ['air_acolyte', 1], ['air_priestess_of_light', 1], ['air_angelic_scribe', 1],
        ['air_archangel', 1], ['air_soothe', 1],
        ['earth_pebble_pup', 1], ['earth_vine_crawler', 1], ['earth_mushroom_guard', 1],
        ['earth_boulder_bear', 1], ['earth_treant_sapling', 1], ['earth_crystal_stag', 1],
        ['earth_mountain_giant', 1], ['earth_entangle', 1], ['earth_earthquake', 1],
        ['earth_growth', 1],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
      ),
      archmage: deck(
        ['air_breeze_fairy', 1], ['air_cloud_kitten', 1], ['air_wind_hawk', 1],
        ['air_storm_sprite', 1], ['air_thunder_ram', 1], ['air_sky_drake', 1],
        ['air_tempest_eagle', 1], ['air_gust', 1], ['air_lightning_bolt', 1],
        ['air_tailwind', 1],
        ['air_acolyte', 1], ['air_priestess_of_light', 1], ['air_angelic_scribe', 1],
        ['air_archangel', 1], ['air_soothe', 1],
        ['earth_pebble_pup', 1], ['earth_vine_crawler', 1], ['earth_mushroom_guard', 1],
        ['earth_boulder_bear', 1], ['earth_treant_sapling', 1], ['earth_crystal_stag', 1],
        ['earth_mountain_giant', 1], ['earth_entangle', 1], ['earth_earthquake', 1],
        ['earth_growth', 1],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
      ),
    },
  },

  // ── Wildfire (Earth + Fire) ──
  {
    name: 'Wildfire',
    elements: ['earth', 'fire'],
    playstyle: 'Big creatures with burn backup',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['earth_pebble_pup', 1], ['earth_vine_crawler', 1], ['earth_mushroom_guard', 1],
        ['earth_boulder_bear', 1], ['earth_treant_sapling', 1], ['earth_crystal_stag', 1],
        ['earth_mountain_giant', 1], ['earth_entangle', 1], ['earth_earthquake', 1],
        ['earth_growth', 1],
        ['fire_ember_sprite', 1], ['fire_flame_fox', 1], ['fire_lava_hound', 1],
        ['fire_fire_dancer', 1], ['fire_magma_golem', 1], ['fire_phoenix_chick', 1],
        ['fire_dragon_whelp', 1], ['fire_fireball', 1], ['fire_eruption', 1],
        ['fire_blazing_speed', 1],
      ),
      alchemist: deck(
        ['earth_pebble_pup', 1], ['earth_vine_crawler', 1], ['earth_mushroom_guard', 1],
        ['earth_boulder_bear', 1], ['earth_treant_sapling', 1], ['earth_crystal_stag', 1],
        ['earth_mountain_giant', 1], ['earth_entangle', 1], ['earth_earthquake', 1],
        ['earth_growth', 1],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
        ['fire_ember_sprite', 1], ['fire_flame_fox', 1], ['fire_lava_hound', 1],
        ['fire_fire_dancer', 1], ['fire_magma_golem', 1], ['fire_phoenix_chick', 1],
        ['fire_dragon_whelp', 1], ['fire_fireball', 1], ['fire_eruption', 1],
        ['fire_blazing_speed', 1],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
      ),
      archmage: deck(
        ['earth_pebble_pup', 1], ['earth_vine_crawler', 1], ['earth_mushroom_guard', 1],
        ['earth_boulder_bear', 1], ['earth_treant_sapling', 1], ['earth_crystal_stag', 1],
        ['earth_mountain_giant', 1], ['earth_entangle', 1], ['earth_earthquake', 1],
        ['earth_growth', 1],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
        ['fire_ember_sprite', 1], ['fire_fire_dancer', 1], ['fire_magma_golem', 1],
        ['fire_phoenix_chick', 1], ['fire_dragon_whelp', 1],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['fire_cinder_viper', 1], ['fire_flameheart_knight', 1], ['fire_inferno_dragon', 1],
        ['fire_furnace_blast', 1], ['fire_flame_wave', 1],
      ),
    },
  },

  // ── Hellfire (Fire + Shadow) ──
  {
    name: 'Hellfire',
    elements: ['fire', 'shadow'],
    playstyle: 'Aggressive damage and removal',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['fire_ember_sprite', 1], ['fire_flame_fox', 1], ['fire_lava_hound', 1],
        ['fire_fire_dancer', 1], ['fire_magma_golem', 1], ['fire_phoenix_chick', 1],
        ['fire_dragon_whelp', 1], ['fire_fireball', 1], ['fire_eruption', 1],
        ['fire_blazing_speed', 1],
        ['shadow_sneaky_cat', 1], ['shadow_bat_swarm', 1], ['shadow_shade_wolf', 1],
        ['shadow_ghost_knight', 1], ['shadow_nightmare_steed', 1], ['shadow_vampire_lord', 1],
        ['shadow_shadow_dragon', 1], ['shadow_dark_bolt', 1], ['shadow_life_drain', 1],
        ['shadow_doom', 1],
      ),
      alchemist: deck(
        ['fire_ember_sprite', 1], ['fire_flame_fox', 1], ['fire_lava_hound', 1],
        ['fire_fire_dancer', 1], ['fire_magma_golem', 1], ['fire_phoenix_chick', 1],
        ['fire_dragon_whelp', 1], ['fire_fireball', 1], ['fire_eruption', 1],
        ['fire_blazing_speed', 1],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['shadow_sneaky_cat', 1], ['shadow_bat_swarm', 1], ['shadow_shade_wolf', 1],
        ['shadow_ghost_knight', 1], ['shadow_nightmare_steed', 1], ['shadow_vampire_lord', 1],
        ['shadow_shadow_dragon', 1], ['shadow_dark_bolt', 1], ['shadow_life_drain', 1],
        ['shadow_doom', 1],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
      ),
      archmage: deck(
        ['fire_ember_sprite', 1], ['fire_fire_dancer', 1], ['fire_magma_golem', 1],
        ['fire_phoenix_chick', 1], ['fire_dragon_whelp', 1],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['fire_cinder_viper', 1], ['fire_flameheart_knight', 1], ['fire_inferno_dragon', 1],
        ['fire_furnace_blast', 1], ['fire_flame_wave', 1],
        ['shadow_bat_swarm', 1], ['shadow_ghost_knight', 1], ['shadow_vampire_lord', 1],
        ['shadow_shadow_dragon', 1], ['shadow_doom', 1],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
        ['shadow_shadow_asp', 1], ['shadow_deaths_hand', 1], ['shadow_abyssal_reaper', 1],
        ['shadow_soul_siphon', 1], ['shadow_void_storm', 1],
      ),
    },
  },

  // ── Deep Dark (Shadow + Water) ──
  {
    name: 'Deep Dark',
    elements: ['shadow', 'water'],
    playstyle: 'Draining life while drawing cards',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['shadow_sneaky_cat', 1], ['shadow_bat_swarm', 1], ['shadow_shade_wolf', 1],
        ['shadow_ghost_knight', 1], ['shadow_nightmare_steed', 1], ['shadow_vampire_lord', 1],
        ['shadow_shadow_dragon', 1], ['shadow_dark_bolt', 1], ['shadow_life_drain', 1],
        ['shadow_doom', 1],
        ['water_tide_sprite', 1], ['water_shell_crab', 1], ['water_river_otter', 1],
        ['water_coral_guardian', 1], ['water_storm_turtle', 1], ['water_frost_serpent', 1],
        ['water_tidal_whale', 1], ['water_splash', 1], ['water_tidal_wave', 1],
        ['water_healing_rain', 1],
      ),
      alchemist: deck(
        ['shadow_sneaky_cat', 1], ['shadow_bat_swarm', 1], ['shadow_shade_wolf', 1],
        ['shadow_ghost_knight', 1], ['shadow_nightmare_steed', 1], ['shadow_vampire_lord', 1],
        ['shadow_shadow_dragon', 1], ['shadow_dark_bolt', 1], ['shadow_life_drain', 1],
        ['shadow_doom', 1],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
        ['water_tide_sprite', 1], ['water_shell_crab', 1], ['water_river_otter', 1],
        ['water_coral_guardian', 1], ['water_storm_turtle', 1], ['water_frost_serpent', 1],
        ['water_tidal_whale', 1], ['water_splash', 1], ['water_tidal_wave', 1],
        ['water_healing_rain', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
      ),
      archmage: deck(
        ['shadow_bat_swarm', 1], ['shadow_ghost_knight', 1], ['shadow_vampire_lord', 1],
        ['shadow_shadow_dragon', 1], ['shadow_doom', 1],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
        ['shadow_shadow_asp', 1], ['shadow_deaths_hand', 1], ['shadow_abyssal_reaper', 1],
        ['shadow_soul_siphon', 1], ['shadow_void_storm', 1],
        ['water_tide_sprite', 1], ['water_river_otter', 1], ['water_storm_turtle', 1],
        ['water_frost_serpent', 1], ['water_tidal_whale', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
        ['water_jellyfish_swarm', 1], ['water_vampire_eel', 1], ['water_kraken', 1],
        ['water_tidal_surge', 1], ['water_maelstrom', 1],
      ),
    },
  },

  // ════════════════════════════════════════════
  //  NEW DUAL-ELEMENT DECKS
  // ════════════════════════════════════════════

  // ── Flashfire (Fire + Air) — Swift creatures + burn reach ──
  {
    name: 'Flashfire',
    elements: ['fire', 'air'],
    playstyle: 'Swift creatures and burn reach',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['fire_ember_sprite', 2], ['fire_fire_dancer', 2], ['fire_phoenix_chick', 2],
        ['fire_fireball', 2], ['fire_blazing_speed', 1], ['fire_dragon_whelp', 1],
        ['air_breeze_fairy', 2], ['air_wind_hawk', 2], ['air_sky_drake', 2],
        ['air_lightning_bolt', 2], ['air_gust', 1], ['air_tailwind', 1],
      ),
      alchemist: deck(
        ['fire_ember_sprite', 2], ['fire_fire_dancer', 2], ['fire_phoenix_chick', 2],
        ['fire_fireball', 2], ['fire_blazing_speed', 1], ['fire_dragon_whelp', 1],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['air_breeze_fairy', 2], ['air_wind_hawk', 2], ['air_sky_drake', 2],
        ['air_lightning_bolt', 2], ['air_gust', 1], ['air_tailwind', 1],
        ['air_acolyte', 1], ['air_priestess_of_light', 1], ['air_angelic_scribe', 1],
        ['air_archangel', 1], ['air_soothe', 1],
      ),
      archmage: deck(
        ['fire_ember_sprite', 1], ['fire_fire_dancer', 1], ['fire_phoenix_chick', 1],
        ['fire_fireball', 2],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['fire_cinder_viper', 1], ['fire_flameheart_knight', 1], ['fire_inferno_dragon', 1],
        ['fire_furnace_blast', 1], ['fire_flame_wave', 1],
        ['air_breeze_fairy', 2], ['air_wind_hawk', 2], ['air_sky_drake', 2],
        ['air_lightning_bolt', 2], ['air_gust', 1], ['air_tailwind', 1],
        ['air_acolyte', 1], ['air_priestess_of_light', 1], ['air_angelic_scribe', 1],
        ['air_archangel', 1], ['air_soothe', 1],
      ),
    },
  },

  // ── Scalding Depths (Fire + Water) — Burn + card draw/defense ──
  {
    name: 'Scalding Depths',
    elements: ['fire', 'water'],
    playstyle: 'Burn and card draw with defense',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['fire_ember_sprite', 2], ['fire_fire_dancer', 2], ['fire_magma_golem', 2],
        ['fire_fireball', 2], ['fire_eruption', 1], ['fire_blazing_speed', 1],
        ['water_tide_sprite', 2], ['water_river_otter', 2], ['water_storm_turtle', 2],
        ['water_splash', 2], ['water_frost_serpent', 1], ['water_healing_rain', 1],
      ),
      alchemist: deck(
        ['fire_ember_sprite', 2], ['fire_fire_dancer', 2], ['fire_magma_golem', 2],
        ['fire_fireball', 2], ['fire_eruption', 1], ['fire_blazing_speed', 1],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['water_tide_sprite', 2], ['water_river_otter', 2], ['water_storm_turtle', 2],
        ['water_splash', 2], ['water_frost_serpent', 1], ['water_healing_rain', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
      ),
      archmage: deck(
        ['fire_ember_sprite', 1], ['fire_fire_dancer', 1], ['fire_magma_golem', 1],
        ['fire_fireball', 2],
        ['fire_forge_guardian', 1], ['fire_spark_striker', 1], ['fire_fury_hound', 1],
        ['fire_magma_sentinel', 1], ['fire_forge_hammer', 1],
        ['fire_cinder_viper', 1], ['fire_flameheart_knight', 1], ['fire_inferno_dragon', 1],
        ['fire_furnace_blast', 1], ['fire_flame_wave', 1],
        ['water_tide_sprite', 1], ['water_river_otter', 1], ['water_storm_turtle', 2],
        ['water_splash', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
        ['water_jellyfish_swarm', 1], ['water_vampire_eel', 1], ['water_kraken', 1],
        ['water_tidal_surge', 1], ['water_maelstrom', 1],
      ),
    },
  },

  // ── Living Fortress (Water + Earth) — Walls + fatties ──
  {
    name: 'Living Fortress',
    elements: ['water', 'earth'],
    playstyle: 'Walls and massive creatures',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['water_tide_sprite', 2], ['water_shell_crab', 2], ['water_coral_guardian', 2],
        ['water_storm_turtle', 2], ['water_splash', 1], ['water_healing_rain', 1],
        ['earth_pebble_pup', 1], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_mountain_giant', 2], ['earth_growth', 1],
      ),
      alchemist: deck(
        ['water_tide_sprite', 2], ['water_shell_crab', 2], ['water_coral_guardian', 2],
        ['water_storm_turtle', 2], ['water_splash', 1], ['water_healing_rain', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
        ['earth_pebble_pup', 1], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_mountain_giant', 2], ['earth_growth', 1],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
      ),
      archmage: deck(
        ['water_tide_sprite', 1], ['water_shell_crab', 1], ['water_coral_guardian', 1],
        ['water_storm_turtle', 1], ['water_splash', 1],
        ['water_pearl_turtle', 1], ['water_reef_shark', 1], ['water_armored_seahorse', 1],
        ['water_depth_leviathan', 1], ['water_riptide', 1],
        ['water_jellyfish_swarm', 1], ['water_vampire_eel', 1], ['water_kraken', 1],
        ['water_tidal_surge', 1], ['water_maelstrom', 1],
        ['earth_pebble_pup', 1], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_mountain_giant', 2], ['earth_growth', 1],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
      ),
    },
  },

  // ── Graveyard Garden (Earth + Shadow) — Big bodies + removal ──
  {
    name: 'Graveyard Garden',
    elements: ['earth', 'shadow'],
    playstyle: 'Big bodies and ruthless removal',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['earth_pebble_pup', 1], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_mountain_giant', 1], ['earth_growth', 2],
        ['shadow_sneaky_cat', 2], ['shadow_ghost_knight', 2], ['shadow_nightmare_steed', 2],
        ['shadow_dark_bolt', 2], ['shadow_doom', 1], ['shadow_life_drain', 1],
      ),
      alchemist: deck(
        ['earth_pebble_pup', 1], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_mountain_giant', 1], ['earth_growth', 2],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
        ['shadow_sneaky_cat', 2], ['shadow_ghost_knight', 2], ['shadow_nightmare_steed', 2],
        ['shadow_dark_bolt', 2], ['shadow_doom', 1], ['shadow_life_drain', 1],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
      ),
      archmage: deck(
        ['earth_pebble_pup', 1], ['earth_mushroom_guard', 2], ['earth_treant_sapling', 2],
        ['earth_crystal_stag', 2], ['earth_mountain_giant', 1], ['earth_growth', 2],
        ['earth_raptor', 1], ['earth_spike_tail', 1], ['earth_stegosaurus', 1],
        ['earth_tyrant_rex', 1], ['earth_tar_pit', 1],
        ['shadow_sneaky_cat', 1], ['shadow_ghost_knight', 1], ['shadow_nightmare_steed', 1],
        ['shadow_dark_bolt', 2],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
        ['shadow_shadow_asp', 1], ['shadow_deaths_hand', 1], ['shadow_abyssal_reaper', 1],
        ['shadow_soul_siphon', 1], ['shadow_void_storm', 1],
      ),
    },
  },

  // ── Holy Shadow (Air + Shadow) — Angels + removal ──
  {
    name: 'Holy Shadow',
    elements: ['air', 'shadow'],
    playstyle: 'Angelic healing with dark removal',
    type: 'allied',
    cards: {
      apprentice: deck(
        ['air_acolyte', 2], ['air_priestess_of_light', 2], ['air_angelic_scribe', 2],
        ['air_archangel', 2], ['air_blessing', 1], ['air_radiance', 1],
        ['shadow_sneaky_cat', 2], ['shadow_bat_swarm', 2], ['shadow_shadow_dragon', 2],
        ['shadow_dark_bolt', 2], ['shadow_doom', 1], ['shadow_life_drain', 1],
      ),
      alchemist: deck(
        ['air_acolyte', 2], ['air_priestess_of_light', 2], ['air_angelic_scribe', 2],
        ['air_archangel', 2], ['air_blessing', 1], ['air_radiance', 1],
        ['air_temple_dove', 1], ['air_celestial_monk', 1], ['air_seraph', 1],
        ['air_soothe', 1], ['air_lightning_bolt', 1],
        ['shadow_sneaky_cat', 2], ['shadow_bat_swarm', 2], ['shadow_shadow_dragon', 2],
        ['shadow_dark_bolt', 2], ['shadow_doom', 1], ['shadow_life_drain', 1],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
      ),
      archmage: deck(
        ['air_acolyte', 2], ['air_priestess_of_light', 2], ['air_angelic_scribe', 2],
        ['air_archangel', 2], ['air_blessing', 1], ['air_radiance', 1],
        ['air_temple_dove', 1], ['air_celestial_monk', 1], ['air_seraph', 1],
        ['air_soothe', 1], ['air_lightning_bolt', 1],
        ['shadow_sneaky_cat', 1], ['shadow_bat_swarm', 1], ['shadow_shadow_dragon', 1],
        ['shadow_dark_bolt', 2],
        ['shadow_venom_wisp', 1], ['shadow_bone_sentinel', 1], ['shadow_blood_raven', 1],
        ['shadow_dread_knight', 1], ['shadow_shadow_strike', 1],
        ['shadow_shadow_asp', 1], ['shadow_deaths_hand', 1], ['shadow_abyssal_reaper', 1],
        ['shadow_soul_siphon', 1], ['shadow_void_storm', 1],
      ),
    },
  },
];

// ─── Build Function ───

/** Returns the card ID list for a starter deck at a given tier. */
export function buildStarterDeck(deck: StarterDeck, tier: Tier): string[] {
  return deck.cards[tier];
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
