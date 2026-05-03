import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ARC_SPEC,
  expandArc,
  isArcPreset,
  type TensionArcSpec,
} from './tensionArc';

interface FixtureCase {
  name: string;
  spec: TensionArcSpec;
  total_frames: number;
  dominant_moment_frame: number | null;
  expected_arc: number[];
}

interface FixtureFile {
  tolerance: number;
  cases: FixtureCase[];
}

const fixturePath = join(__dirname, '..', '..', '..', 'tests', 'cross-validation', 'tension_arc_fixtures.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as FixtureFile;

describe('expandArc — cross-validation parity', () => {
  for (const c of fixture.cases) {
    it(`fixture: ${c.name}`, () => {
      const arc = expandArc(c.spec, c.total_frames, c.dominant_moment_frame);
      expect(arc.length).toBe(c.expected_arc.length);
      for (let i = 0; i < arc.length; i++) {
        expect(arc[i]).toBeCloseTo(c.expected_arc[i], 9);
      }
    });
  }
});

describe('expandArc — unit', () => {
  it('returns empty for total_frames = 0', () => {
    expect(expandArc(DEFAULT_ARC_SPEC, 0)).toEqual([]);
  });

  it('returns constant 1.0 for preset=none', () => {
    const arc = expandArc({ ...DEFAULT_ARC_SPEC, preset: 'none' }, 50);
    expect(arc.length).toBe(50);
    expect(arc.every((v) => v === 1.0)).toBe(true);
  });

  it('classic peaks at peak_position', () => {
    const totalFrames = 101;
    const arc = expandArc({ ...DEFAULT_ARC_SPEC, preset: 'classic', peak_position: 0.5 }, totalFrames);
    const peakIdx = arc.indexOf(Math.max(...arc));
    expect(peakIdx).toBe(50);
    expect(arc[50]).toBeCloseTo(1.0, 9);
  });

  it('peak_height caps the maximum value', () => {
    const arc = expandArc({ ...DEFAULT_ARC_SPEC, peak_height: 0.5 }, 100);
    expect(Math.max(...arc)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it('pin_key_moment relocates the peak', () => {
    const arc = expandArc(
      { ...DEFAULT_ARC_SPEC, pin_key_moment: true, preset: 'classic' },
      100,
      30, // moment at frame 30
    );
    const peakIdx = arc.indexOf(Math.max(...arc));
    expect(peakIdx).toBe(30);
  });

  it('pin_key_moment with null momentFrame ignores the pin', () => {
    const baseline = expandArc({ ...DEFAULT_ARC_SPEC, preset: 'classic', peak_position: 0.65 }, 100);
    const pinned = expandArc(
      { ...DEFAULT_ARC_SPEC, pin_key_moment: true, preset: 'classic', peak_position: 0.65 },
      100,
      null,
    );
    expect(pinned).toEqual(baseline);
  });

  it('out-of-range peak_position clamps', () => {
    const high = expandArc({ ...DEFAULT_ARC_SPEC, peak_position: 1.5 }, 30);
    const atOne = expandArc({ ...DEFAULT_ARC_SPEC, peak_position: 1 }, 30);
    expect(high).toEqual(atOne);
  });

  it('drift produces non-monotonic values', () => {
    const arc = expandArc({ ...DEFAULT_ARC_SPEC, preset: 'drift' }, 100);
    let increases = 0;
    let decreases = 0;
    for (let i = 1; i < arc.length; i++) {
      if (arc[i] > arc[i - 1]) increases++;
      if (arc[i] < arc[i - 1]) decreases++;
    }
    expect(increases).toBeGreaterThan(0);
    expect(decreases).toBeGreaterThan(0);
  });

  it('invert is classic mirrored — equal sums for matched specs', () => {
    const classic = expandArc({ ...DEFAULT_ARC_SPEC, preset: 'classic' }, 100);
    const invert = expandArc({ ...DEFAULT_ARC_SPEC, preset: 'invert' }, 100);
    const cSum = classic.reduce((a, b) => a + b, 0);
    const iSum = invert.reduce((a, b) => a + b, 0);
    expect(iSum).toBeCloseTo(cSum, 6);
  });

  it('is deterministic — same inputs always same output', () => {
    const a = expandArc(DEFAULT_ARC_SPEC, 50);
    const b = expandArc(DEFAULT_ARC_SPEC, 50);
    expect(a).toEqual(b);
  });
});

describe('isArcPreset', () => {
  it('accepts the five valid presets', () => {
    for (const p of ['classic', 'plateau', 'drift', 'invert', 'none']) {
      expect(isArcPreset(p)).toBe(true);
    }
  });
  it('rejects unknown values', () => {
    expect(isArcPreset('made-up')).toBe(false);
    expect(isArcPreset(undefined)).toBe(false);
    expect(isArcPreset(42)).toBe(false);
  });
});
