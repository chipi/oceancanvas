#!/usr/bin/env node
/**
 * Migrate recipes that don't yet have a tension_arc: block to include one.
 *
 * Default: `tension_arc: { preset: classic, peak_position: 0.65, peak_height: 1.0,
 * release_steepness: 0.7, pin_key_moment: true }`. The classic preset is the
 * common case; pin_key_moment defaults to true so the held-moment gesture
 * lands on a real significant frame for recipes with strong key moments.
 *
 * Idempotent — already-migrated recipes (those with a tension_arc: block)
 * are skipped. Re-runnable any time defaults change.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECIPES_DIR = join(__dirname, '..', 'recipes');

const DEFAULT_BLOCK = [
  'tension_arc:',
  '  preset: classic',
  '  peak_position: 0.65',
  '  peak_height: 1.0',
  '  release_steepness: 0.7',
  '  pin_key_moment: true',
];

function hasArcBlock(yaml) {
  return /^tension_arc:/m.test(yaml);
}

function appendArcBlock(yaml) {
  const lines = yaml.split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return [...lines, ...DEFAULT_BLOCK, ''].join('\n');
}

const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.yaml'));
let migrated = 0;
let skipped = 0;

for (const file of files) {
  const path = join(RECIPES_DIR, file);
  const yaml = readFileSync(path, 'utf8');
  if (hasArcBlock(yaml)) {
    skipped++;
    continue;
  }
  writeFileSync(path, appendArcBlock(yaml), 'utf8');
  console.log(`  ${file}: tension_arc: classic appended`);
  migrated++;
}

console.log(`\n${migrated} migrated, ${skipped} skipped.`);
