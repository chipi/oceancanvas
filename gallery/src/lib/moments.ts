/**
 * Key moment detection — TypeScript port of pipeline/src/oceancanvas/moments.py
 *
 * Produces a per-frame intensity signal [0.0–1.0] from a time series.
 * Four detectors: peaks, records, thresholds, inflections.
 * Implements RFC-007 / ADR-024.
 */

export interface MomentEvent {
  frame: number;
  score: number;
  label: string;
  type: 'peak' | 'record' | 'threshold' | 'inflection';
}

export interface MomentSignal {
  intensity: number[];
  events: MomentEvent[];
}

export interface DetectorWeights {
  peaks: number;
  records: number;
  threshold: number;
  inflection: number;
}

const DEFAULT_WEIGHTS: DetectorWeights = {
  peaks: 0.4,
  records: 0.3,
  threshold: 0.2,
  inflection: 0.1,
};

export function detectMoments(
  values: number[],
  weights: DetectorWeights = DEFAULT_WEIGHTS,
  smoothingWindow = 3,
  eventThreshold = 0.7,
): MomentSignal {
  if (!values.length) return { intensity: [], events: [] };

  const peaks = detectPeaks(values);
  const records = detectRecords(values);
  const inflections = detectInflections(values);

  const raw = values.map((_, i) => {
    const score =
      weights.peaks * peaks[i] +
      weights.records * records[i] +
      weights.inflection * inflections[i];
    return Math.max(0, Math.min(1, score));
  });

  const intensity = smooth(raw, smoothingWindow);

  const events: MomentEvent[] = [];
  for (let i = 0; i < intensity.length; i++) {
    if (intensity[i] < eventThreshold) continue;

    const scores = { peak: peaks[i], record: records[i], inflection: inflections[i] };
    const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as MomentEvent['type'];
    const val = values[i];

    const labels: Record<string, string> = {
      peak: `Anomaly peak (${val.toFixed(1)})`,
      record: `Record high (${val.toFixed(1)})`,
      inflection: 'Trend reversal',
    };

    events.push({
      frame: i,
      score: Math.round(intensity[i] * 1000) / 1000,
      label: labels[dominant],
      type: dominant,
    });
  }

  return { intensity, events };
}

function detectPeaks(values: number[]): number[] {
  const n = values.length;
  if (n < 3) return new Array(n).fill(0);

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1;

  return values.map((v) => Math.max(0, Math.min(1, (v - mean) / (2 * std))));
}

function detectRecords(values: number[]): number[] {
  const scores = new Array(values.length).fill(0);
  let max = -Infinity;

  for (let i = 0; i < values.length; i++) {
    if (values[i] >= max) {
      max = values[i];
      scores[i] = 1;
    } else if (max !== 0) {
      scores[i] = Math.max(0, Math.min(1, (values[i] / max - 0.8) / 0.2));
    }
  }
  return scores;
}

function detectInflections(values: number[]): number[] {
  const n = values.length;
  if (n < 3) return new Array(n).fill(0);

  const diffs = [];
  for (let i = 1; i < n; i++) diffs.push(values[i] - values[i - 1]);

  const maxDiff = Math.max(...diffs.map(Math.abs)) || 1;
  const scores = new Array(n).fill(0);

  for (let i = 1; i < diffs.length; i++) {
    if (diffs[i - 1] * diffs[i] < 0) {
      scores[i + 1] = Math.min(1, Math.abs(diffs[i] - diffs[i - 1]) / (2 * maxDiff));
    }
  }
  return scores;
}

function smooth(values: number[], window: number): number[] {
  if (window <= 1) return [...values];
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const slice = values.slice(start, end);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}
