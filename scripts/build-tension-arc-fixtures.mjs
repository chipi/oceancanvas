#!/usr/bin/env node
/**
 * Generates tests/cross-validation/tension_arc_fixtures.json — the canonical
 * (spec → expected_arc) pairs both TypeScript and Python implementations must
 * match byte-for-byte (within a 1e-9 tolerance).
 *
 * The expansion logic below MUST stay identical to:
 *   - gallery/src/lib/tensionArc.ts
 *   - pipeline/src/oceancanvas/arc.py
 *
 * Re-run any time the curve formulas change. Output is committed.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'tests', 'cross-validation', 'tension_arc_fixtures.json');

// ── Inline expansion logic — keep in sync with tensionArc.ts / arc.py ────

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function classicCurve(t, peakPosition, peakHeight, releaseSteepness) {
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

function plateauCurve(t, peakPosition, peakHeight, releaseSteepness) {
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

function driftCurve(t, peakHeight, releaseSteepness) {
  const phase = t * 3 * Math.PI - Math.PI / 2;
  const value = 0.5 + 0.5 * Math.sin(phase) * releaseSteepness;
  return peakHeight * value;
}

function curveValue(preset, t, peakPosition, peakHeight, releaseSteepness) {
  switch (preset) {
    case 'classic':  return classicCurve(t, peakPosition, peakHeight, releaseSteepness);
    case 'plateau':  return plateauCurve(t, peakPosition, peakHeight, releaseSteepness);
    case 'drift':    return driftCurve(t, peakHeight, releaseSteepness);
    case 'invert':   return classicCurve(1 - t, peakPosition, peakHeight, releaseSteepness);
    case 'none':     return 1.0;
    default:         return 1.0;
  }
}

function expandArc(spec, totalFrames, dominantMomentFrame = null) {
  if (totalFrames <= 0) return [];
  if (spec.preset === 'none') return new Array(totalFrames).fill(1.0);

  let peakPosition = clamp(spec.peak_position, 0, 1);
  if (spec.pin_key_moment && dominantMomentFrame !== null && totalFrames > 1) {
    peakPosition = clamp(dominantMomentFrame / (totalFrames - 1), 0.05, 0.95);
  }
  const peakHeight = clamp(spec.peak_height, 0, 1);
  const releaseSteepness = clamp(spec.release_steepness, 0, 1);

  const result = new Array(totalFrames);
  for (let i = 0; i < totalFrames; i++) {
    const t = totalFrames > 1 ? i / (totalFrames - 1) : 0;
    result[i] = curveValue(spec.preset, t, peakPosition, peakHeight, releaseSteepness);
  }
  return result;
}

// ── Fixture cases ────────────────────────────────────────────────────────

const CASES = [
  { name: 'classic-default-100',
    spec: { preset: 'classic', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 100, dominant_moment_frame: null,
  },
  { name: 'classic-default-pin-no-moment',
    spec: { preset: 'classic', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: true },
    total_frames: 100, dominant_moment_frame: null,
  },
  { name: 'classic-pin-moment-80',
    spec: { preset: 'classic', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: true },
    total_frames: 100, dominant_moment_frame: 80,
  },
  { name: 'classic-mid-peak-50',
    spec: { preset: 'classic', peak_position: 0.5, peak_height: 0.8, release_steepness: 0.5, pin_key_moment: false },
    total_frames: 50, dominant_moment_frame: null,
  },
  { name: 'classic-edge-peak-zero',
    spec: { preset: 'classic', peak_position: 0.0, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 30, dominant_moment_frame: null,
  },
  { name: 'classic-edge-peak-one',
    spec: { preset: 'classic', peak_position: 1.0, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 30, dominant_moment_frame: null,
  },
  { name: 'plateau-default-100',
    spec: { preset: 'plateau', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 100, dominant_moment_frame: null,
  },
  { name: 'plateau-tunable-60',
    spec: { preset: 'plateau', peak_position: 0.7, peak_height: 0.9, release_steepness: 0.3, pin_key_moment: false },
    total_frames: 60, dominant_moment_frame: null,
  },
  { name: 'drift-default-100',
    spec: { preset: 'drift', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 100, dominant_moment_frame: null,
  },
  { name: 'drift-tunable-80',
    spec: { preset: 'drift', peak_position: 0.65, peak_height: 0.6, release_steepness: 0.4, pin_key_moment: false },
    total_frames: 80, dominant_moment_frame: null,
  },
  { name: 'invert-default-100',
    spec: { preset: 'invert', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 100, dominant_moment_frame: null,
  },
  { name: 'invert-tunable-50',
    spec: { preset: 'invert', peak_position: 0.4, peak_height: 1.0, release_steepness: 0.8, pin_key_moment: false },
    total_frames: 50, dominant_moment_frame: null,
  },
  { name: 'none-30',
    spec: { preset: 'none', peak_position: 0.65, peak_height: 1.0, release_steepness: 0.7, pin_key_moment: false },
    total_frames: 30, dominant_moment_frame: null,
  },
  { name: 'tiny-1-frame',
    spec: { preset: 'classic', peak_position: 0.5, peak_height: 1.0, release_steepness: 0.5, pin_key_moment: false },
    total_frames: 1, dominant_moment_frame: null,
  },
  { name: 'tiny-2-frame-classic',
    spec: { preset: 'classic', peak_position: 0.5, peak_height: 1.0, release_steepness: 0.5, pin_key_moment: false },
    total_frames: 2, dominant_moment_frame: null,
  },
  { name: 'silent-height-zero',
    spec: { preset: 'classic', peak_position: 0.5, peak_height: 0.0, release_steepness: 0.5, pin_key_moment: false },
    total_frames: 20, dominant_moment_frame: null,
  },
  { name: 'clamp-out-of-range-peak',
    spec: { preset: 'classic', peak_position: 1.5, peak_height: 1.2, release_steepness: -0.5, pin_key_moment: false },
    total_frames: 20, dominant_moment_frame: null,
  },
  { name: 'unknown-preset-fallback',
    spec: { preset: 'made-up-preset', peak_position: 0.5, peak_height: 1.0, release_steepness: 0.5, pin_key_moment: false },
    total_frames: 10, dominant_moment_frame: null,
  },
];

// ── Generate ──────────────────────────────────────────────────────────────

const fixtures = {
  generated_by: 'scripts/build-tension-arc-fixtures.mjs',
  tolerance: 1e-9,
  notes: [
    'Both gallery/src/lib/tensionArc.ts and pipeline/src/oceancanvas/arc.py',
    'must produce arrays equal to expected_arc within tolerance for each case.',
  ],
  cases: CASES.map((c) => ({
    ...c,
    expected_arc: expandArc(c.spec, c.total_frames, c.dominant_moment_frame),
  })),
};

writeFileSync(OUT, JSON.stringify(fixtures, null, 2));
console.log(`Wrote ${CASES.length} fixture cases to ${OUT}`);
