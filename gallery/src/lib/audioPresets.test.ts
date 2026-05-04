import { describe, expect, it } from 'vitest';
import { AUDIO_PRESETS, PRESET_GROUPS, PRESET_ORDER, getPreset, audioParamsFromPreset, presetFromAudioParams } from './audioPresets';

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

  it('audioParamsFromPreset round-trips a preset built from AudioParams', () => {
    // Pick a non-default value in every field to make the round-trip meaningful.
    const original = {
      drone_waveform: 'sawtooth',
      drone_glide: 0.3,
      pulse_sensitivity: 0.65,
      presence: 0.55,
      accent_style: 'bell',
      texture_density: 0.45,
    } as const;
    const preset = presetFromAudioParams(original);
    const round = audioParamsFromPreset(preset);
    expect(round.drone_waveform).toBe(original.drone_waveform);
    expect(round.accent_style).toBe(original.accent_style);
    expect(round.pulse_sensitivity).toBeCloseTo(original.pulse_sensitivity, 5);
    expect(round.texture_density).toBeCloseTo(original.texture_density, 5);
    // glide and presence go through a lerp pair so allow a small drift
    expect(round.drone_glide).toBeCloseTo(original.drone_glide, 2);
    expect(round.presence).toBeCloseTo(original.presence, 2);
  });

  it('audioParamsFromPreset returns sensible values for hand-authored presets', () => {
    const p = audioParamsFromPreset(AUDIO_PRESETS['storm-surge']);
    expect(p.drone_waveform).toBe('sawtooth');
    expect(p.accent_style).toBe('ping');
    expect(p.pulse_sensitivity).toBeGreaterThan(0.5);
    expect(p.drone_glide).toBeGreaterThanOrEqual(0);
    expect(p.drone_glide).toBeLessThanOrEqual(1);
    expect(p.presence).toBeGreaterThanOrEqual(0);
    expect(p.presence).toBeLessThanOrEqual(1);
  });
});
