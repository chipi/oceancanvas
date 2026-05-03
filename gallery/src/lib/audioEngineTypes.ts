/**
 * Shared types for all audio engines.
 *
 * Multiple engines (synth, ambient, …) implement the same interface so the
 * VideoEditor and the visualizer don't need to know which engine is running.
 * Engines differ in their voicings, not their wiring.
 */

import type { AudioPreset } from './audioPresets';

export interface FrameView {
  frame: number;
  intensity: number;          // 0–1, smoothed moment intensity
  value: number;              // 0–1 normalised data value (drives pitch)
  delta: number;              // 0–1 |Δ| between consecutive frames
  direction: 1 | 0 | -1;      // sign of Δ
  isAccent: boolean;          // key moment fires now
  accentType: 'record-high' | 'record-low' | 'inflection' | null;
  monthFrac: number;          // 0–1 month of year
  yearFrac: number;           // 0–1 timeline position
}

export interface ChannelState {
  drone: number;
  pulse: number;
  accent: boolean;
  texture: number;
}

/** Per-channel mixer controls — UI layer feeds these into the engine. */
export type ChannelKey = 'drone' | 'pulse' | 'accent' | 'texture';

export interface ChannelMix {
  drone: { volume: number; muted: boolean };
  pulse: { volume: number; muted: boolean };
  accent: { volume: number; muted: boolean };
  texture: { volume: number; muted: boolean };
}

export const DEFAULT_CHANNEL_MIX: ChannelMix = {
  drone: { volume: 1, muted: false },
  pulse: { volume: 1, muted: false },
  accent: { volume: 1, muted: false },
  texture: { volume: 1, muted: false },
};

export function channelScale(mix: ChannelMix, ch: ChannelKey): number {
  const c = mix[ch];
  return c.muted ? 0 : Math.max(0, Math.min(2, c.volume));
}

/** Three-band master EQ — gains in dB, range [-12, +12]. */
export interface EqSettings {
  bass: number;     // lowshelf, ~200Hz
  mid: number;      // peaking, ~1000Hz
  treble: number;   // highshelf, ~3500Hz
}

export const DEFAULT_EQ: EqSettings = { bass: 0, mid: 0, treble: 0 };

export type EqBand = keyof EqSettings;

/** Contract every audio engine must satisfy. */
export interface AudioEngineInterface {
  loadSamples(): Promise<void>;
  setPreset(preset: AudioPreset): void;
  setFps(fps: number): void;
  setMasterVolume(v: number): void;
  setChannelMix(mix: ChannelMix): void;
  setEq(eq: EqSettings): void;
  start(): Promise<void>;
  stop(): void;
  setFrame(view: FrameView): void;
  getLiveChannels(): ChannelState;
  dispose(): void;
}

/**
 * Build a 3-band EQ chain (bass shelf → mid peak → treble shelf) and return
 * the head of the chain (connect master into here) and the tail (connect to
 * destination). Filter handles are returned so engines can update gains live.
 */
export function buildEqChain(ctx: AudioContext, eq: EqSettings): {
  head: BiquadFilterNode;
  tail: BiquadFilterNode;
  bass: BiquadFilterNode;
  mid: BiquadFilterNode;
  treble: BiquadFilterNode;
} {
  const bass = ctx.createBiquadFilter();
  bass.type = 'lowshelf';
  bass.frequency.value = 200;
  bass.gain.value = eq.bass;

  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 1;
  mid.gain.value = eq.mid;

  const treble = ctx.createBiquadFilter();
  treble.type = 'highshelf';
  treble.frequency.value = 3500;
  treble.gain.value = eq.treble;

  bass.connect(mid).connect(treble);
  return { head: bass, tail: treble, bass, mid, treble };
}

export interface SampleBank {
  pulseUp: AudioBuffer;
  pulseNeutral: AudioBuffer;
  pulseDown: AudioBuffer;
  accentHigh: AudioBuffer;
  accentLow: AudioBuffer;
  accentInflection: AudioBuffer;
  textureNoise: AudioBuffer;
}

export const ASSET_BASE = '/audio/generative';
export const SILENT_CHANNELS: ChannelState = { drone: 0, pulse: 0, accent: false, texture: 0 };

/** Decode the seven sample assets into AudioBuffers. */
export async function loadSampleBank(ctx: AudioContext): Promise<SampleBank> {
  const names: Array<[keyof SampleBank, string]> = [
    ['pulseUp', 'pulse_tick_up.mp3'],
    ['pulseNeutral', 'pulse_tick_neutral.mp3'],
    ['pulseDown', 'pulse_tick_down.mp3'],
    ['accentHigh', 'accent_record_high.mp3'],
    ['accentLow', 'accent_record_low.mp3'],
    ['accentInflection', 'accent_inflection.mp3'],
    ['textureNoise', 'texture_noise.mp3'],
  ];
  const bank: Partial<SampleBank> = {};
  await Promise.all(
    names.map(async ([key, file]) => {
      const buf = await fetch(`${ASSET_BASE}/${file}`)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab));
      bank[key] = buf;
    }),
  );
  return bank as SampleBank;
}

/**
 * Synthesize a stereo impulse-response buffer for ConvolverNode reverb.
 * Deterministic (fixed seed via simple LCG) so re-mounts produce the same reverb.
 */
export function makeReverbImpulse(
  ctx: AudioContext,
  durationSec: number,
  decay: number,
  seed = 1234,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * durationSec);
  const impulse = ctx.createBuffer(2, len, sr);
  // Simple LCG for reproducible noise
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    s = (seed + ch * 7919) >>> 0;
    for (let i = 0; i < len; i++) {
      data[i] = rand() * Math.pow(1 - i / len, decay);
    }
  }
  return impulse;
}

/** Pulse phase scheduler — fires when phase wraps past 1. Used by both engines. */
export class PulseScheduler {
  private phase = 0;
  step(bpm: number, frameSec: number): boolean {
    if (bpm <= 0 || frameSec <= 0) return false;
    this.phase += (bpm / 60) * frameSec;
    if (this.phase >= 1) {
      this.phase -= Math.floor(this.phase);
      return true;
    }
    return false;
  }
  reset() { this.phase = 0; }
}
