import { describe, it, expect } from 'vitest';
import { detectMoments } from './moments';

describe('detectMoments', () => {
  it('returns empty for empty input', () => {
    const result = detectMoments([]);
    expect(result.intensity).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('returns intensity array matching input length', () => {
    const result = detectMoments([10, 11, 12, 20, 12, 11, 10]);
    expect(result.intensity).toHaveLength(7);
  });

  it('intensity values are bounded [0, 1]', () => {
    const result = detectMoments([1, 100, 1, 100, 1, 100]);
    for (const v of result.intensity) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('spike generates event', () => {
    const values = Array(20).fill(10).concat([30]).concat(Array(20).fill(10));
    const result = detectMoments(values, undefined, 1, 0.3);
    expect(result.events.length).toBeGreaterThan(0);
    const spike = result.events.find((e) => e.frame === 20);
    expect(spike).toBeDefined();
  });

  it('is deterministic', () => {
    const values = [10, 15, 12, 20, 11, 18, 14];
    const a = detectMoments(values);
    const b = detectMoments(values);
    expect(a.intensity).toEqual(b.intensity);
    expect(a.events.length).toBe(b.events.length);
  });

  it('monotonic rising produces records', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = detectMoments(values, undefined, 1, 0.5);
    const records = result.events.filter((e) => e.type === 'record');
    expect(records.length).toBeGreaterThan(0);
  });

  it('uniform values produce low intensity', () => {
    const result = detectMoments(Array(10).fill(5));
    const maxIntensity = Math.max(...result.intensity);
    expect(maxIntensity).toBeLessThanOrEqual(0.35);
  });
});
