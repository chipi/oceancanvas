import { describe, expect, it } from 'vitest';
import { DEFAULT_CHANNEL_MIX, DEFAULT_EQ, arcAt, channelScale, holdAt } from './audioEngineTypes';

describe('arcAt', () => {
  it('returns 1.0 for empty arc — no effect', () => {
    expect(arcAt([], 0)).toBe(1.0);
    expect(arcAt([], 100)).toBe(1.0);
  });

  it('returns the value at the requested frame', () => {
    expect(arcAt([0.1, 0.5, 0.9], 0)).toBe(0.1);
    expect(arcAt([0.1, 0.5, 0.9], 1)).toBe(0.5);
    expect(arcAt([0.1, 0.5, 0.9], 2)).toBe(0.9);
  });

  it('clamps to first value for negative frames', () => {
    expect(arcAt([0.1, 0.5, 0.9], -5)).toBe(0.1);
  });

  it('clamps to last value for out-of-bounds frames', () => {
    expect(arcAt([0.1, 0.5, 0.9], 99)).toBe(0.9);
  });
});

describe('channelScale', () => {
  it('returns 1.0 for default unmuted channel at volume 1', () => {
    expect(channelScale(DEFAULT_CHANNEL_MIX, 'drone')).toBe(1.0);
    expect(channelScale(DEFAULT_CHANNEL_MIX, 'pulse')).toBe(1.0);
  });

  it('returns 0 for muted channels regardless of volume', () => {
    const mix = { ...DEFAULT_CHANNEL_MIX, drone: { volume: 0.8, muted: true } };
    expect(channelScale(mix, 'drone')).toBe(0);
  });

  it('clamps volume into [0, 2]', () => {
    const mix = { ...DEFAULT_CHANNEL_MIX, drone: { volume: 5, muted: false } };
    expect(channelScale(mix, 'drone')).toBe(2);
  });
});

describe('DEFAULT_EQ', () => {
  it('is flat (all bands at 0 dB)', () => {
    expect(DEFAULT_EQ.bass).toBe(0);
    expect(DEFAULT_EQ.mid).toBe(0);
    expect(DEFAULT_EQ.treble).toBe(0);
  });
});

describe('holdAt', () => {
  it('returns false for empty mask — no effect', () => {
    expect(holdAt([], 0)).toBe(false);
    expect(holdAt([], 100)).toBe(false);
  });

  it('returns the mask value at the requested frame', () => {
    expect(holdAt([false, true, true, false], 0)).toBe(false);
    expect(holdAt([false, true, true, false], 1)).toBe(true);
    expect(holdAt([false, true, true, false], 3)).toBe(false);
  });

  it('returns false for out-of-bounds frames (no false-positive hold outside the mask)', () => {
    const mask = [false, true, true];
    expect(holdAt(mask, -1)).toBe(false);
    expect(holdAt(mask, 99)).toBe(false);
  });
});
