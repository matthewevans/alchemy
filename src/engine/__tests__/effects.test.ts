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
];

const TARGETED_EFFECTS = [
  'fireball', 'blazing_speed', 'entangle', 'growth', 'gust',
  'lightning_bolt', 'dark_bolt', 'doom',
  'blessing', 'primal_roar', 'tar_pit',
];

const UNTARGETED_EFFECTS = [
  'eruption', 'splash', 'tidal_wave', 'healing_rain',
  'earthquake', 'tailwind', 'life_drain',
  'soothe', 'radiance', 'meteor_strike',
];

describe('EFFECT_REGISTRY', () => {
  it('registers all 21 effects', () => {
    expect(Object.keys(EFFECT_REGISTRY)).toHaveLength(21);
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
  });

  it('every effect has a non-empty description', () => {
    for (const [, def] of Object.entries(EFFECT_REGISTRY)) {
      expect(def.description).toBeTruthy();
    }
  });
});
