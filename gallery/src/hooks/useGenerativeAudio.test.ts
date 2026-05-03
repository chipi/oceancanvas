import { describe, expect, it } from 'vitest';
import { buildFrameView } from './useGenerativeAudio';
import type { MomentEvent } from '../lib/moments';

describe('buildFrameView', () => {
  const mkSeries = () => ({
    values: [10, 12, 15, 14, 20, 22],
    intensity: [0.1, 0.3, 0.7, 0.5, 0.95, 0.4],
    dates: ['2020-01', '2020-04', '2020-07', '2020-10', '2021-01', '2021-04'],
  });

  const range = { min: 10, max: 22 };

  it('normalises the data value into [0,1] for drone pitch', () => {
    const { values, intensity, dates } = mkSeries();
    const view = buildFrameView({
      currentFrame: 0,
      values, intensity, dates,
      momentByFrame: new Map(),
      valueRange: range,
    });
    expect(view.value).toBe(0);
    expect(view.intensity).toBeCloseTo(0.1, 3);
  });

  it('captures Δ-magnitude and direction across frames', () => {
    const { values, intensity, dates } = mkSeries();
    // frame 2 vs frame 1: 15 vs 12 → +3 → direction up, delta proportional to span*0.1=1.2 → clamp to 1
    const up = buildFrameView({
      currentFrame: 2, values, intensity, dates,
      momentByFrame: new Map(), valueRange: range,
    });
    expect(up.direction).toBe(1);
    expect(up.delta).toBeGreaterThan(0);

    // frame 3 vs 2: 14 vs 15 → -1 → direction down
    const down = buildFrameView({
      currentFrame: 3, values, intensity, dates,
      momentByFrame: new Map(), valueRange: range,
    });
    expect(down.direction).toBe(-1);
  });

  it('extracts month-of-year as monthFrac', () => {
    const { values, intensity, dates } = mkSeries();
    const view = buildFrameView({
      currentFrame: 2, values, intensity, dates,
      momentByFrame: new Map(), valueRange: range,
    });
    // 2020-07 → month 7 → (7-1)/12 = 0.5
    expect(view.monthFrac).toBeCloseTo(0.5, 3);
  });

  it('yearFrac walks 0→1 across the timeline', () => {
    const { values, intensity, dates } = mkSeries();
    const first = buildFrameView({
      currentFrame: 0, values, intensity, dates,
      momentByFrame: new Map(), valueRange: range,
    });
    const last = buildFrameView({
      currentFrame: values.length - 1, values, intensity, dates,
      momentByFrame: new Map(), valueRange: range,
    });
    expect(first.yearFrac).toBe(0);
    expect(last.yearFrac).toBe(1);
  });

  it('fires accent when frame matches a moment, types record-high vs record-low', () => {
    const { values, intensity, dates } = mkSeries();
    const moments: MomentEvent[] = [
      { frame: 4, score: 1, label: 'All-time high (22.0°)', type: 'record' },
      { frame: 1, score: 0.8, label: 'All-time low (12.0°)', type: 'record' },
    ];
    const map = new Map(moments.map((m) => [m.frame, m]));

    const high = buildFrameView({
      currentFrame: 4, values, intensity, dates,
      momentByFrame: map, valueRange: range,
    });
    expect(high.isAccent).toBe(true);
    expect(high.accentType).toBe('record-high');

    const low = buildFrameView({
      currentFrame: 1, values, intensity, dates,
      momentByFrame: map, valueRange: range,
    });
    expect(low.isAccent).toBe(true);
    expect(low.accentType).toBe('record-low');
  });

  it('clamps currentFrame to series bounds', () => {
    const { values, intensity, dates } = mkSeries();
    const view = buildFrameView({
      currentFrame: 99, values, intensity, dates,
      momentByFrame: new Map(), valueRange: range,
    });
    expect(view.frame).toBe(values.length - 1);
  });
});
