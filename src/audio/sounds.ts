import type { Element } from '@engine/types';
import { getAudioContext, getSfxGain } from './audioContext';

// ─── Types ───

type SoundFn = (ctx: AudioContext, dest: AudioNode) => void;
type SpellImpactKind = 'heal';
type SamplePlayResult = 'played' | 'pending' | 'unavailable';
type EffectSoundType =
  | 'combat_strike'
  | 'block_link'
  | 'damage'
  | 'player_damage'
  | 'death'
  | 'spell_impact'
  | 'heal'
  | 'player_heal'
  | 'summon'
  | 'keyword'
  | 'ui';

interface SpellImpactSampleMap {
  fire: string[];
  water: string[];
  air: string[];
  earth: string[];
  nature: string[];
  shadow: string[];
  heal: string[];
}

interface SampleCatalog {
  runtime_sound_types: {
    combat_strike: string[];
    block_link: string[];
    damage: string[];
    player_damage: string[];
    death: string[];
    heal: string[];
    player_heal: string[];
    summon: string[];
    keyword: string[];
    ui: string[];
    ambient_optional: string[];
    spell_impact_by_element: SpellImpactSampleMap;
  };
}

const BASE = import.meta.env.BASE_URL;
const SAMPLE_CATALOG_URL = `${BASE}audio/sfx/catalog.json`;
const ENABLE_PROCEDURAL_FALLBACK = false;
const MAX_SAMPLE_WARMS_PER_CALL = 2;
const sampleBufferCache = new Map<string, AudioBuffer | null>();
const sampleBufferLoads = new Map<string, Promise<void>>();
let sampleCatalog: SampleCatalog | null = null;
let sampleCatalogLoad: Promise<void> | null = null;
let sampleCatalogUnavailable = false;

function toAssetUrl(path: string): string {
  if (path.startsWith('public/')) return `${BASE}${path.slice('public/'.length)}`;
  if (path.startsWith('/')) return `${BASE}${path.slice(1)}`;
  return `${BASE}${path}`;
}

function randomItem<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

const CURATED_POOL_BY_TYPE: Partial<Record<EffectSoundType, readonly string[]>> = {
  combat_strike: [
    'public/audio/sfx/damage/sfx_damage_creature_001.m4a',
  ],
  block_link: [],
  damage: [
    'public/audio/sfx/damage/sfx_damage_creature_001.m4a',
  ],
  player_damage: [
    'public/audio/sfx/damage/sfx_damage_hero_001.m4a',
  ],
  death: [
    'public/audio/sfx/death/sfx_death_creature_001.m4a',
  ],
  heal: [
    'public/audio/sfx/heal/sfx_heal_creature_001.m4a',
  ],
  player_heal: [
    'public/audio/sfx/heal/sfx_heal_hero_001.m4a',
  ],
  summon: [
    'public/audio/sfx/summon/sfx_summon_creature_001.m4a',
    'public/audio/sfx/summon/sfx_bounce_creature_001.m4a',
  ],
  keyword: [
    'public/audio/sfx/keyword/sfx_keyword_trigger_001.m4a',
  ],
  ui: [
    'public/audio/sfx/ui/sfx_card_draw_001.m4a',
    'public/audio/sfx/ui/sfx_phase_draw_001.m4a',
    'public/audio/sfx/ui/sfx_phase_energy_001.m4a',
    'public/audio/sfx/ui/sfx_target_lock_001.m4a',
    'public/audio/sfx/ui/sfx_turn_start_001.m4a',
    'public/audio/sfx/ui/sfx_ui_error_001.m4a',
  ],
};

const CURATED_SPELL_POOL = {
  fire: [
    'public/audio/sfx/spell/fire/sfx_spell_fire_001.m4a',
  ],
  water: [
    'public/audio/sfx/spell/water/sfx_spell_water_001.m4a',
  ],
  air: [
    'public/audio/sfx/spell/air/sfx_spell_air_001.m4a',
  ],
  earth: [
    'public/audio/sfx/spell/earth/sfx_spell_earth_001.m4a',
  ],
  shadow: [
    'public/audio/sfx/spell/shadow/sfx_spell_shadow_001.m4a',
  ],
  heal: [
    'public/audio/sfx/spell/heal/sfx_spell_heal_001.m4a',
  ],
} as const;

const SOUND_ID_SAMPLE_PATHS: Record<string, string> = {
  sfx_summon_creature: 'public/audio/sfx/summon/sfx_summon_creature_001.m4a',
  sfx_bounce_creature: 'public/audio/sfx/summon/sfx_bounce_creature_001.m4a',
  sfx_card_draw: 'public/audio/sfx/ui/sfx_card_draw_001.m4a',
  sfx_phase_draw: 'public/audio/sfx/ui/sfx_phase_draw_001.m4a',
  sfx_phase_energy: 'public/audio/sfx/ui/sfx_phase_energy_001.m4a',
  sfx_target_lock: 'public/audio/sfx/ui/sfx_target_lock_001.m4a',
  sfx_turn_start: 'public/audio/sfx/ui/sfx_turn_start_001.m4a',
  sfx_ui_error: 'public/audio/sfx/ui/sfx_ui_error_001.m4a',
};

function preferAllowList(candidates: string[], allowList?: readonly string[]): string[] {
  if (!allowList || allowList.length === 0) return candidates;
  const included = candidates.filter((path) => allowList.includes(path));
  return included.length > 0 ? included : candidates;
}

function curateCandidates(
  type: EffectSoundType,
  candidates: string[],
  opts: { element?: Element; spellImpactKind?: SpellImpactKind },
): string[] {
  if (candidates.length === 0) return candidates;

  if (type === 'spell_impact') {
    if (opts.spellImpactKind === 'heal') return preferAllowList(candidates, CURATED_SPELL_POOL.heal);
    switch (opts.element) {
      case 'fire':
        return preferAllowList(candidates, CURATED_SPELL_POOL.fire);
      case 'water':
        return preferAllowList(candidates, CURATED_SPELL_POOL.water);
      case 'air':
        return preferAllowList(candidates, CURATED_SPELL_POOL.air);
      case 'earth':
        return preferAllowList(candidates, CURATED_SPELL_POOL.earth);
      case 'shadow':
        return preferAllowList(candidates, CURATED_SPELL_POOL.shadow);
      default:
        return candidates;
    }
  }

  const curated = CURATED_POOL_BY_TYPE[type];
  if (curated) return preferAllowList(candidates, curated);

  switch (type) {
    case 'ui':
    default:
      return candidates;
  }
}

function normalizeSampleGain(type: EffectSoundType, amount?: number): number {
  if (type === 'damage' || type === 'player_damage') {
    const strength = Math.max(1, amount ?? 1);
    return Math.min(1.3, 0.75 + strength * 0.08);
  }
  if (type === 'death') return 0.95;
  return 0.85;
}

function resolveElementSpellCandidates(map: SpellImpactSampleMap, element?: Element): string[] {
  switch (element) {
    case 'fire':
      return map.fire;
    case 'water':
      return map.water;
    case 'air':
      return map.air;
    case 'earth':
      return [...map.earth, ...map.nature];
    case 'shadow':
      return map.shadow;
    default:
      return map.fire;
  }
}

function resolveSpellCandidates(
  map: SpellImpactSampleMap,
  opts: { element?: Element; spellImpactKind?: SpellImpactKind },
): string[] {
  const byElement = resolveElementSpellCandidates(map, opts.element);
  if (opts.spellImpactKind === 'heal') return [...map.heal, ...byElement];
  return byElement;
}

function resolveCandidates(
  catalog: SampleCatalog,
  type: EffectSoundType,
  opts: { element?: Element; spellImpactKind?: SpellImpactKind },
): string[] {
  const runtime = catalog.runtime_sound_types;
  switch (type) {
    case 'combat_strike':
      return runtime.combat_strike;
    case 'block_link':
      return runtime.block_link;
    case 'damage':
      return runtime.damage;
    case 'player_damage':
      return runtime.player_damage;
    case 'death':
      return runtime.death;
    case 'spell_impact':
      return resolveSpellCandidates(runtime.spell_impact_by_element, opts);
    case 'heal':
      return runtime.heal;
    case 'player_heal':
      return runtime.player_heal;
    case 'summon':
      return runtime.summon;
    case 'keyword':
      return runtime.keyword;
    case 'ui':
      return runtime.ui;
    default:
      return [];
  }
}

function loadSampleCatalog(): void {
  if (sampleCatalog || sampleCatalogLoad || sampleCatalogUnavailable || typeof window === 'undefined') return;
  sampleCatalogLoad = (async () => {
    try {
      const res = await fetch(SAMPLE_CATALOG_URL, { cache: 'no-store' });
      if (!res.ok) {
        sampleCatalogUnavailable = true;
        return;
      }
      const data = await res.json() as SampleCatalog;
      sampleCatalog = data;
    } catch {
      sampleCatalogUnavailable = true;
    } finally {
      sampleCatalogLoad = null;
    }
  })();
}

if (typeof window !== 'undefined') loadSampleCatalog();

function warmSampleBuffer(ctx: AudioContext, url: string): void {
  if (sampleBufferCache.has(url) || sampleBufferLoads.has(url)) return;
  const load = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        sampleBufferCache.set(url, null);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      sampleBufferCache.set(url, buffer);
    } catch {
      sampleBufferCache.set(url, null);
    } finally {
      sampleBufferLoads.delete(url);
    }
  })();
  sampleBufferLoads.set(url, load);
}

function playSampleBuffer(
  ctx: AudioContext,
  dest: AudioNode,
  buffer: AudioBuffer,
  gainValue: number,
): void {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(gain).connect(dest);
  source.start(ctx.currentTime);
}

function tryPlaySample(
  ctx: AudioContext,
  dest: AudioNode,
  type: EffectSoundType,
  opts: { element?: Element; amount?: number; spellImpactKind?: SpellImpactKind },
): SamplePlayResult {
  if (sampleCatalogUnavailable) return 'unavailable';
  if (!sampleCatalog) {
    loadSampleCatalog();
    return 'pending';
  }
  const candidates = curateCandidates(type, resolveCandidates(sampleCatalog, type, opts), opts);
  return tryPlayCandidates(ctx, dest, type, candidates, opts.amount);
}

function tryPlayCandidates(
  ctx: AudioContext,
  dest: AudioNode,
  type: EffectSoundType,
  candidates: string[],
  amount?: number,
): SamplePlayResult {
  if (candidates.length === 0) return 'unavailable';

  const ready: AudioBuffer[] = [];
  let hasPendingLoad = false;
  let warmBudget = MAX_SAMPLE_WARMS_PER_CALL;
  for (const path of candidates) {
    const url = toAssetUrl(path);
    const cached = sampleBufferCache.get(url);
    if (cached === undefined) {
      if (warmBudget > 0) {
        warmSampleBuffer(ctx, url);
        warmBudget -= 1;
      }
      hasPendingLoad = true;
      continue;
    }
    if (sampleBufferLoads.has(url)) {
      hasPendingLoad = true;
      continue;
    }
    if (cached) ready.push(cached);
  }

  const selected = randomItem(ready);
  if (selected) {
    playSampleBuffer(ctx, dest, selected, normalizeSampleGain(type, amount));
    return 'played';
  }

  if (hasPendingLoad) return 'pending';
  return 'unavailable';
}

// ─── Element Frequency Map ───

const ELEMENT_FREQ: Record<Element, number> = {
  fire: 220,
  water: 440,
  earth: 110,
  air: 660,
  shadow: 165,
};

function baseFreq(element?: Element): number {
  return element ? ELEMENT_FREQ[element] : 330;
}

// ─── Noise Buffer (shared, created once) ───

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const size = ctx.sampleRate * 0.25;
    noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// ─── Synthesis Functions ───
// Volume is controlled by the sfxGain bus — these use fixed relative gains.

function playCombatStrike(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Swoosh: filtered noise burst
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = freq * 2;
  bpf.Q.value = 2;
  const swooshGain = ctx.createGain();
  swooshGain.gain.setValueAtTime(0.5, now);
  swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noiseSrc.connect(bpf).connect(swooshGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.15);

  // Impact thud: low sine drop
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
  const impactGain = ctx.createGain();
  impactGain.gain.setValueAtTime(0.001, now);
  impactGain.gain.setValueAtTime(0.6, now + 0.08);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(impactGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.23);
}

function playBlockLink(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;

  // Metallic clank: two detuned sawtooth oscillators
  for (const freq of [800, 1050]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }
}

function playDamage(ctx: AudioContext, dest: AudioNode, amount: number): void {
  const now = ctx.currentTime;
  const intensity = Math.min(1, 0.3 + amount * 0.07);

  // Short percussive hit: highpass noise
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(intensity * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noiseSrc.connect(hpf).connect(gain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.09);
}

function playPlayerDamage(ctx: AudioContext, dest: AudioNode, amount: number): void {
  const now = ctx.currentTime;
  const intensity = Math.min(1, amount / 5);

  // Deep thud
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(intensity * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.31);

  // Low rumble noise
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 200;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(intensity * 0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  noiseSrc.connect(lpf).connect(noiseGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.26);
}

function playDeath(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Dissolution: 3 detuned sines fading out
  for (const mult of [1, 1.5, 2]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    osc.detune.value = (Math.random() - 0.5) * 20;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.71);
  }
}

function playSpellImpact(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Chime: sine + triangle mix
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq * 2;
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(dest);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.41);
  osc2.stop(now + 0.41);

  // Noise burst for impact feel
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = freq * 4;
  bpf.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noiseSrc.connect(bpf).connect(noiseGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.13);
}

function playHeal(ctx: AudioContext, dest: AudioNode, amount: number): void {
  const now = ctx.currentTime;
  const tones = amount >= 3 ? [523, 659, 784] : [523, 659];

  // Ascending chime: arpeggiated sine tones
  tones.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = now + i * 0.06;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(start + 0.31);
  });
}

function playSummon(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Rising whoosh: frequency sweep
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * 0.5, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.setValueAtTime(0.4, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.41);

  // Landing thud
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(80, now + 0.2);
  thud.frequency.exponentialRampToValueAtTime(30, now + 0.35);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.001, now);
  thudGain.gain.setValueAtTime(0.45, now + 0.2);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  thud.connect(thudGain).connect(dest);
  thud.start(now);
  thud.stop(now + 0.36);
}

function playKeyword(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;

  // Crystalline ding: high pure sine
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.21);
}

// ─── Public API ───

const SOUND_REGISTRY: Record<string, SoundFn> = {};

export function registerSound(id: string, fn: SoundFn): void {
  SOUND_REGISTRY[id] = fn;
}

/** Diagnostic snapshot for debug panel. */
export function getAudioDiagnostics(): {
  contextState: string;
  catalogStatus: string;
  cachedSamples: number;
  failedSamples: number;
  pendingLoads: number;
} {
  let contextState = 'not created';
  try {
    const c = getAudioContext();
    contextState = c.state;
  } catch { /* no context */ }

  return {
    contextState,
    catalogStatus: sampleCatalog ? 'loaded' : sampleCatalogUnavailable ? 'unavailable' : sampleCatalogLoad ? 'loading' : 'not started',
    cachedSamples: [...sampleBufferCache.values()].filter((b) => b !== null).length,
    failedSamples: [...sampleBufferCache.values()].filter((b) => b === null).length,
    pendingLoads: sampleBufferLoads.size,
  };
}

export function playEffectSound(
  type: EffectSoundType,
  opts: { element?: Element; amount?: number; soundId?: string; spellImpactKind?: SpellImpactKind },
): void {
  const ctx = getAudioContext();
  const dest = getSfxGain();

  if (opts.soundId && SOUND_REGISTRY[opts.soundId]) {
    SOUND_REGISTRY[opts.soundId](ctx, dest);
    return;
  }

  if (opts.soundId) {
    const soundPath = SOUND_ID_SAMPLE_PATHS[opts.soundId];
    if (soundPath) {
      const byIdResult = tryPlayCandidates(ctx, dest, type, [soundPath], opts.amount);
      if (byIdResult === 'played' || byIdResult === 'pending') return;
    }
  }

  const sampleResult = tryPlaySample(ctx, dest, type, opts);
  if (sampleResult === 'played' || sampleResult === 'pending') return;
  if (!ENABLE_PROCEDURAL_FALLBACK) return;

  switch (type) {
    case 'combat_strike':
      playCombatStrike(ctx, dest, opts.element);
      break;
    case 'block_link':
      playBlockLink(ctx, dest);
      break;
    case 'damage':
      playDamage(ctx, dest, opts.amount ?? 1);
      break;
    case 'player_damage':
      playPlayerDamage(ctx, dest, opts.amount ?? 1);
      break;
    case 'death':
      playDeath(ctx, dest, opts.element);
      break;
    case 'spell_impact':
      playSpellImpact(ctx, dest, opts.element);
      break;
    case 'heal':
    case 'player_heal':
      playHeal(ctx, dest, opts.amount ?? 1);
      break;
    case 'summon':
      playSummon(ctx, dest, opts.element);
      break;
    case 'keyword':
      playKeyword(ctx, dest);
      break;
  }
}
