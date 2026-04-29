/**
 * YAML parser with comment-marker partitioning.
 *
 * Splits recipe YAML at the `# ⊓ creative controls ⊓` marker.
 * Lines above = structural (teal in editor). Lines below = creative (amber).
 * Supports round-trip: load → save preserves formatting.
 */

import type { CreativeState, TechnicalParams } from './creativeMapping';
import { creativeToTechnical } from './creativeMapping';

export const CREATIVE_MARKER = '# ⊓ creative controls ⊓';

export interface TaggedLine {
  text: string;
  type: 'structural' | 'creative' | 'marker';
}

export type RecipeState = 'matched' | 'partially-custom' | 'custom';

/**
 * Parse recipe YAML into tagged lines for editor display.
 */
export function parseRecipeYaml(yaml: string): TaggedLine[] {
  const lines = yaml.split('\n');
  let belowMarker = false;

  return lines.map((text) => {
    if (text.trim() === CREATIVE_MARKER) {
      belowMarker = true;
      return { text, type: 'marker' as const };
    }
    return {
      text,
      type: belowMarker ? ('creative' as const) : ('structural' as const),
    };
  });
}

/**
 * Reconstruct YAML string from tagged lines.
 * Round-trip safe: parseRecipeYaml(yaml) → reconstructYaml(lines) === yaml
 */
export function reconstructYaml(lines: TaggedLine[]): string {
  return lines.map((l) => l.text).join('\n');
}

/**
 * Extract the render block values from YAML text (below the marker).
 * Returns key-value pairs from the render: section.
 */
export function extractRenderParams(yaml: string): Record<string, unknown> {
  const lines = parseRecipeYaml(yaml);
  const creativeLines = lines
    .filter((l) => l.type === 'creative')
    .map((l) => l.text);

  const params: Record<string, unknown> = {};
  let inRender = false;

  for (const line of creativeLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('render:')) {
      inRender = true;
      continue;
    }
    if (inRender && trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, val] = match;
        // Parse value
        if (val === 'true') params[key] = true;
        else if (val === 'false') params[key] = false;
        else if (!isNaN(Number(val))) params[key] = Number(val);
        else params[key] = val;
      }
    }
    // Stop parsing render block if we hit a non-indented line
    if (inRender && trimmed && !line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('render:')) {
      inRender = false;
    }
  }

  return params;
}

/**
 * Detect whether the technical params match what the creative state produces.
 *
 * - matched: all params identical to creativeToTechnical output
 * - partially-custom: 1-2 fields differ
 * - custom: >2 fields differ or unrecognizable
 */
export function detectState(
  creativeState: CreativeState,
  currentParams: TechnicalParams,
): RecipeState {
  const expected = creativeToTechnical(creativeState);
  const keys = Object.keys(expected) as (keyof TechnicalParams)[];

  let diffs = 0;
  for (const key of keys) {
    if (JSON.stringify(expected[key]) !== JSON.stringify(currentParams[key])) {
      diffs++;
    }
  }

  if (diffs === 0) return 'matched';
  if (diffs <= 2) return 'partially-custom';
  return 'custom';
}

/**
 * Ensure the YAML has a creative marker. If missing, insert before the render: block.
 */
export function ensureMarker(yaml: string): string {
  if (yaml.includes(CREATIVE_MARKER)) return yaml;

  const lines = yaml.split('\n');
  const renderIdx = lines.findIndex((l) => l.trim().startsWith('render:'));

  if (renderIdx >= 0) {
    lines.splice(renderIdx, 0, '', CREATIVE_MARKER);
  } else {
    lines.push('', CREATIVE_MARKER);
  }

  return lines.join('\n');
}
