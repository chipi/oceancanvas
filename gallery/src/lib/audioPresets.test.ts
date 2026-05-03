import { describe, expect, it } from 'vitest';
import { AUDIO_PRESETS, PRESET_GROUPS, PRESET_ORDER, getPreset } from './audioPresets';

describe('audioPresets', () => {
  it('exports all synth presets plus the JMJ-inspired ambient presets', () => {
    expect(Object.keys(AUDIO_PRESETS).sort()).toEqual([
      'arctic-still', 'becalmed', 'chronologie', 'deep', 'deep-current',
      'dramatic', 'equinoxe', 'glacial', 'magnetic-fields',
      'ocean', 'oxygene', 'storm-surge', 'surface-shimmer',
    ]);
  });

  it('every preset declares an engine', () => {
    for (const preset of Object.values(AUDIO_PRESETS)) {
      expect(['synth', 'ambient']).toContain(preset.engine);
    }
  });

  it('JMJ-inspired presets use the ambient engine', () => {
    expect(AUDIO_PRESETS.oxygene.engine).toBe('ambient');
    expect(AUDIO_PRESETS.equinoxe.engine).toBe('ambient');
    expect(AUDIO_PRESETS['magnetic-fields'].engine).toBe('ambient');
    expect(AUDIO_PRESETS.chronologie.engine).toBe('ambient');
    expect(AUDIO_PRESETS.glacial.engine).toBe('ambient');
  });

  it('PRESET_ORDER lists every preset exactly once', () => {
    expect([...PRESET_ORDER].sort()).toEqual(Object.keys(AUDIO_PRESETS).sort());
  });

  it('PRESET_GROUPS partition all presets across engines', () => {
    const grouped = PRESET_GROUPS.flatMap((g) => g.ids).sort();
    expect(grouped).toEqual(Object.keys(AUDIO_PRESETS).sort());
  });

  it('every preset declares all four layers', () => {
    for (const preset of Object.values(AUDIO_PRESETS)) {
      expect(preset.drone.minHz).toBeGreaterThan(0);
      expect(preset.drone.maxHz).toBeGreaterThan(preset.drone.minHz);
      expect(preset.pulse.maxBpm).toBeGreaterThanOrEqual(preset.pulse.minBpm);
      expect(preset.accent.style).toMatch(/^(chime|bell|ping|drop)$/);
      expect(preset.texture.density).toBeGreaterThanOrEqual(0);
      expect(preset.texture.density).toBeLessThanOrEqual(1);
      expect(preset.master).toBeGreaterThan(0);
    }
  });

  it('storm-surge is sawtooth + aggressive pulse + ping accents per RFC-010 mood table', () => {
    const p = AUDIO_PRESETS['storm-surge'];
    expect(p.drone.waveform).toBe('sawtooth');
    expect(p.pulse.maxBpm).toBeGreaterThanOrEqual(170);
    expect(p.accent.style).toBe('ping');
  });

  it('arctic-still is sine + near-silent pulse + drop accents per RFC-010 mood table', () => {
    const p = AUDIO_PRESETS['arctic-still'];
    expect(p.drone.waveform).toBe('sine');
    expect(p.pulse.gain).toBeLessThan(0.15);
    expect(p.accent.style).toBe('drop');
  });

  it('getPreset falls back to ocean for unknown id', () => {
    expect(getPreset('nope').id).toBe('ocean');
    expect(getPreset('storm-surge').id).toBe('storm-surge');
  });
});
