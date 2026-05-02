import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

interface MonthlyPoint {
  date: string;
  mean: number;
  min: number;
  max: number;
}

interface Props {
  data: MonthlyPoint[];
  baseline?: number;
  width?: number;
  height?: number;
}

/**
 * SST anomaly time series — monthly mean with climatological baseline.
 * Shows 45-year warming trend with anomaly shading.
 */
export function SstTimeSeries({ data, baseline = 13.8, width = 600, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const parsed = data.map((d) => ({
      date: new Date(d.date),
      mean: d.mean,
      anomaly: d.mean - baseline,
    }));

    const chart = Plot.plot({
      width,
      height,
      marginLeft: 45,
      marginBottom: 30,
      style: {
        background: 'transparent',
        color: 'rgba(220,230,240,0.85)',
        fontSize: '10px',
      },
      x: { label: null, type: 'utc' },
      y: { label: '°C', grid: true },
      color: {
        domain: [-2, 0, 2],
        range: ['#042C53', '#5DCAA5', '#D85A30'],
        type: 'linear',
      },
      marks: [
        Plot.ruleY([baseline], { stroke: 'rgba(255,255,255,0.3)', strokeDasharray: '4,4' }),
        Plot.dot(parsed, {
          x: 'date',
          y: 'mean',
          r: 1.5,
          fill: 'anomaly',
          stroke: 'none',
        } as Record<string, unknown>),
        Plot.lineY(parsed, Plot.windowY(12, {
          x: 'date',
          y: 'mean',
          stroke: '#EF9F27',
          strokeWidth: 1.5,
        })),
        Plot.ruleY([0]),
      ],
    });

    containerRef.current.replaceChildren(chart);
    return () => { chart.remove(); };
  }, [data, baseline, width, height]);

  return <div ref={containerRef} />;
}
