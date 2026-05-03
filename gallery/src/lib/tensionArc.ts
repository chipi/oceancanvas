/**
 * Tension arc — RFC-011.
 *
 * Single shared primitive that drives audio dynamics and visual filter
 * keyframing in unison across a video's duration. The recipe authors a small
 * spec; the system expands it to a per-frame `[0, 1]` array consumed by the
 * audio engine, the pipeline synthesis, and the ffmpeg filter graph.
 *
 * Mirrored byte-for-byte by `pipeline/src/oceancanvas/arc.py`. Cross-validation
 * fixtures live at `tests/cross-validation/tension_arc_fixtures.json`.
 */

export type ArcPreset = 'classic' | 'plateau' | 'drift' | 'invert' | 'none';

export interface TensionArcSpec {
  preset: ArcPreset;
  peak_position: number;     // 0–1 fraction of duration where the arc peaks
  peak_height: number;       // 0–1 maximum value the arc reaches
  release_steepness: number; // 0–1 how sharply the arc drops after the peak
  pin_key_moment?: boolean;  // if true, peak_position is overridden to align with the dominant key moment frame
}

export const DEFAULT_ARC_SPEC: TensionArcSpec = {
  preset: 'classic',
  peak_position: 0.65,
  peak_height: 1.0,
  release_steepness: 0.7,
  pin_key_moment: false,
};

const VALID_PRESETS: ReadonlyArray<ArcPreset> = ['classic', 'plateau', 'drift', 'invert', 'none'];

export function isArcPreset(value: unknown): value is ArcPreset {
  return typeof value === 'string' && (VALID_PRESETS as readonly string[]).includes(value);
}

/**
 * Expand a TensionArcSpec into a per-frame `[0, 1]` array of length `totalFrames`.
 *
 * If `dominantMomentFrame` is provided and `spec.pin_key_moment` is true, the
 * peak position is recomputed to align with that frame so the held-moment
 * gesture lands on a real significant frame rather than the authored default.
 *
 * Pure function — same inputs always produce the same output.
 */
export function expandArc(
  spec: TensionArcSpec,
  totalFrames: number,
  dominantMomentFrame: number | null = null,
): number[] {
  if (totalFrames <= 0) return [];
  if (spec.preset === 'none') return new Array(totalFrames).fill(1.0);
  // Unknown preset string — silent fallback (mirrors arc.py behaviour)
  if (!isArcPreset(spec.preset)) return new Array(totalFrames).fill(1.0);

  let peakPosition = clamp(spec.peak_position, 0, 1);
  if (spec.pin_key_moment && dominantMomentFrame !== null && totalFrames > 1) {
    peakPosition = clamp(dominantMomentFrame / (totalFrames - 1), 0.05, 0.95);
  }
  const peakHeight = clamp(spec.peak_height, 0, 1);
  const releaseSteepness = clamp(spec.release_steepness, 0, 1);

  const result = new Array<number>(totalFrames);
  for (let i = 0; i < totalFrames; i++) {
    const t = totalFrames > 1 ? i / (totalFrames - 1) : 0;
    result[i] = curveValue(spec.preset, t, peakPosition, peakHeight, releaseSteepness);
  }
  return result;
}

function curveValue(
  preset: ArcPreset,
  t: number,
  peakPosition: number,
  peakHeight: number,
  releaseSteepness: number,
): number {
  switch (preset) {
    case 'classic':
      return classicCurve(t, peakPosition, peakHeight, releaseSteepness);
    case 'plateau':
      return plateauCurve(t, peakPosition, peakHeight, releaseSteepness);
    case 'drift':
      return driftCurve(t, peakHeight, releaseSteepness);
    case 'invert':
      return classicCurve(1 - t, peakPosition, peakHeight, releaseSteepness);
    case 'none':
      return 1.0;
  }
}

/**
 * Classic — quadratic ease-in to the peak, ease-out after.
 * release_steepness controls the post-peak drop: higher = sharper drop.
 */
function classicCurve(t: number, peakPosition: number, peakHeight: number, releaseSteepness: number): number {
  if (peakPosition <= 0) {
    return peakHeight * Math.pow(1 - t, 1 + 2 * releaseSteepness);
  }
  if (peakPosition >= 1) {
    return Math.pow(t, 2) * peakHeight;
  }
  if (t <= peakPosition) {
    return Math.pow(t / peakPosition, 2) * peakHeight;
  }
  const u = (t - peakPosition) / (1 - peakPosition);
  return peakHeight * Math.pow(1 - u, 1 + 2 * releaseSteepness);
}

/**
 * Plateau — quick ramp into a sustained plateau, then drop.
 * The ramp occupies the first 40% of the pre-peak window; the plateau holds
 * through the next ~40% of the post-peak window; the rest is the release.
 */
function plateauCurve(t: number, peakPosition: number, peakHeight: number, releaseSteepness: number): number {
  const rampEnd = peakPosition * 0.4;
  const plateauEnd = peakPosition + (1 - peakPosition) * 0.4;
  if (t <= rampEnd) {
    if (rampEnd <= 0) return peakHeight;
    return Math.pow(t / rampEnd, 2) * peakHeight;
  }
  if (t <= plateauEnd) return peakHeight;
  if (plateauEnd >= 1) return peakHeight;
  const u = (t - plateauEnd) / (1 - plateauEnd);
  return peakHeight * Math.pow(1 - u, 1 + 2 * releaseSteepness);
}

/**
 * Drift — undulating curve with no clear peak.
 * release_steepness controls the amplitude depth of the drift around 0.5.
 */
function driftCurve(t: number, peakHeight: number, releaseSteepness: number): number {
  const phase = t * 3 * Math.PI - Math.PI / 2;
  const value = 0.5 + 0.5 * Math.sin(phase) * releaseSteepness;
  return peakHeight * value;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
