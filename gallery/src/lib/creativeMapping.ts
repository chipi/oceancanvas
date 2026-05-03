/**
 * Creative-to-technical parameter mapping.
 *
 * Maps creative state (mood, energy, presence, colour character, temporal weight)
 * to technical render parameters (colormap, opacity, particle_count, etc.).
 *
 * This module must produce identical outputs to the Python equivalent
 * at pipeline/src/oceancanvas/creative_mapping.py.
 */

export interface CreativeState {
  mood: string;
  energy_x: number;  // 0 = calm, 1 = turbulent
  energy_y: number;  // 0 = ghost, 1 = solid
  colour_character: number;  // 0 = arctic cold, 0.5 = thermal, 1 = otherworldly
  temporal_weight: number;  // 0 = moment, 1 = epoch
}

export interface TechnicalParams {
  colormap: string;
  opacity: number;
  smooth: boolean;
  particle_count: number;
  tail_length: number;
  speed_scale: number;
  marker_size: number;
  marker_opacity: number;
}

export type AccentStyle = 'chime' | 'bell' | 'ping' | 'drop';
export type DroneWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square';

/** Audio parameters derived from creative state — RFC-010 §"Creative state → audio parameters". */
export interface AudioParams {
  drone_waveform: DroneWaveform;
  drone_glide: number;        // 0 = instant, 1 = very slow portamento
  pulse_sensitivity: number;  // 0 = subtle, 1 = aggressive
  presence: number;           // 0 = barely audible, 1 = full mix
  accent_style: AccentStyle;
  texture_density: number;    // 0 = sparse, 1 = dense
}

/** Five mood presets — named starting points that set the full parameter space. */
export const MOOD_PRESETS: Record<string, CreativeState> = {
  'Becalmed': {
    mood: 'Becalmed',
    energy_x: 0.2,
    energy_y: 0.6,
    colour_character: 0.3,
    temporal_weight: 0.4,
  },
  'Deep current': {
    mood: 'Deep current',
    energy_x: 0.4,
    energy_y: 0.8,
    colour_character: 0.4,
    temporal_weight: 0.7,
  },
  'Storm surge': {
    mood: 'Storm surge',
    energy_x: 0.9,
    energy_y: 0.3,
    colour_character: 0.5,
    temporal_weight: 0.6,
  },
  'Surface shimmer': {
    mood: 'Surface shimmer',
    energy_x: 0.5,
    energy_y: 0.5,
    colour_character: 0.6,
    temporal_weight: 0.3,
  },
  'Arctic still': {
    mood: 'Arctic still',
    energy_x: 0.1,
    energy_y: 0.9,
    colour_character: 0.0,
    temporal_weight: 0.8,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Map creative state to technical render parameters.
 * Pure function — same inputs always produce same outputs.
 */
export function creativeToTechnical(state: CreativeState): TechnicalParams {
  const { energy_x, energy_y, colour_character, temporal_weight } = state;

  // Colormap selection based on colour_character
  let colormap: string;
  if (colour_character < 0.33) {
    colormap = 'arctic';
  } else if (colour_character < 0.66) {
    colormap = 'thermal';
  } else {
    colormap = 'otherworldly';
  }

  // Opacity: ghost (low presence) = transparent, solid (high) = opaque
  const opacity = clamp(lerp(0.3, 1.0, energy_y), 0.1, 1.0);

  // Smooth: calm is smooth, turbulent is crisp
  const smooth = energy_x < 0.5;

  // Particle count: driven by presence (Y axis)
  const particle_count = Math.round(lerp(500, 5000, energy_y));

  // Tail length: driven by temporal weight
  const tail_length = Math.round(lerp(3, 24, temporal_weight));

  // Speed: driven by energy (X axis)
  const speed_scale = lerp(0.2, 2.0, energy_x);

  // Marker size: driven by presence
  const marker_size = Math.round(lerp(2, 8, energy_y));

  // Marker opacity: same as main opacity
  const marker_opacity = clamp(lerp(0.3, 0.9, energy_y), 0.1, 1.0);

  return {
    colormap,
    opacity: Math.round(opacity * 100) / 100,
    smooth,
    particle_count,
    tail_length,
    speed_scale: Math.round(speed_scale * 100) / 100,
    marker_size,
    marker_opacity: Math.round(marker_opacity * 100) / 100,
  };
}

/** Check if technical params match what creative state would produce. */
export function isMatched(state: CreativeState, technical: TechnicalParams): boolean {
  const expected = creativeToTechnical(state);
  return JSON.stringify(expected) === JSON.stringify(technical);
}

/**
 * Map creative state to audio parameters per RFC-010 §"Creative state → audio parameters".
 *
 *   colour_character → drone waveform (sine → triangle → sawtooth)
 *   temporal_weight  → drone glide (instant → slow portamento)
 *   energy_x         → pulse sensitivity (subtle → aggressive)
 *   energy_y         → presence (ghost → full mix) and texture density
 *
 * Accent style is set by the mood preset's character (Becalmed = soft chimes, Storm surge = sharp pings, etc.).
 * For custom states, accent_style derives from the energy quadrant.
 *
 * Pure function — must produce the same outputs as the Python equivalent.
 */
export function creativeToAudio(state: CreativeState): AudioParams {
  const { mood, energy_x, energy_y, colour_character, temporal_weight } = state;

  // Drone waveform — three buckets matching the colormap split
  let drone_waveform: DroneWaveform;
  if (colour_character < 0.33) drone_waveform = 'sine';
  else if (colour_character < 0.66) drone_waveform = 'triangle';
  else drone_waveform = 'sawtooth';

  const drone_glide = clamp(temporal_weight, 0, 1);
  const pulse_sensitivity = clamp(energy_x, 0, 1);
  const presence = clamp(lerp(0.3, 1.0, energy_y), 0.1, 1.0);
  const texture_density = clamp(lerp(0.15, 0.6, energy_y), 0, 1);

  // Mood-driven accent style; fall back to energy-quadrant heuristic for custom moods.
  const accent_style: AccentStyle =
    mood === 'Becalmed' ? 'chime' :
    mood === 'Deep current' ? 'bell' :
    mood === 'Storm surge' ? 'ping' :
    mood === 'Surface shimmer' ? 'ping' :
    mood === 'Arctic still' ? 'drop' :
    energy_x > 0.6 ? 'ping' :
    energy_y > 0.6 ? 'bell' :
    energy_y < 0.3 ? 'drop' :
    'chime';

  return {
    drone_waveform,
    drone_glide: round2(drone_glide),
    pulse_sensitivity: round2(pulse_sensitivity),
    presence: round2(presence),
    accent_style,
    texture_density: round2(texture_density),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Reverse-engineer the creative state that best matches given technical params.
 * Inverts the lerp functions used in creativeToTechnical.
 */
export function technicalToCreative(params: Record<string, unknown>): CreativeState {
  const inverseLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);

  // energy_x from speed_scale: lerp(0.2, 2.0, x)
  const speed = Number(params.speed_scale ?? 1.0);
  const energy_x = inverseLerp(0.2, 2.0, speed);

  // energy_y from opacity: lerp(0.3, 1.0, y) or from particle_count: lerp(500, 5000, y)
  const opacity = Number(params.opacity ?? 0.7);
  const pc = Number(params.particle_count ?? 2000);
  const energy_y_from_opacity = inverseLerp(0.3, 1.0, opacity);
  const energy_y_from_pc = inverseLerp(500, 5000, pc);
  const energy_y = (energy_y_from_opacity + energy_y_from_pc) / 2;

  // temporal_weight from tail_length: lerp(3, 24, tw)
  const tl = Number(params.tail_length ?? 12);
  const temporal_weight = inverseLerp(3, 24, tl);

  // colour_character from colormap name
  const colormap = String(params.colormap ?? 'thermal');
  let colour_character = 0.5;
  if (colormap === 'arctic') colour_character = 0.15;
  else if (colormap === 'thermal') colour_character = 0.5;
  else if (colormap === 'otherworldly') colour_character = 0.85;

  // Find closest mood preset
  const state: CreativeState = {
    mood: 'custom',
    energy_x: Math.round(energy_x * 100) / 100,
    energy_y: Math.round(energy_y * 100) / 100,
    colour_character: Math.round(colour_character * 100) / 100,
    temporal_weight: Math.round(temporal_weight * 100) / 100,
  };

  // Check if any preset is close
  for (const [name, preset] of Object.entries(MOOD_PRESETS)) {
    const dist = Math.abs(preset.energy_x - state.energy_x) +
                 Math.abs(preset.energy_y - state.energy_y) +
                 Math.abs(preset.colour_character - state.colour_character) +
                 Math.abs(preset.temporal_weight - state.temporal_weight);
    if (dist < 0.15) {
      state.mood = name;
      break;
    }
  }

  return state;
}
