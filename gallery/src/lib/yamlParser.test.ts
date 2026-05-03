import { describe, it, expect } from 'vitest';
import {
  parseRecipeYaml,
  reconstructYaml,
  CREATIVE_MARKER,
  detectState,
  ensureMarker,
  extractAudioParams,
  extractRenderParams,
} from './yamlParser';
import { MOOD_PRESETS, creativeToTechnical } from './creativeMapping';

const SAMPLE_YAML = `name: test-recipe
region:
  lat: [25, 65]
  lon: [-80, 0]
sources:
  primary: oisst
schedule: daily

# ⊓ creative controls ⊓
render:
  type: field
  colormap: thermal
  opacity: 0.71
  seed: 42`;

describe('parseRecipeYaml', () => {
  it('tags lines above marker as structural', () => {
    const lines = parseRecipeYaml(SAMPLE_YAML);
    expect(lines[0].type).toBe('structural');
    expect(lines[0].text).toBe('name: test-recipe');
  });

  it('tags marker line as marker', () => {
    const lines = parseRecipeYaml(SAMPLE_YAML);
    const marker = lines.find((l) => l.type === 'marker');
    expect(marker).toBeDefined();
    expect(marker!.text.trim()).toBe(CREATIVE_MARKER);
  });

  it('tags lines below marker as creative', () => {
    const lines = parseRecipeYaml(SAMPLE_YAML);
    const creative = lines.filter((l) => l.type === 'creative');
    expect(creative.length).toBeGreaterThan(0);
    expect(creative[0].text).toContain('render:');
  });
});

describe('reconstructYaml', () => {
  it('round-trips without change', () => {
    const lines = parseRecipeYaml(SAMPLE_YAML);
    expect(reconstructYaml(lines)).toBe(SAMPLE_YAML);
  });
});

describe('ensureMarker', () => {
  it('preserves existing marker', () => {
    expect(ensureMarker(SAMPLE_YAML)).toBe(SAMPLE_YAML);
  });

  it('inserts marker before render block if missing', () => {
    const noMarker = `name: test\nrender:\n  type: field`;
    const result = ensureMarker(noMarker);
    expect(result).toContain(CREATIVE_MARKER);
    expect(result.indexOf(CREATIVE_MARKER)).toBeLessThan(result.indexOf('render:'));
  });
});

describe('extractAudioParams', () => {
  const WITH_AUDIO = `${SAMPLE_YAML}
audio:
  drone_waveform: sawtooth
  drone_glide: 0.7
  pulse_sensitivity: 0.85
  presence: 0.6
  accent_style: ping
  texture_density: 0.4
`;

  it('returns {} when no audio block exists', () => {
    expect(extractAudioParams(SAMPLE_YAML)).toEqual({});
  });

  it('parses every key with correct types', () => {
    const audio = extractAudioParams(WITH_AUDIO);
    expect(audio.drone_waveform).toBe('sawtooth');
    expect(audio.drone_glide).toBe(0.7);
    expect(audio.pulse_sensitivity).toBe(0.85);
    expect(audio.accent_style).toBe('ping');
  });

  it('only reads keys inside audio: block, not render: block', () => {
    const audio = extractAudioParams(WITH_AUDIO);
    expect(audio.opacity).toBeUndefined();
    expect(audio.colormap).toBeUndefined();
  });

  it('render extraction still works when audio block follows', () => {
    const render = extractRenderParams(WITH_AUDIO);
    expect(render.colormap).toBe('thermal');
    expect(render.opacity).toBe(0.71);
    expect(render.drone_waveform).toBeUndefined();
  });
});

describe('detectState', () => {
  it('returns matched when params equal creativeToTechnical output', () => {
    const state = MOOD_PRESETS['Becalmed'];
    const tech = creativeToTechnical(state);
    expect(detectState(state, tech)).toBe('matched');
  });

  it('returns partially-custom when 1-2 fields differ', () => {
    const state = MOOD_PRESETS['Becalmed'];
    const tech = { ...creativeToTechnical(state), opacity: 0.99 };
    expect(detectState(state, tech)).toBe('partially-custom');
  });

  it('returns custom when >2 fields differ', () => {
    const state = MOOD_PRESETS['Becalmed'];
    const tech = {
      ...creativeToTechnical(state),
      opacity: 0.1,
      colormap: 'wrong',
      particle_count: 1,
    };
    expect(detectState(state, tech)).toBe('custom');
  });
});
