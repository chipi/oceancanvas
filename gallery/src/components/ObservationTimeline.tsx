import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

interface TimePoint {
  date: string;
  count: number;
}

interface Props {
  data: TimePoint[];
  label?: string;
  color?: string;
  width?: number;
  height?: number;
}

/**
 * Observation count over time — works for any source.
 * Shows how data density changes across the historical record.
 */
export function ObservationTimeline({
  data,
  label = 'Observations',
  color = '#5DCAA5',
  width = 600,
  height = 200,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const parsed = data.map((d) => ({
      date: new Date(d.date),
      count: d.count,
    }));

    const chart = Plot.plot({
      width,
      height,
      marginLeft: 50,
      marginBottom: 30,
      style: {
        background: 'transparent',
        color: 'rgba(220,230,240,0.85)',
        fontSize: '10px',
      },
      x: { label: null, type: 'utc' },
      y: { label, grid: true },
      marks: [
        Plot.barY(parsed, {
          x: 'date',
          y: 'count',
          fill: color,
          fillOpacity: 0.6,
        } as Record<string, unknown>),
        Plot.lineY(parsed, Plot.windowY(3, {
          x: 'date',
          y: 'count',
          stroke: '#EF9F27',
          strokeWidth: 1.5,
        })),
        Plot.ruleY([0]),
      ],
    });

    ref.current.replaceChildren(chart);
    return () => { chart.remove(); };
  }, [data, label, color, width, height]);

  return <div ref={ref} />;
}
