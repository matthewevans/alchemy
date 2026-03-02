import type { CardDefinition, CreatureType, Element, Tier } from './types';
import { EFFECT_REGISTRY } from './effects';

export const ALL_CARDS: CardDefinition[] = [
  // ─── Fire Creatures ───
  { id: 'fire_ember_sprite', name: 'Ember Sprite', type: 'creature', element: 'fire', cost: 1, attack: 1, health: 2, creatureType: 'elemental', keywords: ['swift'], tier: 'apprentice', flavor: 'Born from a candle flame and twice as restless.' },
  { id: 'fire_flame_fox', name: 'Flame Fox', type: 'creature', element: 'fire', cost: 1, attack: 2, health: 1, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'It leaves little embers wherever it steps.' },
  { id: 'fire_lava_hound', name: 'Lava Hound', type: 'creature', element: 'fire', cost: 2, attack: 2, health: 3, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'Good boy. Very hot boy.' },
  { id: 'fire_fire_dancer', name: 'Fire Dancer', type: 'creature', element: 'fire', cost: 2, attack: 2, health: 2, creatureType: 'human', keywords: ['blast'], tier: 'apprentice', flavor: 'Every step is a spark, every spin an inferno.' },
  { id: 'fire_magma_golem', name: 'Magma Golem', type: 'creature', element: 'fire', cost: 3, attack: 3, health: 4, creatureType: 'golem', keywords: ['blast'], tier: 'apprentice', flavor: 'Slow to anger, impossible to stop.' },
  { id: 'fire_phoenix_chick', name: 'Phoenix Chick', type: 'creature', element: 'fire', cost: 4, attack: 3, health: 3, creatureType: 'elemental', keywords: ['swift'], tier: 'apprentice', flavor: '"It hatched again?!" —Every alchemist, eventually' },
  { id: 'fire_dragon_whelp', name: 'Dragon Whelp', type: 'creature', element: 'fire', cost: 5, attack: 5, health: 4, creatureType: 'dragon', keywords: ['blast'], tier: 'apprentice', flavor: 'Small for a dragon. Big for a problem.' },

  // ─── Fire Spells ───
  { id: 'fire_fireball', name: 'Fireball', type: 'spell', element: 'fire', cost: 2, keywords: [], tier: 'apprentice', effectId: 'fireball', targetingType: EFFECT_REGISTRY.fireball.targetingType, flavor: 'The first spell every fire mage learns. The last one many foes see.' },
  { id: 'fire_eruption', name: 'Eruption', type: 'spell', element: 'fire', cost: 3, keywords: [], tier: 'apprentice', effectId: 'eruption', flavor: 'The mountain remembers every slight.' },
  { id: 'fire_blazing_speed', name: 'Blazing Speed', type: 'spell', element: 'fire', cost: 1, keywords: [], tier: 'apprentice', effectId: 'blazing_speed', targetingType: EFFECT_REGISTRY.blazing_speed.targetingType, flavor: 'Too fast to see, too bright to miss.' },

  // ─── Fire Creatures (Forge) ───
  { id: 'fire_spark_striker', name: 'Spark Striker', type: 'creature', element: 'fire', cost: 1, attack: 1, health: 1, creatureType: 'elemental', keywords: ['fury'], tier: 'alchemist', flavor: 'One hit from each tiny fist!' },
  { id: 'fire_forge_guardian', name: 'Forge Guardian', type: 'creature', element: 'fire', cost: 2, attack: 1, health: 4, creatureType: 'golem', keywords: ['armor'], tier: 'alchemist', flavor: 'Built in fire, cooled in courage.' },
  { id: 'fire_fury_hound', name: 'Fury Hound', type: 'creature', element: 'fire', cost: 3, attack: 2, health: 3, creatureType: 'beast', keywords: ['fury'], tier: 'alchemist', flavor: 'It bites once, then bites again before you can say ouch.' },
  { id: 'fire_magma_sentinel', name: 'Magma Sentinel', type: 'creature', element: 'fire', cost: 4, attack: 2, health: 5, creatureType: 'golem', keywords: ['armor'], tier: 'alchemist', flavor: "The last wall you'll ever need." },
  { id: 'fire_cinder_viper', name: 'Cinder Viper', type: 'creature', element: 'fire', cost: 1, attack: 1, health: 1, creatureType: 'beast', keywords: ['deathtouch'], tier: 'archmage', flavor: 'Small enough to miss. Deadly enough to remember.' },
  { id: 'fire_flameheart_knight', name: 'Flameheart Knight', type: 'creature', element: 'fire', cost: 3, attack: 2, health: 2, creatureType: 'human', keywords: ['lifesteal'], tier: 'archmage', flavor: 'Burns bright, heals brighter.' },
  { id: 'fire_inferno_dragon', name: 'Inferno Dragon', type: 'creature', element: 'fire', cost: 6, attack: 5, health: 5, creatureType: 'dragon', keywords: ['fury'], tier: 'archmage', flavor: 'When it roars, even volcanoes listen.' },

  // ─── Fire Spells (Forge) ───
  { id: 'fire_forge_hammer', name: 'Forge Hammer', type: 'spell', element: 'fire', cost: 1, keywords: [], tier: 'alchemist', effectId: 'forge_hammer', targetingType: EFFECT_REGISTRY.forge_hammer.targetingType, flavor: 'Strength, hammered to a fine edge.' },
  { id: 'fire_furnace_blast', name: 'Furnace Blast', type: 'spell', element: 'fire', cost: 3, keywords: [], tier: 'archmage', effectId: 'furnace_blast', targetingType: EFFECT_REGISTRY.furnace_blast.targetingType, flavor: 'Hotter than hot. Way hotter than that.' },
  { id: 'fire_flame_wave', name: 'Flame Wave', type: 'spell', element: 'fire', cost: 5, keywords: [], tier: 'archmage', effectId: 'flame_wave', flavor: 'A wall of fire with nowhere to run.' },

  // ─── Water Creatures ───
  { id: 'water_tide_sprite', name: 'Tide Sprite', type: 'creature', element: 'water', cost: 1, attack: 1, health: 2, creatureType: 'elemental', keywords: ['draw'], tier: 'apprentice', flavor: 'It carries secrets from the deep in every droplet.' },
  { id: 'water_shell_crab', name: 'Shell Crab', type: 'creature', element: 'water', cost: 1, attack: 0, health: 4, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'All defense, no apologies.' },
  { id: 'water_river_otter', name: 'River Otter', type: 'creature', element: 'water', cost: 2, attack: 2, health: 2, creatureType: 'beast', keywords: ['draw'], tier: 'apprentice', flavor: 'Playful, curious, and surprisingly clever.' },
  { id: 'water_coral_guardian', name: 'Coral Guardian', type: 'creature', element: 'water', cost: 2, attack: 1, health: 4, creatureType: 'elemental', keywords: [], tier: 'apprentice', flavor: 'The reef protects those who protect the reef.' },
  { id: 'water_storm_turtle', name: 'Storm Turtle', type: 'creature', element: 'water', cost: 3, attack: 2, health: 5, creatureType: 'beast', keywords: ['heal'], tier: 'apprentice', flavor: 'It has weathered every storm since the first rain.' },
  { id: 'water_frost_serpent', name: 'Frost Serpent', type: 'creature', element: 'water', cost: 4, attack: 4, health: 3, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'Where it swims, rivers freeze mid-current.' },
  { id: 'water_tidal_whale', name: 'Tidal Whale', type: 'creature', element: 'water', cost: 5, attack: 3, health: 6, creatureType: 'beast', keywords: ['heal'], tier: 'apprentice', flavor: 'Its song can calm the wildest seas.' },

  // ─── Water Spells ───
  { id: 'water_splash', name: 'Splash', type: 'spell', element: 'water', cost: 1, keywords: [], tier: 'apprentice', effectId: 'splash', flavor: 'Knowledge flows to those who seek it.' },
  { id: 'water_tidal_wave', name: 'Tidal Wave', type: 'spell', element: 'water', cost: 5, keywords: [], tier: 'apprentice', effectId: 'tidal_wave', flavor: 'The ocean always takes back what it lends.' },
  { id: 'water_healing_rain', name: 'Healing Rain', type: 'spell', element: 'water', cost: 2, keywords: [], tier: 'apprentice', effectId: 'healing_rain', flavor: 'Every raindrop carries a tiny mending spell.' },

  // ─── Water Creatures (Depths) ───
  { id: 'water_pearl_turtle', name: 'Pearl Turtle', type: 'creature', element: 'water', cost: 1, attack: 0, health: 3, creatureType: 'beast', keywords: ['armor'], tier: 'alchemist', flavor: 'Its shell sparkles with forgotten pearls.' },
  { id: 'water_reef_shark', name: 'Reef Shark', type: 'creature', element: 'water', cost: 2, attack: 2, health: 1, creatureType: 'beast', keywords: ['fury'], tier: 'alchemist', flavor: "Don't let the fin fool you. It's worse than it looks." },
  { id: 'water_armored_seahorse', name: 'Armored Seahorse', type: 'creature', element: 'water', cost: 3, attack: 2, health: 4, creatureType: 'beast', keywords: ['armor'], tier: 'alchemist', flavor: "The ocean's tiniest knight." },
  { id: 'water_depth_leviathan', name: 'Depth Leviathan', type: 'creature', element: 'water', cost: 5, attack: 3, health: 5, creatureType: 'beast', keywords: ['armor'], tier: 'alchemist', flavor: 'Even the tides obey its shadow.' },
  { id: 'water_jellyfish_swarm', name: 'Jellyfish Swarm', type: 'creature', element: 'water', cost: 2, attack: 1, health: 2, creatureType: 'beast', keywords: ['deathtouch'], tier: 'archmage', flavor: 'Pretty lights. Deadly sting.' },
  { id: 'water_vampire_eel', name: 'Vampire Eel', type: 'creature', element: 'water', cost: 2, attack: 2, health: 1, creatureType: 'beast', keywords: ['lifesteal'], tier: 'archmage', flavor: 'It feeds in the dark where nobody watches.' },
  { id: 'water_kraken', name: 'Kraken', type: 'creature', element: 'water', cost: 6, attack: 4, health: 6, creatureType: 'beast', keywords: ['fury'], tier: 'archmage', flavor: "The ocean's final argument." },

  // ─── Water Spells (Depths) ───
  { id: 'water_riptide', name: 'Riptide', type: 'spell', element: 'water', cost: 3, keywords: [], tier: 'alchemist', effectId: 'riptide', flavor: 'The tide takes everything eventually.' },
  { id: 'water_tidal_surge', name: 'Tidal Surge', type: 'spell', element: 'water', cost: 4, keywords: [], tier: 'archmage', effectId: 'tidal_surge', targetingType: EFFECT_REGISTRY.tidal_surge.targetingType, flavor: 'The sea giveth. The sea taketh.' },
  { id: 'water_maelstrom', name: 'Maelstrom', type: 'spell', element: 'water', cost: 5, keywords: [], tier: 'archmage', effectId: 'maelstrom', flavor: 'Everything goes in. Nothing comes out.' },

  // ─── Earth Creatures ───
  { id: 'earth_pebble_pup', name: 'Pebble Pup', type: 'creature', element: 'earth', cost: 1, attack: 1, health: 3, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'It thinks it\'s a boulder. Nobody corrects it.' },
  { id: 'earth_vine_crawler', name: 'Vine Crawler', type: 'creature', element: 'earth', cost: 1, attack: 2, health: 1, creatureType: 'plant', keywords: ['swift'], tier: 'apprentice', flavor: 'By the time you see it move, it\'s already there.' },
  { id: 'earth_mushroom_guard', name: 'Mushroom Guard', type: 'creature', element: 'earth', cost: 2, attack: 1, health: 4, creatureType: 'plant', keywords: ['heal'], tier: 'apprentice', flavor: 'Soft on the outside. Stubborn at the core.' },
  { id: 'earth_boulder_bear', name: 'Boulder Bear', type: 'creature', element: 'earth', cost: 2, attack: 3, health: 2, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'Part bear, part landslide, all trouble.' },
  { id: 'earth_treant_sapling', name: 'Treant Sapling', type: 'creature', element: 'earth', cost: 3, attack: 2, health: 5, creatureType: 'plant', keywords: [], tier: 'apprentice', flavor: 'Give it a century. It\'ll be a forest.' },
  { id: 'earth_crystal_stag', name: 'Crystal Stag', type: 'creature', element: 'earth', cost: 4, attack: 3, health: 5, creatureType: 'beast', keywords: ['draw'], tier: 'apprentice', flavor: 'Its antlers catch the light of forgotten stars.' },
  { id: 'earth_mountain_giant', name: 'Mountain Giant', type: 'creature', element: 'earth', cost: 5, attack: 4, health: 6, creatureType: 'giant', keywords: [], tier: 'apprentice', flavor: 'When the mountain walks, the world listens.' },

  // ─── Earth Spells ───
  { id: 'earth_entangle', name: 'Entangle', type: 'spell', element: 'earth', cost: 1, keywords: [], tier: 'apprentice', effectId: 'entangle', targetingType: EFFECT_REGISTRY.entangle.targetingType, flavor: 'The forest does not forget trespassers.' },
  { id: 'earth_earthquake', name: 'Earthquake', type: 'spell', element: 'earth', cost: 3, keywords: [], tier: 'apprentice', effectId: 'earthquake', flavor: 'Even the brave lose their footing.' },
  { id: 'earth_growth', name: 'Growth', type: 'spell', element: 'earth', cost: 2, keywords: [], tier: 'apprentice', effectId: 'growth', targetingType: EFFECT_REGISTRY.growth.targetingType, flavor: 'A whisper of ancient green magic.' },

  // ─── Air Creatures ───
  { id: 'air_breeze_fairy', name: 'Breeze Fairy', type: 'creature', element: 'air', cost: 1, attack: 1, health: 1, creatureType: 'fairy', keywords: ['swift', 'draw'], tier: 'apprentice', flavor: 'She speaks only in riddles and giggles.' },
  { id: 'air_cloud_kitten', name: 'Cloud Kitten', type: 'creature', element: 'air', cost: 1, attack: 1, health: 2, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'Soft, fluffy, and impossible to catch.' },
  { id: 'air_wind_hawk', name: 'Wind Hawk', type: 'creature', element: 'air', cost: 2, attack: 3, health: 1, creatureType: 'beast', keywords: ['swift'], tier: 'apprentice', flavor: 'It strikes between one heartbeat and the next.' },
  { id: 'air_storm_sprite', name: 'Storm Sprite', type: 'creature', element: 'air', cost: 2, attack: 2, health: 2, creatureType: 'elemental', keywords: ['blast'], tier: 'apprentice', flavor: 'Where one gathers, thunder follows.' },
  { id: 'air_thunder_ram', name: 'Thunder Ram', type: 'creature', element: 'air', cost: 3, attack: 3, health: 3, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'Its charge echoes across three valleys.' },
  { id: 'air_sky_drake', name: 'Sky Drake', type: 'creature', element: 'air', cost: 4, attack: 4, health: 3, creatureType: 'dragon', keywords: ['swift'], tier: 'apprentice', flavor: 'It dances with lightning and never gets burned.' },
  { id: 'air_tempest_eagle', name: 'Tempest Eagle', type: 'creature', element: 'air', cost: 5, attack: 5, health: 5, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'Where it flies, the sky itself bows.' },

  // ─── Air Spells ───
  { id: 'air_gust', name: 'Gust', type: 'spell', element: 'air', cost: 1, keywords: [], tier: 'apprentice', effectId: 'gust', targetingType: EFFECT_REGISTRY.gust.targetingType, flavor: '"Goodbye!" —The wind' },
  { id: 'air_lightning_bolt', name: 'Lightning Bolt', type: 'spell', element: 'air', cost: 2, keywords: [], tier: 'apprentice', effectId: 'lightning_bolt', targetingType: EFFECT_REGISTRY.lightning_bolt.targetingType, flavor: 'Nature\'s way of saying "no."' },
  { id: 'air_tailwind', name: 'Tailwind', type: 'spell', element: 'air', cost: 3, keywords: [], tier: 'apprentice', effectId: 'tailwind', flavor: 'The breeze carries friends to battle faster.' },

  // ─── Shadow Creatures ───
  { id: 'shadow_sneaky_cat', name: 'Sneaky Cat', type: 'creature', element: 'shadow', cost: 1, attack: 2, health: 1, creatureType: 'beast', keywords: ['swift'], tier: 'apprentice', flavor: 'You never see it coming. That\'s the point.' },
  { id: 'shadow_bat_swarm', name: 'Bat Swarm', type: 'creature', element: 'shadow', cost: 2, attack: 2, health: 2, creatureType: 'beast', keywords: ['blast'], tier: 'apprentice', flavor: 'One bat is harmless. A thousand is a storm.' },
  { id: 'shadow_shade_wolf', name: 'Shade Wolf', type: 'creature', element: 'shadow', cost: 2, attack: 3, health: 1, creatureType: 'beast', keywords: [], tier: 'apprentice', flavor: 'It hunts what light cannot reach.' },
  { id: 'shadow_ghost_knight', name: 'Ghost Knight', type: 'creature', element: 'shadow', cost: 3, attack: 3, health: 3, creatureType: 'undead', keywords: [], tier: 'apprentice', effectId: 'ghost_knight_etb', flavor: 'Still loyal. Still fighting. Still lost.' },
  { id: 'shadow_nightmare_steed', name: 'Nightmare Steed', type: 'creature', element: 'shadow', cost: 3, attack: 2, health: 4, creatureType: 'undead', keywords: [], tier: 'apprentice', flavor: 'Its hoofbeats echo only in dreams.' },
  { id: 'shadow_vampire_lord', name: 'Vampire Lord', type: 'creature', element: 'shadow', cost: 4, attack: 4, health: 3, creatureType: 'undead', keywords: ['lifesteal'], tier: 'apprentice', flavor: '"Your strength becomes my strength."' },
  { id: 'shadow_shadow_dragon', name: 'Shadow Dragon', type: 'creature', element: 'shadow', cost: 5, attack: 5, health: 5, creatureType: 'dragon', keywords: [], tier: 'apprentice', effectId: 'shadow_dragon_etb', flavor: 'It doesn\'t breathe fire. It breathes fear.' },

  // ─── Shadow Spells ───
  { id: 'shadow_dark_bolt', name: 'Dark Bolt', type: 'spell', element: 'shadow', cost: 1, keywords: [], tier: 'apprentice', effectId: 'dark_bolt', targetingType: EFFECT_REGISTRY.dark_bolt.targetingType, flavor: 'Power always comes at a price.' },
  { id: 'shadow_life_drain', name: 'Life Drain', type: 'spell', element: 'shadow', cost: 3, keywords: [], tier: 'apprentice', effectId: 'life_drain', flavor: 'What is taken is never truly gone.' },
  { id: 'shadow_doom', name: 'Doom', type: 'spell', element: 'shadow', cost: 4, keywords: [], tier: 'apprentice', effectId: 'doom', targetingType: EFFECT_REGISTRY.doom.targetingType, flavor: 'No armor thick enough. No magic strong enough.' },

  // ─── Shadow Creatures (Dread) ───
  { id: 'shadow_venom_wisp', name: 'Venom Wisp', type: 'creature', element: 'shadow', cost: 1, attack: 1, health: 1, creatureType: 'undead', keywords: ['lifesteal'], tier: 'alchemist', flavor: 'It nibbles your soul. Just a little.' },
  { id: 'shadow_bone_sentinel', name: 'Bone Sentinel', type: 'creature', element: 'shadow', cost: 2, attack: 1, health: 3, creatureType: 'undead', keywords: ['armor'], tier: 'alchemist', flavor: 'Death could not stop its watch.' },
  { id: 'shadow_blood_raven', name: 'Blood Raven', type: 'creature', element: 'shadow', cost: 3, attack: 2, health: 3, creatureType: 'beast', keywords: ['lifesteal'], tier: 'alchemist', flavor: 'It feeds on moonlight and misfortune.' },
  { id: 'shadow_dread_knight', name: 'Dread Knight', type: 'creature', element: 'shadow', cost: 4, attack: 3, health: 3, creatureType: 'undead', keywords: ['fury'], tier: 'alchemist', flavor: 'Swings twice. Apologizes never.' },
  { id: 'shadow_shadow_asp', name: 'Shadow Asp', type: 'creature', element: 'shadow', cost: 1, attack: 1, health: 1, creatureType: 'beast', keywords: ['deathtouch'], tier: 'archmage', flavor: 'You never hear the hiss.' },
  { id: 'shadow_deaths_hand', name: "Death's Hand", type: 'creature', element: 'shadow', cost: 3, attack: 1, health: 4, creatureType: 'undead', keywords: ['deathtouch'], tier: 'archmage', flavor: 'Its grip is the last thing you feel.' },
  { id: 'shadow_abyssal_reaper', name: 'Abyssal Reaper', type: 'creature', element: 'shadow', cost: 6, attack: 4, health: 4, creatureType: 'undead', keywords: ['lifesteal'], tier: 'archmage', flavor: 'It harvests what fear cannot hold.' },

  // ─── Shadow Spells (Dread) ───
  { id: 'shadow_shadow_strike', name: 'Shadow Strike', type: 'spell', element: 'shadow', cost: 2, keywords: [], tier: 'alchemist', effectId: 'shadow_strike', targetingType: EFFECT_REGISTRY.shadow_strike.targetingType, flavor: 'A fair trade, if you\'re desperate enough.' },
  { id: 'shadow_soul_siphon', name: 'Soul Siphon', type: 'spell', element: 'shadow', cost: 3, keywords: [], tier: 'archmage', effectId: 'soul_siphon', targetingType: EFFECT_REGISTRY.soul_siphon.targetingType, flavor: 'What is yours becomes mine.' },
  { id: 'shadow_void_storm', name: 'Void Storm', type: 'spell', element: 'shadow', cost: 5, keywords: [], tier: 'archmage', effectId: 'void_storm', flavor: 'Darkness that swallows everything.' },

  // ─── Air Creatures (Angels / Priests) ───
  { id: 'air_acolyte', name: 'Acolyte', type: 'creature', element: 'air', cost: 1, attack: 1, health: 2, creatureType: 'human', keywords: ['heal'], tier: 'apprentice', flavor: 'Still learning which end of the wand to hold.' },
  { id: 'air_temple_dove', name: 'Temple Dove', type: 'creature', element: 'air', cost: 1, attack: 0, health: 3, creatureType: 'beast', keywords: ['draw'], tier: 'apprentice', flavor: 'It coos a soft lullaby that mends scraped knees.' },
  { id: 'air_priestess_of_light', name: 'Priestess of Light', type: 'creature', element: 'air', cost: 2, attack: 1, health: 4, creatureType: 'human', keywords: ['heal'], tier: 'apprentice', flavor: 'Her lantern has never gone out. Not even once.' },
  { id: 'air_angelic_scribe', name: 'Angelic Scribe', type: 'creature', element: 'air', cost: 2, attack: 1, health: 3, creatureType: 'angel', keywords: ['draw'], tier: 'apprentice', flavor: 'Writes down every spell it sees. Very nosy.' },
  { id: 'air_celestial_monk', name: 'Celestial Monk', type: 'creature', element: 'air', cost: 3, attack: 1, health: 6, creatureType: 'human', keywords: [], tier: 'apprentice', flavor: 'Has meditated so long, moss grows on his shoulders.' },
  { id: 'air_archangel', name: 'Archangel', type: 'creature', element: 'air', cost: 4, attack: 2, health: 6, creatureType: 'angel', keywords: ['heal'], tier: 'apprentice', flavor: 'When she spreads her wings, even the shadows feel warm.' },
  { id: 'air_seraph', name: 'Seraph', type: 'creature', element: 'air', cost: 5, attack: 4, health: 5, creatureType: 'angel', keywords: ['heal'], tier: 'apprentice', flavor: 'Six wings, zero worries.' },

  // ─── Air Spells (Angels / Priests) ───
  { id: 'air_soothe', name: 'Soothe', type: 'spell', element: 'air', cost: 1, keywords: [], tier: 'apprentice', effectId: 'soothe', flavor: 'Like a warm blanket made of starlight.' },
  { id: 'air_blessing', name: 'Blessing', type: 'spell', element: 'air', cost: 2, keywords: [], tier: 'apprentice', effectId: 'blessing', targetingType: EFFECT_REGISTRY.blessing.targetingType, flavor: 'The light wraps around you like armor made of kindness.' },
  { id: 'air_radiance', name: 'Radiance', type: 'spell', element: 'air', cost: 4, keywords: [], tier: 'apprentice', effectId: 'radiance', flavor: 'So bright, even your cards look happier.' },

  // ─── Earth Creatures (Dinosaurs) ───
  { id: 'earth_dino_hatchling', name: 'Dino Hatchling', type: 'creature', element: 'earth', cost: 1, attack: 1, health: 1, creatureType: 'dinosaur', keywords: ['blast'], tier: 'apprentice', flavor: 'Tiny but LOUD. The ground shakes a tiny bit.' },
  { id: 'earth_raptor', name: 'Raptor', type: 'creature', element: 'earth', cost: 1, attack: 1, health: 2, creatureType: 'dinosaur', keywords: ['swift'], tier: 'apprentice', flavor: 'Fast enough to steal your lunch and your lunch box.' },
  { id: 'earth_spike_tail', name: 'Spike Tail', type: 'creature', element: 'earth', cost: 2, attack: 2, health: 3, creatureType: 'dinosaur', keywords: [], tier: 'apprentice', flavor: "Don't stand behind it. Seriously." },
  { id: 'earth_triceratops_calf', name: 'Triceratops Calf', type: 'creature', element: 'earth', cost: 2, attack: 2, health: 3, creatureType: 'dinosaur', keywords: ['heal'], tier: 'apprentice', flavor: "Headbutts everything it loves. That's a lot of headbutts." },
  { id: 'earth_pteranodon', name: 'Pteranodon', type: 'creature', element: 'earth', cost: 3, attack: 3, health: 2, creatureType: 'dinosaur', keywords: ['swift'], tier: 'apprentice', flavor: "Not a dinosaur, actually. Don't tell it that." },
  { id: 'earth_stegosaurus', name: 'Stegosaurus', type: 'creature', element: 'earth', cost: 4, attack: 2, health: 6, creatureType: 'dinosaur', keywords: [], tier: 'apprentice', flavor: 'Slow, patient, and basically a walking castle.' },
  { id: 'earth_tyrant_rex', name: 'Tyrant Rex', type: 'creature', element: 'earth', cost: 5, attack: 4, health: 5, creatureType: 'dinosaur', keywords: ['blast'], tier: 'apprentice', flavor: 'The ground shakes. The trees lean away. Lunch is served.' },

  // ─── Earth Spells (Dinosaurs) ───
  { id: 'earth_primal_roar', name: 'Primal Roar', type: 'spell', element: 'earth', cost: 1, keywords: [], tier: 'apprentice', effectId: 'primal_roar', targetingType: EFFECT_REGISTRY.primal_roar.targetingType, flavor: "RAAAWR! (Translation: 'I'm very upset.')" },
  { id: 'earth_tar_pit', name: 'Tar Pit', type: 'spell', element: 'earth', cost: 2, keywords: [], tier: 'apprentice', effectId: 'tar_pit', targetingType: EFFECT_REGISTRY.tar_pit.targetingType, flavor: "One step in and you're going nowhere fast." },
  { id: 'earth_meteor_strike', name: 'Meteor Strike', type: 'spell', element: 'earth', cost: 4, keywords: [], tier: 'apprentice', effectId: 'meteor_strike', flavor: 'The sky remembers the dinosaurs. Sometimes it visits.' },
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

export function getCardsByCreatureType(creatureType: CreatureType): CardDefinition[] {
  return ALL_CARDS.filter((card) => card.creatureType === creatureType);
}
