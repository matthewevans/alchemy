import { describe, it, expect } from 'vitest';
import { EFFECT_REGISTRY } from '../effects';

const ALL_EFFECT_IDS = [
  'fireball', 'eruption', 'blazing_speed', 'splash', 'tidal_wave',
  'healing_rain', 'entangle', 'earthquake', 'growth', 'gust',
  'lightning_bolt', 'tailwind', 'dark_bolt', 'life_drain', 'doom',
  // Angel/Priest effects
  'soothe', 'blessing', 'radiance',
  // Dinosaur effects
  'primal_roar', 'tar_pit', 'meteor_strike',
  // Fire Forge effects
  'forge_hammer', 'furnace_blast', 'flame_wave',
  // Water Depths effects
  'riptide', 'tidal_surge', 'maelstrom',
  // Shadow Dread effects
  'shadow_strike', 'soul_siphon', 'void_storm',
];

const TARGETED_EFFECTS = [
  'fireball', 'blazing_speed', 'entangle', 'growth', 'gust',
  'lightning_bolt', 'dark_bolt', 'doom',
  'blessing', 'primal_roar', 'tar_pit',
  'forge_hammer', 'furnace_blast', 'tidal_surge', 'shadow_strike', 'soul_siphon',
];

const UNTARGETED_EFFECTS = [
  'eruption', 'splash', 'tidal_wave', 'healing_rain',
  'earthquake', 'tailwind', 'life_drain',
  'soothe', 'radiance', 'meteor_strike',
  'flame_wave', 'riptide', 'maelstrom', 'void_storm',
];

describe('EFFECT_REGISTRY', () => {
  it('registers all 30 effects', () => {
    expect(Object.keys(EFFECT_REGISTRY)).toHaveLength(30);
    for (const id of ALL_EFFECT_IDS) {
      expect(EFFECT_REGISTRY[id]).toBeDefined();
    }
  });

  it('every effect has at least one step', () => {
    for (const id of ALL_EFFECT_IDS) {
      expect(EFFECT_REGISTRY[id].steps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every effect id matches its registry key', () => {
    for (const [key, def] of Object.entries(EFFECT_REGISTRY)) {
      expect(def.id).toBe(key);
    }
  });

  it('targeted effects have a targetingType defined', () => {
    for (const id of TARGETED_EFFECTS) {
      expect(EFFECT_REGISTRY[id].targetingType).toBeDefined();
    }
  });

  it('untargeted effects have no targetingType', () => {
    for (const id of UNTARGETED_EFFECTS) {
      expect(EFFECT_REGISTRY[id].targetingType).toBeUndefined();
    }
  });

  it('multi-step effects have correct step count', () => {
    expect(EFFECT_REGISTRY.dark_bolt.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.life_drain.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.radiance.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.tar_pit.steps).toHaveLength(2);
    // Forge / Depths / Dread effects
    expect(EFFECT_REGISTRY.flame_wave.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.riptide.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.tidal_surge.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.maelstrom.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.shadow_strike.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.soul_siphon.steps).toHaveLength(2);
    expect(EFFECT_REGISTRY.void_storm.steps).toHaveLength(2);
  });

  it('every effect has a non-empty description', () => {
    for (const [, def] of Object.entries(EFFECT_REGISTRY)) {
      expect(def.description).toBeTruthy();
    }
  });
});
