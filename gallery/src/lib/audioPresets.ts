/**
 * Audio presets — recipes pick one (or pick "From recipe" to use the YAML's audio block).
 *
 * Each preset declares an `engine` and the parameters the engine consumes. The
 * synth engine voices each layer with simple oscillators + sample triggers (the
 * original RFC-010 design). The ambient engine voices the same layers as a
 * detuned pad + minor-pentatonic arpeggio + reverb send (JMJ-inspired:
 * Oxygène, Equinoxe, Magnetic Fields).
 *
 * Presets named after JMJ pieces use the ambient engine. The eight original
 * presets keep the synth engine for the rhythmic / clinical feel.
 */

export type AccentStyle = 'chime' | 'bell' | 'ping' | 'drop';
export type EngineId = 'synth' | 'ambient';

export interface AudioPreset {
  id: string;
  name: string;
  engine: EngineId;
  drone: {
    waveform: OscillatorType;
    minHz: number;
    maxHz: number;
    glideSec: number;
    filterMinHz: number;
    filterMaxHz: number;
    gain: number;
  };
  pulse: {
    sensitivity: number;
    minBpm: number;
    maxBpm: number;
    gain: number;
  };
  accent: {
    style: AccentStyle;
    gain: number;
  };
  texture: {
    density: number;
    filterMinHz: number;
    filterMaxHz: number;
    seasonalDepth: number;
    gain: number;
  };
  master: number;
}

const RFC_MOODS = {
  becalmed: {
    id: 'becalmed',
    name: 'Becalmed',
    engine: 'synth',
    drone: { waveform: 'sine', minHz: 80, maxHz: 240, glideSec: 1.2, filterMinHz: 200, filterMaxHz: 1200, gain: 0.32 },
    pulse: { sensitivity: 0.15, minBpm: 40, maxBpm: 80, gain: 0.18 },
    accent: { style: 'chime', gain: 0.38 },
    texture: { density: 0.15, filterMinHz: 200, filterMaxHz: 700, seasonalDepth: 0.4, gain: 0.18 },
    master: 0.85,
  },
  'deep-current': {
    id: 'deep-current',
    name: 'Deep current',
    engine: 'synth',
    drone: { waveform: 'triangle', minHz: 90, maxHz: 320, glideSec: 0.6, filterMinHz: 300, filterMaxHz: 1800, gain: 0.42 },
    pulse: { sensitivity: 0.45, minBpm: 60, maxBpm: 140, gain: 0.3 },
    accent: { style: 'bell', gain: 0.5 },
    texture: { density: 0.4, filterMinHz: 250, filterMaxHz: 900, seasonalDepth: 0.35, gain: 0.28 },
    master: 0.9,
  },
  'storm-surge': {
    id: 'storm-surge',
    name: 'Storm surge',
    engine: 'synth',
    drone: { waveform: 'sawtooth', minHz: 100, maxHz: 400, glideSec: 0.18, filterMinHz: 400, filterMaxHz: 3000, gain: 0.45 },
    pulse: { sensitivity: 0.85, minBpm: 90, maxBpm: 180, gain: 0.5 },
    accent: { style: 'ping', gain: 0.65 },
    texture: { density: 0.55, filterMinHz: 400, filterMaxHz: 1400, seasonalDepth: 0.5, gain: 0.35 },
    master: 0.95,
  },
  'surface-shimmer': {
    id: 'surface-shimmer',
    name: 'Surface shimmer',
    engine: 'synth',
    drone: { waveform: 'triangle', minHz: 160, maxHz: 380, glideSec: 0.4, filterMinHz: 600, filterMaxHz: 2400, gain: 0.3 },
    pulse: { sensitivity: 0.55, minBpm: 80, maxBpm: 160, gain: 0.32 },
    accent: { style: 'ping', gain: 0.55 },
    texture: { density: 0.3, filterMinHz: 800, filterMaxHz: 2200, seasonalDepth: 0.45, gain: 0.25 },
    master: 0.85,
  },
  'arctic-still': {
    id: 'arctic-still',
    name: 'Arctic still',
    engine: 'synth',
    drone: { waveform: 'sine', minHz: 70, maxHz: 200, glideSec: 1.6, filterMinHz: 180, filterMaxHz: 900, gain: 0.32 },
    pulse: { sensitivity: 0.08, minBpm: 30, maxBpm: 60, gain: 0.08 },
    accent: { style: 'drop', gain: 0.42 },
    texture: { density: 0.1, filterMinHz: 150, filterMaxHz: 500, seasonalDepth: 0.25, gain: 0.14 },
    master: 0.8,
  },
} as const satisfies Record<string, AudioPreset>;

const CARRY_OVERS = {
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    engine: 'synth',
    drone: { waveform: 'sine', minHz: 110, maxHz: 300, glideSec: 0.7, filterMinHz: 350, filterMaxHz: 2000, gain: 0.4 },
    pulse: { sensitivity: 0.4, minBpm: 60, maxBpm: 130, gain: 0.3 },
    accent: { style: 'chime', gain: 0.5 },
    texture: { density: 0.35, filterMinHz: 300, filterMaxHz: 1100, seasonalDepth: 0.4, gain: 0.26 },
    master: 0.9,
  },
  dramatic: {
    id: 'dramatic',
    name: 'Dramatic',
    engine: 'synth',
    drone: { waveform: 'sawtooth', minHz: 90, maxHz: 360, glideSec: 0.25, filterMinHz: 450, filterMaxHz: 2600, gain: 0.42 },
    pulse: { sensitivity: 0.7, minBpm: 80, maxBpm: 170, gain: 0.42 },
    accent: { style: 'chime', gain: 0.6 },
    texture: { density: 0.45, filterMinHz: 350, filterMaxHz: 1300, seasonalDepth: 0.45, gain: 0.32 },
    master: 0.92,
  },
  deep: {
    id: 'deep',
    name: 'Deep',
    engine: 'synth',
    drone: { waveform: 'triangle', minHz: 60, maxHz: 220, glideSec: 1.0, filterMinHz: 200, filterMaxHz: 1100, gain: 0.5 },
    pulse: { sensitivity: 0.25, minBpm: 50, maxBpm: 100, gain: 0.22 },
    accent: { style: 'bell', gain: 0.45 },
    texture: { density: 0.5, filterMinHz: 150, filterMaxHz: 700, seasonalDepth: 0.35, gain: 0.4 },
    master: 0.88,
  },
} as const satisfies Record<string, AudioPreset>;

// JMJ-inspired ambient presets — voiced by AmbientEngine.
// Names evoke the Jean-Michel Jarre tracks each one chases.
const AMBIENT_PRESETS = {
  oxygene: {
    id: 'oxygene',
    name: 'Oxygène',
    engine: 'ambient',
    // Bright triangle pad, gentle arpeggio, chime accents — Oxygène pt. 4 vibe
    drone: { waveform: 'triangle', minHz: 130, maxHz: 290, glideSec: 0.9, filterMinHz: 500, filterMaxHz: 2200, gain: 0.4 },
    pulse: { sensitivity: 0.45, minBpm: 70, maxBpm: 140, gain: 0.22 },
    accent: { style: 'chime', gain: 0.4 },
    texture: { density: 0.25, filterMinHz: 400, filterMaxHz: 1300, seasonalDepth: 0.35, gain: 0.18 },
    master: 0.88,
  },
  equinoxe: {
    id: 'equinoxe',
    name: 'Equinoxe',
    engine: 'ambient',
    // Deeper sawtooth pad, slower arpeggio, bell accents — Equinoxe pt. 5
    drone: { waveform: 'sawtooth', minHz: 90, maxHz: 230, glideSec: 1.1, filterMinHz: 350, filterMaxHz: 1700, gain: 0.42 },
    pulse: { sensitivity: 0.3, minBpm: 50, maxBpm: 110, gain: 0.2 },
    accent: { style: 'bell', gain: 0.42 },
    texture: { density: 0.35, filterMinHz: 280, filterMaxHz: 1000, seasonalDepth: 0.4, gain: 0.22 },
    master: 0.9,
  },
  'magnetic-fields': {
    id: 'magnetic-fields',
    name: 'Magnetic Fields',
    engine: 'ambient',
    // Bright sparkly pad, faster sequence, ping accents — Magnetic Fields pt. 2
    drone: { waveform: 'triangle', minHz: 160, maxHz: 360, glideSec: 0.5, filterMinHz: 700, filterMaxHz: 2800, gain: 0.36 },
    pulse: { sensitivity: 0.6, minBpm: 90, maxBpm: 170, gain: 0.24 },
    accent: { style: 'ping', gain: 0.45 },
    texture: { density: 0.2, filterMinHz: 600, filterMaxHz: 1800, seasonalDepth: 0.4, gain: 0.16 },
    master: 0.86,
  },
  chronologie: {
    id: 'chronologie',
    name: 'Chronologie',
    engine: 'ambient',
    // Driving sequencer feel — Chronologie pt. 4
    drone: { waveform: 'sawtooth', minHz: 100, maxHz: 280, glideSec: 0.4, filterMinHz: 450, filterMaxHz: 2400, gain: 0.4 },
    pulse: { sensitivity: 0.7, minBpm: 100, maxBpm: 180, gain: 0.26 },
    accent: { style: 'chime', gain: 0.42 },
    texture: { density: 0.3, filterMinHz: 400, filterMaxHz: 1500, seasonalDepth: 0.45, gain: 0.2 },
    master: 0.9,
  },
  glacial: {
    id: 'glacial',
    name: 'Glacial drift',
    engine: 'ambient',
    // Very slow ambient — minimal sequence, sine pad, drop accents
    drone: { waveform: 'sine', minHz: 70, maxHz: 180, glideSec: 1.6, filterMinHz: 220, filterMaxHz: 900, gain: 0.38 },
    pulse: { sensitivity: 0.15, minBpm: 35, maxBpm: 75, gain: 0.16 },
    accent: { style: 'drop', gain: 0.38 },
    texture: { density: 0.18, filterMinHz: 180, filterMaxHz: 600, seasonalDepth: 0.3, gain: 0.18 },
    master: 0.82,
  },
} as const satisfies Record<string, AudioPreset>;

export const AUDIO_PRESETS: Record<string, AudioPreset> = {
  ...CARRY_OVERS,
  ...RFC_MOODS,
  ...AMBIENT_PRESETS,
};

export type AudioPresetId = keyof typeof AUDIO_PRESETS;

/** Picker rendering order — grouped by engine via PRESET_GROUPS below. */
export const PRESET_ORDER: AudioPresetId[] = [
  'ocean', 'dramatic', 'deep',
  'becalmed', 'deep-current', 'storm-surge', 'surface-shimmer', 'arctic-still',
  'oxygene', 'equinoxe', 'magnetic-fields', 'chronologie', 'glacial',
];

export const PRESET_GROUPS: Array<{ engine: EngineId; label: string; ids: AudioPresetId[] }> = [
  {
    engine: 'synth',
    label: 'Synth',
    ids: ['ocean', 'dramatic', 'deep', 'becalmed', 'deep-current', 'storm-surge', 'surface-shimmer', 'arctic-still'],
  },
  {
    engine: 'ambient',
    label: 'Ambient (JMJ-style)',
    ids: ['oxygene', 'equinoxe', 'magnetic-fields', 'chronologie', 'glacial'],
  },
];

export function getPreset(id: string): AudioPreset {
  return AUDIO_PRESETS[id] ?? AUDIO_PRESETS.ocean;
}

/**
 * Translate recipe-level AudioParams (the YAML audio: block) into an engine AudioPreset.
 *
 * AudioParams are creative-level (drone_glide ∈ [0,1], pulse_sensitivity ∈ [0,1], etc.)
 * AudioPreset is engine-level (concrete Hz ranges, BPM ranges, gains, glideSec).
 *
 * Each axis maps mechanically. The Hz/BPM ranges interpolate between conservative and
 * energetic endpoints so a recipe with high pulse_sensitivity actually pulses faster.
 */
export interface AudioParamsLike {
  engine?: string;
  drone_waveform?: string;
  drone_glide?: number;
  pulse_sensitivity?: number;
  presence?: number;
  accent_style?: string;
  texture_density?: number;
}

const VALID_WAVEFORMS: ReadonlyArray<OscillatorType> = ['sine', 'triangle', 'sawtooth', 'square'];
const VALID_ACCENTS: ReadonlyArray<AccentStyle> = ['chime', 'bell', 'ping', 'drop'];
const VALID_ENGINES: ReadonlyArray<EngineId> = ['synth', 'ambient'];

export function presetFromAudioParams(p: AudioParamsLike, id = 'recipe'): AudioPreset {
  const engine: EngineId = (VALID_ENGINES as readonly string[]).includes(p.engine ?? '')
    ? (p.engine as EngineId)
    : 'synth';
  const waveform = (VALID_WAVEFORMS as readonly string[]).includes(p.drone_waveform ?? '')
    ? (p.drone_waveform as OscillatorType)
    : 'triangle';
  const accentStyle = (VALID_ACCENTS as readonly string[]).includes(p.accent_style ?? '')
    ? (p.accent_style as AccentStyle)
    : 'chime';

  const glide = clamp01(p.drone_glide, 0.5);
  const sensitivity = clamp01(p.pulse_sensitivity, 0.4);
  const presence = clamp01(p.presence, 0.7);
  const density = clamp01(p.texture_density, 0.35);

  // Pitch range widens with sensitivity (more reactive = more dynamic range)
  const droneSpan = lerp(180, 320, sensitivity);
  const droneMin = lerp(110, 80, presence);  // higher presence = lower drone

  // BPM range widens with sensitivity
  const bpmMin = lerp(50, 70, sensitivity);
  const bpmMax = lerp(110, 180, sensitivity);

  return {
    id,
    name: id,
    engine,
    drone: {
      waveform,
      minHz: round(droneMin),
      maxHz: round(droneMin + droneSpan),
      glideSec: lerp(0.1, 1.6, glide),
      filterMinHz: round(lerp(200, 400, sensitivity)),
      filterMaxHz: round(lerp(1200, 3000, sensitivity)),
      gain: lerp(0.25, 0.5, presence),
    },
    pulse: {
      sensitivity,
      minBpm: round(bpmMin),
      maxBpm: round(bpmMax),
      gain: lerp(0.1, 0.5, sensitivity * presence),
    },
    accent: {
      style: accentStyle,
      gain: lerp(0.35, 0.65, presence),
    },
    texture: {
      density,
      filterMinHz: round(lerp(180, 500, sensitivity)),
      filterMaxHz: round(lerp(700, 1800, sensitivity)),
      seasonalDepth: 0.4,
      gain: lerp(0.15, 0.4, density),
    },
    master: lerp(0.7, 0.95, presence),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number | undefined, fallback: number): number {
  if (v == null || Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

function round(v: number): number {
  return Math.round(v);
}
