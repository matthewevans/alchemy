import { getAudioContext, getMusicGain } from './audioContext';

const BASE = import.meta.env.BASE_URL;

export const AMBIENT_TRACK_POOL = [
  `${BASE}audio/music/background/bgm_01.mp3`,
  `${BASE}audio/music/background/bgm_02.mp3`,
  `${BASE}audio/music/background/bgm_03.mp3`,
  `${BASE}audio/music/background/bgm_04.mp3`,
  `${BASE}audio/music/background/bgm_05.mp3`,
  `${BASE}audio/music/background/bgm_06.mp3`,
  `${BASE}audio/music/background/bgm_07.mp3`,
  `${BASE}audio/music/background/bgm_08.mp3`,
  `${BASE}audio/music/background/bgm_09.mp3`,
  `${BASE}audio/music/background/bgm_10.mp3`,
  `${BASE}audio/music/background/bgm_11.mp3`,
  `${BASE}audio/music/background/bgm_12.mp3`,
  `${BASE}audio/music/background/bgm_13.mp3`,
  `${BASE}audio/music/background/bgm_14.mp3`,
] as const;

const TRACK_POOL = [...AMBIENT_TRACK_POOL];
const DEFAULT_TRACK_KEY = '__default__';

const BATTLEFIELD_TRACKS: Record<string, string[]> = {
  fire_molten: TRACK_POOL,
  water_moonlit_ocean_temple: TRACK_POOL,
  water_frozen_aurora: TRACK_POOL,
  earth_jurassic: TRACK_POOL,
  earth_snowy_forest: TRACK_POOL,
  air_angelic_sky: TRACK_POOL,
  shadow_haunted_graveyard: TRACK_POOL,
  shadow_ruined_archway: TRACK_POOL,
};

let isPlaying = false;
let currentBattlefieldId: string | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let loadToken = 0;

const decodedTrackCache = new Map<string, AudioBuffer>();
const lastTrackByBattlefield = new Map<string, string>();

function getTracksForBattlefield(battlefieldId: string | null): string[] {
  if (!battlefieldId) return TRACK_POOL;
  return BATTLEFIELD_TRACKS[battlefieldId] ?? TRACK_POOL;
}

function pickRandomTrack(battlefieldId: string | null): string {
  const tracks = getTracksForBattlefield(battlefieldId);
  if (tracks.length === 0) throw new Error('No ambient music tracks configured.');

  if (tracks.length === 1) return tracks[0];
  const trackKey = battlefieldId ?? DEFAULT_TRACK_KEY;
  const lastTrack = lastTrackByBattlefield.get(trackKey);
  const candidates = lastTrack ? tracks.filter((t) => t !== lastTrack) : tracks;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  lastTrackByBattlefield.set(trackKey, chosen);
  return chosen;
}

async function decodeTrack(ctx: AudioContext, trackUrl: string): Promise<AudioBuffer> {
  const cached = decodedTrackCache.get(trackUrl);
  if (cached) return cached;

  const res = await fetch(trackUrl);
  if (!res.ok) throw new Error(`Failed to load ambient track: ${trackUrl}`);
  const data = await res.arrayBuffer();
  const decoded = await ctx.decodeAudioData(data);
  decodedTrackCache.set(trackUrl, decoded);
  return decoded;
}

function fadeOutAndStop(source: AudioBufferSourceNode, gain: GainNode, ctx: AudioContext): void {
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

  setTimeout(() => {
    try { source.stop(); } catch { /* already stopped */ }
    try { source.disconnect(); } catch { /* already disconnected */ }
    try { gain.disconnect(); } catch { /* already disconnected */ }
  }, 700);
}

function stopCurrentTrack(): void {
  if (!currentSource || !currentGain) return;
  const ctx = getAudioContext();
  fadeOutAndStop(currentSource, currentGain, ctx);
  currentSource = null;
  currentGain = null;
}

async function playRandomTrackForCurrentBattlefield(token: number): Promise<void> {
  const ctx = getAudioContext();
  const trackUrl = pickRandomTrack(currentBattlefieldId);

  try {
    const decoded = await decodeTrack(ctx, trackUrl);
    if (!isPlaying || token !== loadToken) return;

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.loop = false;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.9);

    source.connect(gain).connect(getMusicGain());
    source.start();
    source.onended = () => {
      if (!isPlaying || token !== loadToken || currentSource !== source) return;
      void playRandomTrackForCurrentBattlefield(token);
    };

    const previousSource = currentSource;
    const previousGain = currentGain;
    currentSource = source;
    currentGain = gain;

    if (previousSource && previousGain) {
      fadeOutAndStop(previousSource, previousGain, ctx);
    }
  } catch (err) {
    if (token !== loadToken) return;
    console.warn('[Alchemy] Ambient music track failed to play.', err);
  }
}

function restartAmbientTrack(): void {
  loadToken += 1;
  const token = loadToken;
  void playRandomTrackForCurrentBattlefield(token);
}

export function setAmbientMusicBattlefield(battlefieldId: string | null): void {
  if (currentBattlefieldId === battlefieldId) return;
  currentBattlefieldId = battlefieldId;
  if (isPlaying) restartAmbientTrack();
}

export function startAmbientMusic(): void {
  if (isPlaying) return;
  isPlaying = true;
  restartAmbientTrack();
}

export function stopAmbientMusic(): void {
  if (!isPlaying) return;
  isPlaying = false;
  loadToken += 1;
  stopCurrentTrack();
}
