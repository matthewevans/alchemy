import { getAudioContext, getMusicGain } from './audioContext';

export const DECK_SELECT_TRACK_URL = `${import.meta.env.BASE_URL}audio/music/menu/deck_select.mp3`;

let isPlaying = false;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let loadToken = 0;
let decodedTrack: AudioBuffer | null = null;

async function decodeDeckSelectTrack(ctx: AudioContext): Promise<AudioBuffer> {
  if (decodedTrack) return decodedTrack;

  const res = await fetch(DECK_SELECT_TRACK_URL);
  if (!res.ok) throw new Error(`Failed to load deck-select music track: ${DECK_SELECT_TRACK_URL}`);

  const data = await res.arrayBuffer();
  decodedTrack = await ctx.decodeAudioData(data);
  return decodedTrack;
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

async function playDeckSelectTrack(token: number): Promise<void> {
  const ctx = getAudioContext();
  try {
    const decoded = await decodeDeckSelectTrack(ctx);
    if (!isPlaying || token !== loadToken) return;

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.9);

    source.connect(gain).connect(getMusicGain());
    source.start();

    const previousSource = currentSource;
    const previousGain = currentGain;
    currentSource = source;
    currentGain = gain;

    if (previousSource && previousGain) {
      fadeOutAndStop(previousSource, previousGain, ctx);
    }
  } catch (err) {
    if (token !== loadToken) return;
    console.warn('[Alchemy] Deck-select music track failed to play.', err);
  }
}

export function startDeckSelectMusic(): void {
  if (isPlaying) return;
  isPlaying = true;
  loadToken += 1;
  const token = loadToken;
  void playDeckSelectTrack(token);
}

export function stopDeckSelectMusic(): void {
  if (!isPlaying) return;
  isPlaying = false;
  loadToken += 1;
  stopCurrentTrack();
}
