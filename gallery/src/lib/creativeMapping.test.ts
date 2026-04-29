import { describe, it, expect } from 'vitest';
import { creativeToTechnical, technicalToCreative, MOOD_PRESETS, isMatched } from './creativeMapping';

describe('creativeToTechnical', () => {
  it('returns valid params for Becalmed preset', () => {
    const result = creativeToTechnical(MOOD_PRESETS['Becalmed']);
    expect(result.colormap).toBe('arctic');
    expect(result.smooth).toBe(true);
    expect(result.opacity).toBeGreaterThan(0);
    expect(result.opacity).toBeLessThanOrEqual(1);
    expect(result.particle_count).toBeGreaterThan(0);
  });

  it('returns valid params for Storm surge preset', () => {
    const result = creativeToTechnical(MOOD_PRESETS['Storm surge']);
    expect(result.colormap).toBe('thermal');
    expect(result.smooth).toBe(false);
    expect(result.speed_scale).toBeGreaterThan(1);
  });

  it('is deterministic — same input always same output', () => {
    const a = creativeToTechnical(MOOD_PRESETS['Becalmed']);
    const b = creativeToTechnical(MOOD_PRESETS['Becalmed']);
    expect(a).toEqual(b);
  });

  it('all presets produce valid output', () => {
    for (const [, preset] of Object.entries(MOOD_PRESETS)) {
      const result = creativeToTechnical(preset);
      expect(result.colormap).toBeTruthy();
      expect(result.opacity).toBeGreaterThanOrEqual(0);
      expect(result.opacity).toBeLessThanOrEqual(1);
      expect(result.particle_count).toBeGreaterThan(0);
    }
  });

  it('colour_character boundaries are correct', () => {
    const s = { mood: 'test', energy_x: 0.5, energy_y: 0.5, temporal_weight: 0.5 };
    expect(creativeToTechnical({ ...s, colour_character: 0.0 }).colormap).toBe('arctic');
    expect(creativeToTechnical({ ...s, colour_character: 0.32 }).colormap).toBe('arctic');
    expect(creativeToTechnical({ ...s, colour_character: 0.34 }).colormap).toBe('thermal');
    expect(creativeToTechnical({ ...s, colour_character: 0.67 }).colormap).toBe('otherworldly');
  });

  it('extreme calm produces minimum values', () => {
    const result = creativeToTechnical({
      mood: 'test', energy_x: 0, energy_y: 0, colour_character: 0, temporal_weight: 0,
    });
    expect(result.particle_count).toBe(500);
    expect(result.speed_scale).toBe(0.2);
    expect(result.smooth).toBe(true);
  });

  it('extreme turbulent produces maximum values', () => {
    const result = creativeToTechnical({
      mood: 'test', energy_x: 1, energy_y: 1, colour_character: 1, temporal_weight: 1,
    });
    expect(result.particle_count).toBe(5000);
    expect(result.speed_scale).toBe(2.0);
    expect(result.smooth).toBe(false);
  });
});

describe('isMatched', () => {
  it('returns true when params match preset exactly', () => {
    const state = MOOD_PRESETS['Becalmed'];
    const tech = creativeToTechnical(state);
    expect(isMatched(state, tech)).toBe(true);
  });

  it('returns false when a param is changed', () => {
    const state = MOOD_PRESETS['Becalmed'];
    const tech = { ...creativeToTechnical(state), opacity: 0.99 };
    expect(isMatched(state, tech)).toBe(false);
  });
});

describe('technicalToCreative', () => {
  it('round-trips all presets approximately', () => {
    for (const [name, preset] of Object.entries(MOOD_PRESETS)) {
      const tech = creativeToTechnical(preset);
      const reversed = technicalToCreative(tech);
      // energy_x, energy_y should be close (within 0.15)
      expect(Math.abs(reversed.energy_x - preset.energy_x)).toBeLessThan(0.15);
      expect(Math.abs(reversed.energy_y - preset.energy_y)).toBeLessThan(0.15);
      expect(Math.abs(reversed.temporal_weight - preset.temporal_weight)).toBeLessThan(0.15);
    }
  });

  it('maps thermal colormap to mid colour_character', () => {
    const result = technicalToCreative({ colormap: 'thermal', opacity: 0.7, speed_scale: 1.0, particle_count: 2000, tail_length: 12 });
    expect(result.colour_character).toBe(0.5);
  });

  it('maps arctic colormap to low colour_character', () => {
    const result = technicalToCreative({ colormap: 'arctic', opacity: 0.7, speed_scale: 1.0, particle_count: 2000, tail_length: 12 });
    expect(result.colour_character).toBe(0.15);
  });

  it('maps otherworldly colormap to high colour_character', () => {
    const result = technicalToCreative({ colormap: 'otherworldly', opacity: 0.7, speed_scale: 1.0, particle_count: 2000, tail_length: 12 });
    expect(result.colour_character).toBe(0.85);
  });

  it('returns mood=saved for non-preset params', () => {
    const result = technicalToCreative({ colormap: 'thermal', opacity: 0.85, speed_scale: 1.0, particle_count: 3000, tail_length: 12 });
    // These hand-authored params don't match any preset
    expect(result.mood).toBe('custom');
  });
});
