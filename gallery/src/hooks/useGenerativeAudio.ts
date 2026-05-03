/**
 * useGenerativeAudio — React hook bridging VideoEditor state to AudioEngine.
 *
 * Responsibilities:
 *   - Owns the AudioEngine instance for the component lifetime
 *   - Loads samples on mount, applies preset, starts/stops on isPlaying
 *   - Each frame, derives FrameView from data and forwards to engine
 *   - Exposes liveChannels so the visualizer reflects engine state, not parallel math
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { SynthEngine } from '../lib/audioEngine';
import { AmbientEngine } from '../lib/audioEngineAmbient';
import {
  type AudioEngineInterface,
  type ChannelMix,
  type ChannelState,
  type EqSettings,
  type FrameView,
  DEFAULT_CHANNEL_MIX,
  DEFAULT_EQ,
} from '../lib/audioEngineTypes';
import type { AudioPreset } from '../lib/audioPresets';
import type { MomentEvent } from '../lib/moments';

interface UseGenerativeAudioArgs {
  preset: AudioPreset | null;  // null = silent
  enabled: boolean;
  isPlaying: boolean;
  intensity: number[];
  values: number[];            // raw data values (for drone pitch)
  dates: string[];             // YYYY-MM strings (for seasonal texture)
  moments: MomentEvent[];
  currentFrame: number;
  fps: number;
  channelMix?: ChannelMix;
  eq?: EqSettings;
  /** Per-frame tension arc array (RFC-011). Empty array = no arc. */
  tensionArc?: number[];
}

const SILENT_CHANNELS: ChannelState = { drone: 0, pulse: 0, accent: false, texture: 0 };
const EMPTY_ARC: number[] = [];

export function useGenerativeAudio(args: UseGenerativeAudioArgs) {
  const { preset, enabled, isPlaying, intensity, values, dates, moments, currentFrame, fps } = args;
  const channelMix = args.channelMix ?? DEFAULT_CHANNEL_MIX;
  const eq = args.eq ?? DEFAULT_EQ;
  const tensionArc = args.tensionArc ?? EMPTY_ARC;

  const engineRef = useRef<AudioEngineInterface | null>(null);
  const currentEngineKindRef = useRef<string>('');
  const [masterVolume, setMasterVolumeState] = useState(0.8);
  const [audioReady, setAudioReady] = useState(false);
  const [liveChannels, setLiveChannels] = useState<ChannelState>(SILENT_CHANNELS);

  // Normalise values to [0,1] for drone pitch — recompute when series changes
  const valueRange = useMemo(() => {
    if (!values.length) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min, max: max > min ? max : min + 1 };
  }, [values]);

  // Moment lookup by frame — accent firing
  const momentByFrame = useMemo(() => {
    const map = new Map<number, MomentEvent>();
    for (const m of moments) map.set(m.frame, m);
    return map;
  }, [moments]);

  // Engine lifecycle: instantiate per engine kind. Swap when preset.engine changes.
  useEffect(() => {
    if (!preset) return;
    const desiredKind = preset.engine || 'synth';
    if (engineRef.current && currentEngineKindRef.current === desiredKind) return;

    // Tear down previous engine when switching kind
    engineRef.current?.dispose();
    const engine: AudioEngineInterface = desiredKind === 'ambient' ? new AmbientEngine() : new SynthEngine();
    engineRef.current = engine;
    currentEngineKindRef.current = desiredKind;
    setAudioReady(false);
  }, [preset]);

  // Always dispose on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      currentEngineKindRef.current = '';
    };
  }, []);

  // Apply preset whenever it changes (or audio is re-enabled)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !enabled || !preset) return;
    engine.setPreset(preset);
  }, [enabled, preset]);

  useEffect(() => {
    engineRef.current?.setFps(fps);
  }, [fps]);

  useEffect(() => {
    engineRef.current?.setMasterVolume(masterVolume);
  }, [masterVolume]);

  useEffect(() => {
    engineRef.current?.setChannelMix(channelMix);
  }, [channelMix]);

  useEffect(() => {
    engineRef.current?.setEq(eq);
  }, [eq]);

  useEffect(() => {
    engineRef.current?.setTensionArc(tensionArc);
  }, [tensionArc]);

  // Start/stop with isPlaying — start requires user gesture (the play button click)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (!enabled || !preset) {
      engine.stop();
      setAudioReady(false);
      setLiveChannels(SILENT_CHANNELS);
      return;
    }

    if (isPlaying) {
      let cancelled = false;
      engine.setPreset(preset);
      engine.setFps(fps);
      engine.start()
        .then(() => {
          if (!cancelled) setAudioReady(true);
        })
        .catch(() => {
          if (!cancelled) setAudioReady(false);
        });
      return () => {
        cancelled = true;
      };
    }

    engine.stop();
    setLiveChannels(SILENT_CHANNELS);
    return undefined;
  }, [enabled, preset, isPlaying, fps]);

  // Frame-driven update
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !enabled || !preset || !isPlaying || !values.length) return;
    const view = buildFrameView({
      currentFrame, intensity, values, dates, momentByFrame, valueRange,
    });
    engine.setFrame(view);
    setLiveChannels(engine.getLiveChannels());
  }, [currentFrame, isPlaying, enabled, preset, intensity, values, dates, momentByFrame, valueRange]);

  return {
    masterVolume,
    setMasterVolume: setMasterVolumeState,
    audioReady,
    liveChannels,
  };
}

interface BuildArgs {
  currentFrame: number;
  intensity: number[];
  values: number[];
  dates: string[];
  momentByFrame: Map<number, MomentEvent>;
  valueRange: { min: number; max: number };
}

export function buildFrameView({
  currentFrame, intensity, values, dates, momentByFrame, valueRange,
}: BuildArgs): FrameView {
  const i = Math.max(0, Math.min(values.length - 1, currentFrame));
  const v = values[i] ?? 0;
  const span = valueRange.max - valueRange.min || 1;
  const valueNorm = Math.max(0, Math.min(1, (v - valueRange.min) / span));

  const prev = i > 0 ? values[i - 1] : v;
  const rawDelta = v - prev;
  const delta = Math.min(1, Math.abs(rawDelta) / (span * 0.1));
  const direction: 1 | 0 | -1 = rawDelta > 0 ? 1 : rawDelta < 0 ? -1 : 0;

  const moment = momentByFrame.get(i);
  const accentType = moment ? mapMomentToAccent(moment) : null;

  const date = dates[i] || '';
  const month = parseInt(date.substring(5, 7), 10) || 0;
  const monthFrac = month > 0 ? (month - 1) / 12 : 0;
  const yearFrac = values.length > 1 ? i / (values.length - 1) : 0;

  return {
    frame: i,
    intensity: intensity[i] ?? 0,
    value: valueNorm,
    delta,
    direction,
    isAccent: !!moment,
    accentType,
    monthFrac,
    yearFrac,
  };
}

function mapMomentToAccent(m: MomentEvent): FrameView['accentType'] {
  if (m.type === 'record') return m.label.toLowerCase().includes('low') ? 'record-low' : 'record-high';
  if (m.type === 'inflection') return 'inflection';
  if (m.type === 'peak') return m.label.toLowerCase().includes('cold') ? 'record-low' : 'record-high';
  return 'inflection';
}
