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
