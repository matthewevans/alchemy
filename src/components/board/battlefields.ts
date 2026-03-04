import type { TargetAndTransition, Transition } from 'framer-motion';
import type { Element } from '@engine/types';

const ASSET_BASE = import.meta.env.BASE_URL;

// ── Particle configuration ──────────────────────────────────────────

export interface ParticleConfig {
  colors: string[];
  sizeRange: [number, number];
  durationRange: [number, number];
  driftRange: number;
  /** Which axis is "start" — vertical elements start off-screen top/bottom, air starts off-screen left */
  origin: 'top' | 'bottom' | 'left';
  ease: Transition['ease'];
  keyframes: (drift: number, rotation: number) => TargetAndTransition;
}

// ── Battlefield configuration ───────────────────────────────────────

export interface BattlefieldConfig {
  id: string;
  label: string;
  /** Element this battlefield represents (used for auto-selection by deck). */
  element: Element;
  image: string;
  particles: ParticleConfig;
  /** Number of particles to render (default 25). */
  particleCount?: number;
}

function img(name: string): string {
  return `${ASSET_BASE}battlefield/landscape/${name}.webp`;
}

// ── Particle presets ────────────────────────────────────────────────

const FIRE_EMBERS: ParticleConfig = {
  colors: ['rgba(251,191,36,0.5)', 'rgba(251,146,60,0.4)', 'rgba(239,68,68,0.35)', 'rgba(220,180,120,0.25)'],
  sizeRange: [1, 3.5],
  durationRange: [4, 8],
  driftRange: 40,
  origin: 'top',
  ease: 'linear',
  keyframes: (drift, rotation) => ({
    y: ['-5vh', '105vh'],
    x: [0, drift, -drift * 0.5, drift * 0.3],
    opacity: [0, 0.7, 0.5, 0],
    rotate: [0, rotation],
  }),
};

const WATER_RAIN: ParticleConfig = {
  colors: ['rgba(147,197,253,0.6)', 'rgba(96,165,250,0.55)', 'rgba(186,210,255,0.5)', 'rgba(200,220,255,0.45)'],
  sizeRange: [1, 2.5],
  durationRange: [1.5, 3],
  driftRange: 15,
  origin: 'top',
  ease: 'linear',
  keyframes: (drift) => ({
    y: ['-5vh', '105vh'],
    x: [0, drift],
    opacity: [0, 0.7, 0.6, 0],
  }),
};

const EARTH_LEAVES: ParticleConfig = {
  colors: ['rgba(34,197,94,0.7)', 'rgba(74,222,128,0.65)', 'rgba(163,230,53,0.6)', 'rgba(101,163,13,0.55)'],
  sizeRange: [3, 6],
  durationRange: [6, 12],
  driftRange: 70,
  origin: 'top',
  ease: 'easeInOut',
  keyframes: (drift, rotation) => ({
    y: ['-5vh', '105vh'],
    x: [0, drift, -drift * 0.7, drift * 0.5, -drift * 0.3],
    opacity: [0, 0.85, 0.7, 0.5, 0],
    rotate: [0, rotation, rotation * 1.5, rotation * 2],
  }),
};

const AIR_WISPS: ParticleConfig = {
  colors: ['rgba(254,243,199,0.35)', 'rgba(234,179,8,0.25)', 'rgba(251,191,36,0.2)', 'rgba(255,255,255,0.15)'],
  sizeRange: [1, 3],
  durationRange: [6, 12],
  driftRange: 30,
  origin: 'left',
  ease: 'linear',
  keyframes: (drift) => ({
    x: ['-10vw', '110vw'],
    y: [0, drift, -drift * 0.5, drift * 0.3],
    opacity: [0, 0.5, 0.4, 0],
  }),
};

const SHADOW_MOTES: ParticleConfig = {
  colors: ['rgba(168,85,247,0.35)', 'rgba(192,132,252,0.3)', 'rgba(139,92,246,0.25)', 'rgba(107,33,168,0.2)'],
  sizeRange: [1, 3.5],
  durationRange: [6, 10],
  driftRange: 30,
  origin: 'bottom',
  ease: 'easeInOut',
  keyframes: (drift) => ({
    y: ['105vh', '-5vh'],
    x: [0, drift, -drift * 0.6, drift * 0.4],
    opacity: [0, 0.5, 0.4, 0.2, 0],
    scale: [0.5, 1.2, 0.8, 1],
  }),
};

const SNOWFALL: ParticleConfig = {
  colors: ['rgba(255,255,255,0.7)', 'rgba(220,230,255,0.6)', 'rgba(200,215,240,0.5)', 'rgba(240,245,255,0.55)'],
  sizeRange: [1, 4],
  durationRange: [4, 10],
  driftRange: 50,
  origin: 'top',
  ease: 'linear',
  keyframes: (drift, rotation) => ({
    y: ['-5vh', '105vh'],
    x: [0, drift, -drift * 0.4, drift * 0.6, -drift * 0.2],
    opacity: [0, 0.7, 0.6, 0.5, 0],
    rotate: [0, rotation * 0.3],
  }),
};

const SHADOW_FLAMES: ParticleConfig = {
  colors: ['rgba(168,85,247,0.45)', 'rgba(192,132,252,0.35)', 'rgba(236,72,153,0.25)', 'rgba(139,92,246,0.3)'],
  sizeRange: [1.5, 4],
  durationRange: [4, 8],
  driftRange: 35,
  origin: 'bottom',
  ease: 'easeOut',
  keyframes: (drift) => ({
    y: ['105vh', '-5vh'],
    x: [0, drift, -drift * 0.5, drift * 0.3],
    opacity: [0, 0.6, 0.5, 0.3, 0],
    scale: [0.4, 1.3, 1, 0.7],
  }),
};

const ICE_CRYSTALS: ParticleConfig = {
  colors: ['rgba(103,232,249,0.55)', 'rgba(56,189,248,0.45)', 'rgba(165,243,252,0.5)', 'rgba(255,255,255,0.5)'],
  sizeRange: [1, 3.5],
  durationRange: [4, 9],
  driftRange: 35,
  origin: 'top',
  ease: 'linear',
  keyframes: (drift, rotation) => ({
    y: ['-5vh', '105vh'],
    x: [0, drift * 0.7, -drift * 0.3, drift * 0.5],
    opacity: [0, 0.65, 0.55, 0.4, 0],
    rotate: [0, rotation * 0.5],
    scale: [0.8, 1.1, 0.9, 1],
  }),
};

// ── Registry ────────────────────────────────────────────────────────

export const BATTLEFIELDS: BattlefieldConfig[] = [
  { id: 'fire_molten',               label: 'Molten',           element: 'fire',   image: img('fire_molten'),               particles: FIRE_EMBERS },
  { id: 'water_moonlit_ocean_temple', label: 'Ocean Temple',     element: 'water',  image: img('water_moonlit_ocean_temple'), particles: WATER_RAIN },
  { id: 'water_frozen_aurora',        label: 'Frozen Aurora',    element: 'water',  image: img('water_frozen_aurora'),        particles: ICE_CRYSTALS, particleCount: 50 },
  { id: 'earth_jurassic',             label: 'Jurassic',         element: 'earth',  image: img('earth_jurassic'),             particles: EARTH_LEAVES },
  { id: 'earth_snowy_forest',         label: 'Snowy Forest',     element: 'earth',  image: img('earth_snowy_forest'),         particles: SNOWFALL, particleCount: 50 },
  { id: 'air_angelic_sky',            label: 'Angelic Sky',      element: 'air',    image: img('air_angelic_sky'),            particles: AIR_WISPS },
  { id: 'shadow_haunted_graveyard',   label: 'Haunted Graveyard', element: 'shadow', image: img('shadow_haunted_graveyard'),  particles: SHADOW_FLAMES },
  { id: 'shadow_ruined_archway',      label: 'Ruined Archway',  element: 'shadow', image: img('shadow_ruined_archway'),      particles: SHADOW_MOTES },
  { id: 'shadow_moon_coven_sanctum',  label: 'Moon Coven Sanctum', element: 'shadow', image: img('shadow_moon_coven_sanctum'), particles: SHADOW_MOTES },
];

export const BATTLEFIELD_MAP: Record<string, BattlefieldConfig> = Object.fromEntries(
  BATTLEFIELDS.map((b) => [b.id, b]),
);

/** Battlefields grouped by element for random auto-selection. */
const BY_ELEMENT: Record<Element, BattlefieldConfig[]> = { fire: [], water: [], earth: [], air: [], shadow: [] };
for (const bf of BATTLEFIELDS) {
  BY_ELEMENT[bf.element].push(bf);
}

/** Returns a random battlefield for an element (used in auto mode). */
export function getRandomBattlefield(element: Element): BattlefieldConfig {
  const candidates = BY_ELEMENT[element];
  return candidates[Math.floor(Math.random() * candidates.length)];
}
