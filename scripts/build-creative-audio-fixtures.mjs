#!/usr/bin/env node
/**
 * Generates tests/cross-validation/creative_audio_fixtures.json — the canonical
 * (creative state → expected audio params) pairs both `creativeToAudio` (TS)
 * and `creative_to_audio` (Py) must produce.
 *
 * The mapping below MUST stay identical to:
 *   - gallery/src/lib/creativeMapping.ts — creativeToAudio
 *   - pipeline/src/oceancanvas/creative_mapping.py — creative_to_audio
 *
 * Re-run any time the mapping changes. Output is committed.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'tests', 'cross-validation', 'creative_audio_fixtures.json');

// ── Inline mapping — keep in sync with creativeMapping.ts / creative_mapping.py ────

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function creativeToAudio(state) {
  const { mood, energy_x, energy_y, colour_character, temporal_weight } = state;

  let drone_waveform;
  if (colour_character < 0.33) drone_waveform = 'sine';
  else if (colour_character < 0.66) drone_waveform = 'triangle';
  else drone_waveform = 'sawtooth';

  const accent_style =
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
    drone_glide: round2(clamp(temporal_weight, 0, 1)),
    pulse_sensitivity: round2(clamp(energy_x, 0, 1)),
    presence: round2(clamp(lerp(0.3, 1.0, energy_y), 0.1, 1.0)),
    accent_style,
    texture_density: round2(clamp(lerp(0.15, 0.6, energy_y), 0, 1)),
  };
}

// ── Fixture cases — all 5 mood presets + edge / custom cases ─────────────

const MOOD_PRESETS = {
  'Becalmed':         { energy_x: 0.2, energy_y: 0.6, colour_character: 0.3, temporal_weight: 0.4 },
  'Deep current':     { energy_x: 0.4, energy_y: 0.8, colour_character: 0.4, temporal_weight: 0.7 },
  'Storm surge':      { energy_x: 0.9, energy_y: 0.3, colour_character: 0.5, temporal_weight: 0.6 },
  'Surface shimmer':  { energy_x: 0.5, energy_y: 0.5, colour_character: 0.6, temporal_weight: 0.3 },
  'Arctic still':     { energy_x: 0.1, energy_y: 0.9, colour_character: 0.0, temporal_weight: 0.8 },
};

const fixtures = [];

// One case per named mood preset
for (const [name, axes] of Object.entries(MOOD_PRESETS)) {
  fixtures.push({
    name,
    input: { mood: name, ...axes },
  });
}

// Custom-mood edge cases — exercise the heuristic accent selection branches
const CUSTOM_CASES = [
  { name: 'custom-energy-x-high',  input: { mood: 'custom', energy_x: 0.8, energy_y: 0.5, colour_character: 0.5, temporal_weight: 0.5 } },
  { name: 'custom-energy-y-high',  input: { mood: 'custom', energy_x: 0.4, energy_y: 0.8, colour_character: 0.5, temporal_weight: 0.5 } },
  { name: 'custom-energy-y-low',   input: { mood: 'custom', energy_x: 0.4, energy_y: 0.2, colour_character: 0.5, temporal_weight: 0.5 } },
  { name: 'custom-mid',            input: { mood: 'custom', energy_x: 0.4, energy_y: 0.4, colour_character: 0.5, temporal_weight: 0.5 } },
  { name: 'custom-arctic-colour',  input: { mood: 'custom', energy_x: 0.5, energy_y: 0.5, colour_character: 0.0, temporal_weight: 0.5 } },
  { name: 'custom-otherworldly',   input: { mood: 'custom', energy_x: 0.5, energy_y: 0.5, colour_character: 1.0, temporal_weight: 0.5 } },
  { name: 'all-zeros',             input: { mood: 'custom', energy_x: 0.0, energy_y: 0.0, colour_character: 0.0, temporal_weight: 0.0 } },
  { name: 'all-ones',              input: { mood: 'custom', energy_x: 1.0, energy_y: 1.0, colour_character: 1.0, temporal_weight: 1.0 } },
];

for (const c of CUSTOM_CASES) {
  fixtures.push(c);
}

// Compute expected output for each case
for (const f of fixtures) {
  f.expected = creativeToAudio(f.input);
}

writeFileSync(OUT, JSON.stringify(fixtures, null, 2) + '\n');
console.log(`Wrote ${fixtures.length} fixture cases to ${OUT}`);
