/**
 * AmbientEngine — JMJ-style ambient electronic voicing.
 *
 * Same 4-channel contract as SynthEngine, fundamentally different sound:
 *
 *   Layer 1 (pad)       : 3 detuned oscillators (-7c / 0 / +7c) → resonant lowpass
 *                         with slow LFO sweep on cutoff. Slow attack. Wet via reverb.
 *   Layer 2 (sequence)  : One-shot synth voice per pulse tick. Pitch from a minor-pentatonic
 *                         scale relative to the pad's tonic. Short ADSR. Wet via reverb.
 *   Layer 3 (accent)    : Same sample bank, sent more wet than dry — chime tails ring.
 *   Layer 4 (texture)   : Noise loop with slow LFO on filter cutoff, wider envelope.
 *
 * A single ConvolverNode reverb bus receives sends from all four layers. The dry
 * pad+texture stay grounded; the wet sequence+accent provide JMJ-style space.
 *
 * Inspired by Jean-Michel Jarre — Oxygène pt. 4, Equinoxe pt. 5, Magnetic Fields pt. 2.
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
  holdAt,
  loadSampleBank,
  makeReverbImpulse,
} from './audioEngineTypes';

// Minor triad voicing — tonic, minor third, perfect fifth.
// Tiny per-voice detuning gives an analog-pad warmth without sounding out of tune.
const PAD_VOICES = [
  { semitones: 0,  detune: -4 },   // tonic
  { semitones: 3,  detune:  0 },   // minor third
  { semitones: 7,  detune: +4 },   // perfect fifth
];
// Minor pentatonic walk — JMJ Oxygène-style sequence pattern
const ARP_SCALE = [0, 3, 5, 7, 12, 7, 5, 3];

export class AmbientEngine implements AudioEngineInterface {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVolume = 0.8;

  // Pad subgraph
  private padOscs: OscillatorNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private padDryGain: GainNode | null = null;
  private padWetGain: GainNode | null = null;
  private padLfo: OscillatorNode | null = null;
  private padLfoGain: GainNode | null = null;

  // Sequence (arpeggio) — voices spawned per tick
  private seqDryGain: GainNode | null = null;
  private seqWetGain: GainNode | null = null;
  private pulseScheduler = new PulseScheduler();
  private arpStep = 0;

  // Accent send
  private accentDryGain: GainNode | null = null;
  private accentWetGain: GainNode | null = null;

  // Texture
  private textureSource: AudioBufferSourceNode | null = null;
  private textureFilter: BiquadFilterNode | null = null;
  private textureGain: GainNode | null = null;
  private textureLfo: OscillatorNode | null = null;

  // Reverb bus
  private reverb: ConvolverNode | null = null;

  private samples: SampleBank | null = null;
  private preset: AudioPreset | null = null;
  private running = false;
  private channels: ChannelState = { drone: 0, pulse: 0, accent: false, texture: 0 };
  private accentCooldownUntil = 0;
  private fps = 12;
  private currentTonicHz = 110;
  private mix: ChannelMix = DEFAULT_CHANNEL_MIX;
  private eq: EqSettings = DEFAULT_EQ;
  private eqBass: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqTreble: BiquadFilterNode | null = null;
  private tensionArc: number[] = [];
  private holdMask: boolean[] = [];

  async loadSamples(): Promise<void> {
    if (this.samples) return;
    const ctx = this.ensureCtx();
    this.samples = await loadSampleBank(ctx);
  }

  setPreset(preset: AudioPreset): void {
    const prevWaveform = this.preset?.drone.waveform;
    this.preset = preset;
    if (this.running) {
      this.applyPresetGains();
      if (prevWaveform !== preset.drone.waveform) this.rebuildPad();
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

  setHoldMask(mask: boolean[]): void {
    this.holdMask = mask;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.preset) throw new Error('AmbientEngine.start: setPreset() first');
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

    this.buildReverb();
    this.buildPad();
    this.buildSequenceBus();
    this.buildAccentBus();
    this.buildTexture();

    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    try {
      this.padOscs.forEach((o) => o.stop());
      this.padLfo?.stop();
      this.textureSource?.stop();
      this.textureLfo?.stop();
    } catch {
      // already stopped
    }
    this.padOscs = [];
    this.padFilter = null;
    this.padDryGain = null;
    this.padWetGain = null;
    this.padLfo = null;
    this.padLfoGain = null;
    this.seqDryGain = null;
    this.seqWetGain = null;
    this.accentDryGain = null;
    this.accentWetGain = null;
    this.textureSource = null;
    this.textureFilter = null;
    this.textureGain = null;
    this.textureLfo = null;
    this.reverb = null;
    this.eqBass?.disconnect();
    this.eqMid?.disconnect();
    this.eqTreble?.disconnect();
    this.eqBass = null;
    this.eqMid = null;
    this.eqTreble = null;
    this.master?.disconnect();
    this.master = null;
    this.pulseScheduler.reset();
    this.arpStep = 0;
    this.channels = { drone: 0, pulse: 0, accent: false, texture: 0 };
  }

  setFrame(view: FrameView): void {
    if (!this.running || !this.ctx || !this.preset) return;
    const now = this.ctx.currentTime;
    const p = this.preset;
    const frameSec = 1 / this.fps;
    const arcValue = arcAt(this.tensionArc, view.frame);
    const isHeld = holdAt(this.holdMask, view.frame);

    // Re-key sequence + accent bus gains so they track the arc
    this.applyPresetGains(arcValue);

    // ── Pad: minor triad rooted at tonic (Hz follows data value) ───────
    if (this.padOscs.length > 0 && this.padFilter && this.padDryGain && this.padWetGain) {
      const tonicHz = p.drone.minHz + (p.drone.maxHz - p.drone.minHz) * view.value;
      this.currentTonicHz = tonicHz;
      const baseCutoff = p.drone.filterMinHz + (p.drone.filterMaxHz - p.drone.filterMinHz) * view.value;
      const droneScale = channelScale(this.mix, 'drone');
      const padAmp = p.drone.gain * (0.6 + 0.4 * view.intensity) * droneScale * arcValue;
      // Compensate for 3-voice triad stack (sqrt(3) ≈ 1.73× sum vs single voice)
      const wetAmp = padAmp * 0.25;
      const glide = Math.max(0.2, p.drone.glideSec * 1.4);
      this.padOscs.forEach((osc, i) => {
        const voice = PAD_VOICES[i];
        const voiceHz = tonicHz * Math.pow(2, voice.semitones / 12);
        osc.frequency.setTargetAtTime(voiceHz, now, glide);
        osc.detune.setValueAtTime(voice.detune, now);
      });
      this.padFilter.frequency.setTargetAtTime(baseCutoff, now, glide);
      this.padDryGain.gain.setTargetAtTime(padAmp * 0.42, now, 0.4);
      this.padWetGain.gain.setTargetAtTime(wetAmp, now, 0.4);
      this.channels.drone = view.intensity;
    }

    // ── Sequence: arpeggio note on each tick ────────────────────────────
    // Held frames suppress NEW notes — already-playing notes ring out naturally.
    const sensitivity = p.pulse.sensitivity;
    const bpm = p.pulse.minBpm + (p.pulse.maxBpm - p.pulse.minBpm) * Math.min(1, view.delta * sensitivity * 4);
    if (this.pulseScheduler.step(bpm, frameSec) && !isHeld) {
      this.fireSequenceNote(view.direction);
    }
    this.channels.pulse = view.delta;

    // ── Accent: one-shot with cooldown ────────────────────────────────
    // Suppressed during hold so the bell doesn't re-trigger inside the held second.
    if (view.isAccent && now > this.accentCooldownUntil && !isHeld) {
      this.fireAccent(view.accentType);
      this.accentCooldownUntil = now + 0.8;
      this.channels.accent = true;
    } else {
      this.channels.accent = false;
    }

    // ── Texture: seasonal envelope, slow LFO already running ──────────
    if (this.textureFilter && this.textureGain) {
      const seasonal = 1 - p.texture.seasonalDepth + p.texture.seasonalDepth * (0.5 + 0.5 * Math.cos(view.monthFrac * Math.PI * 2));
      const yearRamp = 0.5 + 0.5 * view.yearFrac;
      const holdScale = isHeld ? 0 : 1;
      const textureAmp = p.texture.gain * p.texture.density * seasonal * yearRamp * 0.85 * channelScale(this.mix, 'texture') * arcValue * holdScale;
      const filterTarget = p.texture.filterMinHz + (p.texture.filterMaxHz - p.texture.filterMinHz) * view.value;
      this.textureGain.gain.setTargetAtTime(textureAmp, now, 0.3);
      this.textureFilter.frequency.setTargetAtTime(filterTarget, now, 0.4);
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

  // ── Builders ──────────────────────────────────────────────────────────

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private buildReverb(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const conv = ctx.createConvolver();
    conv.buffer = makeReverbImpulse(ctx, 2.4, 2.6);
    const ret = ctx.createGain();
    ret.gain.value = 0.42;  // overall wet level — lower than 0.55 to keep mix dry-leaning
    conv.connect(ret).connect(this.master);
    this.reverb = conv;
  }

  private buildPad(): void {
    if (!this.ctx || !this.master || !this.preset || !this.reverb) return;
    const ctx = this.ctx;
    const p = this.preset.drone;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterMinHz;
    filter.Q.value = 2.2;  // softer resonance — less brittle pad

    // Three voices forming a minor triad (tonic / minor 3rd / perfect 5th)
    const oscs: OscillatorNode[] = [];
    for (const voice of PAD_VOICES) {
      const o = ctx.createOscillator();
      o.type = p.waveform;
      o.frequency.value = p.minHz * Math.pow(2, voice.semitones / 12);
      o.detune.value = voice.detune;
      o.connect(filter);
      o.start();
      oscs.push(o);
    }

    // Slow LFO modulates cutoff for a "breathing" pad — gentler wobble
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;  // ±200 Hz around base cutoff (was 350)
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0;
    filter.connect(dryGain).connect(this.master);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0;
    filter.connect(wetGain).connect(this.reverb);

    // Slow attack so pad "blooms" in
    dryGain.gain.setTargetAtTime(p.gain * 0.5, ctx.currentTime, 0.6);
    wetGain.gain.setTargetAtTime(p.gain * 0.4, ctx.currentTime, 0.6);

    this.padOscs = oscs;
    this.padFilter = filter;
    this.padDryGain = dryGain;
    this.padWetGain = wetGain;
    this.padLfo = lfo;
    this.padLfoGain = lfoGain;
  }

  private rebuildPad(): void {
    if (!this.preset) return;
    try { this.padOscs.forEach((o) => o.stop()); } catch { /* already stopped */ }
    try { this.padLfo?.stop(); } catch { /* already stopped */ }
    this.padOscs.forEach((o) => o.disconnect());
    this.padFilter?.disconnect();
    this.padDryGain?.disconnect();
    this.padWetGain?.disconnect();
    this.padLfoGain?.disconnect();
    this.buildPad();
  }

  private buildSequenceBus(): void {
    if (!this.ctx || !this.master || !this.reverb || !this.preset) return;
    const ctx = this.ctx;
    const ps = channelScale(this.mix, 'pulse');
    const dry = ctx.createGain();
    dry.gain.value = this.preset.pulse.gain * 0.4 * ps;
    dry.connect(this.master);
    const wet = ctx.createGain();
    wet.gain.value = this.preset.pulse.gain * 0.28 * ps;
    wet.connect(this.reverb);
    this.seqDryGain = dry;
    this.seqWetGain = wet;
  }

  private buildAccentBus(): void {
    if (!this.ctx || !this.master || !this.reverb || !this.preset) return;
    const ctx = this.ctx;
    const as = channelScale(this.mix, 'accent');
    const dry = ctx.createGain();
    dry.gain.value = this.preset.accent.gain * 0.65 * as;
    dry.connect(this.master);
    const wet = ctx.createGain();
    wet.gain.value = this.preset.accent.gain * 0.55 * as;
    wet.connect(this.reverb);
    this.accentDryGain = dry;
    this.accentWetGain = wet;
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
    filter.Q.value = 0.7;

    // Slow LFO drift on texture cutoff
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.03;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    gain.gain.setTargetAtTime(p.gain * p.density * 0.5, ctx.currentTime, 0.8);

    // lfoGain stays connected via the audio graph; reference dropped intentionally
    void lfoGain;
    this.textureSource = src;
    this.textureFilter = filter;
    this.textureGain = gain;
    this.textureLfo = lfo;
  }

  private applyPresetGains(arcValue = 1.0): void {
    if (!this.ctx || !this.preset) return;
    const now = this.ctx.currentTime;
    const pulseScale = channelScale(this.mix, 'pulse');
    const accentScale = channelScale(this.mix, 'accent');
    if (this.seqDryGain) this.seqDryGain.gain.setTargetAtTime(this.preset.pulse.gain * 0.4 * pulseScale * arcValue, now, 0.1);
    if (this.seqWetGain) this.seqWetGain.gain.setTargetAtTime(this.preset.pulse.gain * 0.28 * pulseScale * arcValue, now, 0.1);
    if (this.accentDryGain) this.accentDryGain.gain.setTargetAtTime(this.preset.accent.gain * 0.65 * accentScale * arcValue, now, 0.1);
    if (this.accentWetGain) this.accentWetGain.gain.setTargetAtTime(this.preset.accent.gain * 0.55 * accentScale * arcValue, now, 0.1);
  }

  private fireSequenceNote(direction: 1 | 0 | -1): void {
    if (!this.ctx || !this.preset || !this.seqDryGain || !this.seqWetGain) return;
    const ctx = this.ctx;
    const semitones = ARP_SCALE[this.arpStep % ARP_SCALE.length];
    // Direction biases octave: rising data nudges arpeggio up an octave occasionally
    const octaveBias = direction > 0 && this.arpStep % 4 === 0 ? 12 : 0;
    this.arpStep++;
    const freq = this.currentTonicHz * Math.pow(2, (semitones + octaveBias) / 12);

    const osc = ctx.createOscillator();
    osc.type = this.preset.drone.waveform;
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 5;
    filter.Q.value = 3;

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(filter).connect(env);
    env.connect(this.seqDryGain);
    env.connect(this.seqWetGain);

    const t = ctx.currentTime;
    const peak = 0.18;  // per-note amplitude before bus gain — lower so notes blend into pad
    const A = 0.025, D = 0.18, S = 0.4, R = 0.4;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + A);
    env.gain.linearRampToValueAtTime(peak * S, t + A + D);
    env.gain.setValueAtTime(peak * S, t + A + D + 0.05);
    env.gain.linearRampToValueAtTime(0, t + A + D + 0.05 + R);

    osc.start(t);
    osc.stop(t + A + D + R + 0.15);
  }

  private fireAccent(type: FrameView['accentType']): void {
    if (!this.ctx || !this.samples || !this.accentDryGain || !this.accentWetGain || !this.preset) return;
    const buf = pickAccentBuffer(this.samples, this.preset.accent.style, type);
    const dry = this.ctx.createBufferSource();
    dry.buffer = buf;
    dry.connect(this.accentDryGain);
    dry.start();
    const wet = this.ctx.createBufferSource();
    wet.buffer = buf;
    wet.connect(this.accentWetGain);
    wet.start();
  }
}

function pickAccentBuffer(
  s: SampleBank,
  style: AudioPreset['accent']['style'],
  type: FrameView['accentType'],
): AudioBuffer {
  if (style === 'bell') return s.accentInflection;
  if (style === 'ping') return s.accentHigh;
  if (style === 'drop') return s.accentLow;
  if (type === 'record-high') return s.accentHigh;
  if (type === 'record-low') return s.accentLow;
  return s.accentInflection;
}
