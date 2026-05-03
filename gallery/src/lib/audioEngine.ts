/**
 * SynthEngine — RFC-010 four-layer "core synth" voicing.
 *
 * Layer 1 (drone)  : OscillatorNode → BiquadFilter → Gain. Pitch + cutoff follow data value.
 * Layer 2 (pulse)  : Scheduled BufferSource taps. Rate (BPM) follows |Δ value|, pitch follows direction.
 * Layer 3 (accent) : One-shot BufferSource on key-moment events.
 * Layer 4 (texture): Looping noise BufferSource → Filter → Gain. Seasonal envelope.
 *
 * Frame-driven: VideoEditor calls setFrame() at playback rate. Smooth parameter
 * changes use AudioParam.setTargetAtTime to avoid clicks.
 *
 * The companion AmbientEngine (audioEngineAmbient.ts) implements the same interface
 * with JMJ-style detuned pad + arpeggio + reverb voicings.
 */

import type { AudioPreset } from './audioPresets';
import {
  type AudioEngineInterface,
  type ChannelMix,
  type ChannelState,
  type EqSettings,
  type FrameView,
  type SampleBank,
  DEFAULT_CHANNEL_MIX,
  DEFAULT_EQ,
  PulseScheduler,
  arcAt,
  buildEqChain,
  channelScale,
  loadSampleBank,
} from './audioEngineTypes';

// Re-export for backwards compatibility (other modules import these from audioEngine)
export type { FrameView, ChannelState } from './audioEngineTypes';

export class SynthEngine implements AudioEngineInterface {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVolume = 0.8;

  // Drone subgraph
  private droneOscs: OscillatorNode[] = [];
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;

  // Pulse subgraph
  private pulseGain: GainNode | null = null;
  private pulseScheduler = new PulseScheduler();

  // Accent subgraph
  private accentGain: GainNode | null = null;

  // Texture subgraph
  private textureSource: AudioBufferSourceNode | null = null;
  private textureFilter: BiquadFilterNode | null = null;
  private textureGain: GainNode | null = null;

  private samples: SampleBank | null = null;
  private preset: AudioPreset | null = null;
  private running = false;
  private channels: ChannelState = { drone: 0, pulse: 0, accent: false, texture: 0 };
  private accentCooldownUntil = 0;
  private fps = 12;
  private mix: ChannelMix = DEFAULT_CHANNEL_MIX;
  private eq: EqSettings = DEFAULT_EQ;
  private eqBass: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqTreble: BiquadFilterNode | null = null;
  private tensionArc: number[] = [];

  /** Load sample bank. Idempotent — safe to call once per session. */
  async loadSamples(): Promise<void> {
    if (this.samples) return;
    const ctx = this.ensureCtx();
    this.samples = await loadSampleBank(ctx);
  }

  setPreset(preset: AudioPreset): void {
    this.preset = preset;
    if (this.running) {
      this.applyPresetGains();
      this.rebuildDroneIfNeeded();
    }
  }

  setFps(fps: number): void {
    this.fps = Math.max(1, fps);
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  setChannelMix(mix: ChannelMix): void {
    this.mix = mix;
    if (this.running) this.applyPresetGains();
  }

  setEq(eq: EqSettings): void {
    this.eq = eq;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.eqBass) this.eqBass.gain.setTargetAtTime(eq.bass, t, 0.05);
    if (this.eqMid) this.eqMid.gain.setTargetAtTime(eq.mid, t, 0.05);
    if (this.eqTreble) this.eqTreble.gain.setTargetAtTime(eq.treble, t, 0.05);
  }

  setTensionArc(arc: number[]): void {
    this.tensionArc = arc;
  }

  /** Resume the audio context and start all sustained layers. Requires user gesture. */
  async start(): Promise<void> {
    if (this.running) return;
    if (!this.preset) throw new Error('AudioEngine.start: setPreset() first');
    await this.loadSamples();
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = this.masterVolume;
    // Master → 3-band EQ → destination
    const eq = buildEqChain(ctx, this.eq);
    this.master.connect(eq.head);
    eq.tail.connect(ctx.destination);
    this.eqBass = eq.bass;
    this.eqMid = eq.mid;
    this.eqTreble = eq.treble;

    this.buildDrone();
    this.buildPulseBus();
    this.buildAccentBus();
    this.buildTexture();

    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    try {
      this.droneOscs.forEach((o) => o.stop());
      this.textureSource?.stop();
    } catch {
      // already stopped
    }
    this.droneOscs = [];
    this.droneFilter = null;
    this.droneGain = null;
    this.pulseGain = null;
    this.accentGain = null;
    this.textureSource = null;
    this.textureFilter = null;
    this.textureGain = null;
    this.eqBass?.disconnect();
    this.eqMid?.disconnect();
    this.eqTreble?.disconnect();
    this.eqBass = null;
    this.eqMid = null;
    this.eqTreble = null;
    this.master?.disconnect();
    this.master = null;
    this.pulseScheduler.reset();
    this.channels = { drone: 0, pulse: 0, accent: false, texture: 0 };
  }

  /** Frame-driven update — VideoEditor calls this each playback tick. */
  setFrame(view: FrameView): void {
    if (!this.running || !this.ctx || !this.preset) return;
    const now = this.ctx.currentTime;
    const p = this.preset;
    const frameSec = 1 / this.fps;
    const arcValue = arcAt(this.tensionArc, view.frame);

    // Re-key bus gains so pulse + accent track the arc on each frame
    this.applyPresetGains(arcValue);

    // ── Drone: minor triad rooted at tonic; filter+gain follow value/intensity ─
    if (this.droneOscs.length > 0 && this.droneFilter && this.droneGain) {
      const tonicHz = p.drone.minHz + (p.drone.maxHz - p.drone.minHz) * view.value;
      const targetCutoff = p.drone.filterMinHz + (p.drone.filterMaxHz - p.drone.filterMinHz) * view.value;
      const droneAmp = p.drone.gain * 0.6 * (0.4 + 0.6 * view.intensity) * channelScale(this.mix, 'drone') * arcValue;
      const semitones = [0, 3, 7];
      this.droneOscs.forEach((osc, i) => {
        const voiceHz = tonicHz * Math.pow(2, semitones[i] / 12);
        osc.frequency.setTargetAtTime(voiceHz, now, p.drone.glideSec);
      });
      this.droneFilter.frequency.setTargetAtTime(targetCutoff, now, p.drone.glideSec);
      this.droneGain.gain.setTargetAtTime(droneAmp, now, 0.05);
      this.channels.drone = view.intensity;
    }

    // ── Pulse: scheduled tap when phase wraps ─────────────────────────
    const bpm = p.pulse.minBpm + (p.pulse.maxBpm - p.pulse.minBpm) * Math.min(1, view.delta * p.pulse.sensitivity * 4);
    if (this.pulseScheduler.step(bpm, frameSec)) {
      this.firePulse(view.direction);
    }
    this.channels.pulse = view.delta;

    // ── Accent: one-shot on event (with cooldown to avoid stutter) ───
    if (view.isAccent && now > this.accentCooldownUntil) {
      this.fireAccent(view.accentType);
      this.accentCooldownUntil = now + 0.8;
      this.channels.accent = true;
    } else {
      this.channels.accent = false;
    }

    // ── Texture: seasonal envelope on density ─────────────────────────
    if (this.textureFilter && this.textureGain) {
      const seasonal = 1 - p.texture.seasonalDepth + p.texture.seasonalDepth * (0.5 + 0.5 * Math.cos(view.monthFrac * Math.PI * 2));
      const yearRamp = 0.5 + 0.5 * view.yearFrac;
      const textureAmp = p.texture.gain * p.texture.density * seasonal * yearRamp * channelScale(this.mix, 'texture') * arcValue;
      const filterTarget = p.texture.filterMinHz + (p.texture.filterMaxHz - p.texture.filterMinHz) * view.value;
      this.textureGain.gain.setTargetAtTime(textureAmp, now, 0.2);
      this.textureFilter.frequency.setTargetAtTime(filterTarget, now, 0.3);
      this.channels.texture = textureAmp / Math.max(0.0001, p.texture.gain);
    }
  }

  getLiveChannels(): ChannelState {
    return { ...this.channels };
  }

  dispose(): void {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.samples = null;
  }

  // ── Private builders ────────────────────────────────────────────────

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private buildDrone(): void {
    if (!this.ctx || !this.master || !this.preset) return;
    const ctx = this.ctx;
    const p = this.preset.drone;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterMinHz;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(this.master);

    // Three-voice minor triad (tonic / minor 3rd / perfect 5th) — chord pad, not single drone
    const voices = [
      { semitones: 0,  detune: -4 },
      { semitones: 3,  detune:  0 },
      { semitones: 7,  detune: +4 },
    ];
    const oscs: OscillatorNode[] = [];
    for (const v of voices) {
      const o = ctx.createOscillator();
      o.type = p.waveform;
      o.frequency.value = p.minHz * Math.pow(2, v.semitones / 12);
      o.detune.value = v.detune;
      o.connect(filter);
      o.start();
      oscs.push(o);
    }
    // Compensate for 3-voice stack (sqrt(3) ≈ 1.73× single voice)
    gain.gain.setTargetAtTime(p.gain * 0.24, ctx.currentTime, 0.4);
    this.droneOscs = oscs;
    this.droneFilter = filter;
    this.droneGain = gain;
  }

  private rebuildDroneIfNeeded(): void {
    if (!this.preset || this.droneOscs.length === 0) return;
    if (this.droneOscs[0].type !== this.preset.drone.waveform) {
      // Waveform changed — rebuild drone subgraph cleanly
      try {
        this.droneOscs.forEach((o) => o.stop());
      } catch {
        // already stopped
      }
      this.droneOscs.forEach((o) => o.disconnect());
      this.droneFilter?.disconnect();
      this.droneGain?.disconnect();
      this.buildDrone();
    }
  }

  private buildPulseBus(): void {
    if (!this.ctx || !this.master || !this.preset) return;
    const gain = this.ctx.createGain();
    gain.gain.value = this.preset.pulse.gain * channelScale(this.mix, 'pulse');
    gain.connect(this.master);
    this.pulseGain = gain;
  }

  private buildAccentBus(): void {
    if (!this.ctx || !this.master || !this.preset) return;
    const gain = this.ctx.createGain();
    gain.gain.value = this.preset.accent.gain * channelScale(this.mix, 'accent');
    gain.connect(this.master);
    this.accentGain = gain;
  }

  private buildTexture(): void {
    if (!this.ctx || !this.master || !this.samples || !this.preset) return;
    const ctx = this.ctx;
    const p = this.preset.texture;
    const src = ctx.createBufferSource();
    src.buffer = this.samples.textureNoise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterMinHz;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    gain.gain.setTargetAtTime(p.gain * p.density * 0.5, ctx.currentTime, 0.6);
    this.textureSource = src;
    this.textureFilter = filter;
    this.textureGain = gain;
  }

  private applyPresetGains(arcValue = 1.0): void {
    if (!this.ctx || !this.preset) return;
    const now = this.ctx.currentTime;
    if (this.pulseGain) {
      this.pulseGain.gain.setTargetAtTime(this.preset.pulse.gain * channelScale(this.mix, 'pulse') * arcValue, now, 0.1);
    }
    if (this.accentGain) {
      this.accentGain.gain.setTargetAtTime(this.preset.accent.gain * channelScale(this.mix, 'accent') * arcValue, now, 0.1);
    }
  }

  private firePulse(direction: 1 | 0 | -1): void {
    if (!this.ctx || !this.samples || !this.pulseGain) return;
    const buf =
      direction > 0 ? this.samples.pulseUp :
      direction < 0 ? this.samples.pulseDown :
      this.samples.pulseNeutral;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.pulseGain);
    src.start();
  }

  private fireAccent(type: FrameView['accentType']): void {
    if (!this.ctx || !this.samples || !this.accentGain || !this.preset) return;
    const buf = pickAccentBuffer(this.samples, this.preset.accent.style, type);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.accentGain);
    src.start();
  }
}

function pickAccentBuffer(
  s: SampleBank,
  style: AudioPreset['accent']['style'],
  type: FrameView['accentType'],
): AudioBuffer {
  // Style overrides type for unified character; default chime mirrors event type.
  if (style === 'bell') return s.accentInflection;
  if (style === 'ping') return s.accentHigh;
  if (style === 'drop') return s.accentLow;
  // chime (default)
  if (type === 'record-high') return s.accentHigh;
  if (type === 'record-low') return s.accentLow;
  return s.accentInflection;
}
