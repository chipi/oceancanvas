import { describe, it, expect } from 'vitest';
import { creativeToTechnical, MOOD_PRESETS, isMatched } from './creativeMapping';

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
