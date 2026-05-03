#!/usr/bin/env node
/**
 * Migrate recipes with no audio: block to include one derived from their render params.
 *
 * Strategy:
 *   1. Parse each recipe's render: block.
 *   2. Reverse-engineer the creative state via the same logic the gallery uses (technicalToCreative).
 *   3. Run that state through creativeToAudio() to produce the canonical audio block.
 *   4. Append `audio:` + key-value lines beneath the existing render block.
 *
 * Idempotent — already-migrated recipes (those with an audio: block) are skipped.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECIPES_DIR = join(__dirname, '..', 'recipes');

// ── Inline copies of technicalToCreative + creativeToAudio so the script doesn't
//    depend on the gallery's TS build. Must stay in sync with creativeMapping.ts.

const MOOD_PRESETS = {
  'Becalmed': { energy_x: 0.2, energy_y: 0.6, colour_character: 0.3, temporal_weight: 0.4 },
  'Deep current': { energy_x: 0.4, energy_y: 0.8, colour_character: 0.4, temporal_weight: 0.7 },
  'Storm surge': { energy_x: 0.9, energy_y: 0.3, colour_character: 0.5, temporal_weight: 0.6 },
  'Surface shimmer': { energy_x: 0.5, energy_y: 0.5, colour_character: 0.6, temporal_weight: 0.3 },
  'Arctic still': { energy_x: 0.1, energy_y: 0.9, colour_character: 0.0, temporal_weight: 0.8 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const round2 = (v) => Math.round(v * 100) / 100;

function technicalToCreative(params) {
  const inv = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
  const speed = Number(params.speed_scale ?? 1.0);
  const energy_x = inv(0.2, 2.0, speed);
  const opacity = Number(params.opacity ?? 0.7);
  const pc = Number(params.particle_count ?? 2000);
  const energy_y = (inv(0.3, 1.0, opacity) + inv(500, 5000, pc)) / 2;
  const tl = Number(params.tail_length ?? 12);
  const temporal_weight = inv(3, 24, tl);
  const colormap = String(params.colormap ?? 'thermal');
  let colour_character = 0.5;
  if (colormap === 'arctic') colour_character = 0.15;
  else if (colormap === 'thermal') colour_character = 0.5;
  else if (colormap === 'otherworldly') colour_character = 0.85;

  const state = {
    mood: 'custom',
    energy_x: round2(energy_x),
    energy_y: round2(energy_y),
    colour_character: round2(colour_character),
    temporal_weight: round2(temporal_weight),
  };
  for (const [name, p] of Object.entries(MOOD_PRESETS)) {
    const dist = Math.abs(p.energy_x - state.energy_x) + Math.abs(p.energy_y - state.energy_y) +
                 Math.abs(p.colour_character - state.colour_character) + Math.abs(p.temporal_weight - state.temporal_weight);
    if (dist < 0.15) { state.mood = name; break; }
  }
  return state;
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

function extractRenderParams(yaml) {
  const lines = yaml.split('\n');
  const params = {};
  let inRender = false;
  let belowMarker = false;
  for (const line of lines) {
    if (line.includes('⊓ creative controls ⊓')) { belowMarker = true; continue; }
    if (!belowMarker) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('render:')) { inRender = true; continue; }
    if (inRender && trimmed && !line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('#')) {
      inRender = false;
    }
    if (inRender && trimmed && !trimmed.startsWith('#')) {
      const m = trimmed.match(/^(\w+):\s*(.+)$/);
      if (m) {
        const [, k, vRaw] = m;
        const v = vRaw.replace(/^["']|["']$/g, '');
        if (v === 'true') params[k] = true;
        else if (v === 'false') params[k] = false;
        else if (!isNaN(Number(v))) params[k] = Number(v);
        else params[k] = v;
      }
    }
  }
  return params;
}

function hasAudioBlock(yaml) {
  return /^audio:\s*$/m.test(yaml) || /^audio:/m.test(yaml);
}

function appendAudioBlock(yaml, audio) {
  const lines = yaml.split('\n');
  const audioLines = ['audio:', ...Object.entries(audio).map(([k, v]) => `  ${k}: ${v}`)];
  // Drop trailing blank lines, then append
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return [...lines, ...audioLines, ''].join('\n');
}

const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.yaml'));
let migrated = 0, skipped = 0;

for (const file of files) {
  const path = join(RECIPES_DIR, file);
  const yaml = readFileSync(path, 'utf8');
  if (hasAudioBlock(yaml)) { skipped++; continue; }
  const params = extractRenderParams(yaml);
  if (Object.keys(params).length === 0) {
    console.warn(`  ${file}: no render params, skipping`);
    skipped++;
    continue;
  }
  const state = technicalToCreative(params);
  const audio = creativeToAudio(state);
  const next = appendAudioBlock(yaml, audio);
  writeFileSync(path, next, 'utf8');
  console.log(`  ${file}: ${state.mood} → ${audio.drone_waveform}/${audio.accent_style}`);
  migrated++;
}

console.log(`\n${migrated} migrated, ${skipped} skipped.`);
