import { getAudioContext, getMusicGain } from './audioContext';

// ─── Ambient State ───

let isPlaying = false;
let cleanupFn: (() => void) | null = null;

// Pentatonic-friendly chord sequence — gentle, kid-appropriate
const CHORD_SEQUENCE: number[][] = [
  [130.8, 196.0, 261.6], // C3 / G3 / C4
  [146.8, 220.0, 293.7], // D3 / A3 / D4
  [110.0, 164.8, 220.0], // A2 / E3 / A3
  [123.5, 185.0, 246.9], // B2 / F#3 / B3
];

const CHORD_DURATION_MS = 8000;

// ─── Public API ───

export function startAmbientMusic(): void {
  if (isPlaying) return;
  isPlaying = true;

  const ctx = getAudioContext();
  const masterDest = getMusicGain();
  const allNodes: AudioNode[] = [];
  let chordIndex = 0;
  let currentOscillators: OscillatorNode[] = [];
  let currentChordGain: GainNode | null = null;
  let crossfadeTimeout: ReturnType<typeof setTimeout> | null = null;

  function buildChord(freqs: number[]): { oscillators: OscillatorNode[]; gain: GainNode } {
    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.001, ctx.currentTime);
    chordGain.gain.linearRampToValueAtTime(0.33, ctx.currentTime + 2);
    chordGain.connect(masterDest);
    allNodes.push(chordGain);

    const oscillators: OscillatorNode[] = [];
    for (const freq of freqs) {
      // 3 detuned sines per note for warmth
      for (const detune of [-4, 0, 4]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(chordGain);
        osc.start();
        oscillators.push(osc);
        allNodes.push(osc);
      }
    }
    return { oscillators, gain: chordGain };
  }

  function advanceChord() {
    // Fade out previous chord
    if (currentChordGain) {
      const oldGain = currentChordGain;
      const oldOscs = currentOscillators;
      oldGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2);
      crossfadeTimeout = setTimeout(() => {
        crossfadeTimeout = null;
        oldOscs.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
        oldGain.disconnect();
      }, 2500);
    }

    chordIndex = (chordIndex + 1) % CHORD_SEQUENCE.length;
    const result = buildChord(CHORD_SEQUENCE[chordIndex]);
    currentOscillators = result.oscillators;
    currentChordGain = result.gain;
  }

  // Start first chord
  const initial = buildChord(CHORD_SEQUENCE[0]);
  currentOscillators = initial.oscillators;
  currentChordGain = initial.gain;

  const chordInterval = setInterval(advanceChord, CHORD_DURATION_MS);

  // Texture layer: filtered noise for atmosphere
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 300;
  lpf.Q.value = 1;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.06;

  noiseSrc.connect(lpf).connect(noiseGain).connect(masterDest);
  noiseSrc.start();
  allNodes.push(noiseSrc, lpf, noiseGain);

  cleanupFn = () => {
    clearInterval(chordInterval);
    if (crossfadeTimeout) clearTimeout(crossfadeTimeout);
    allNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          (node as OscillatorNode | AudioBufferSourceNode).stop();
        }
      } catch { /* already stopped */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
    });
    currentOscillators = [];
    currentChordGain = null;
  };
}

export function stopAmbientMusic(): void {
  if (!isPlaying) return;
  isPlaying = false;
  cleanupFn?.();
  cleanupFn = null;
}
