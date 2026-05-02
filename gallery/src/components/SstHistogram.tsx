import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

interface Props {
  data: number[];
  nanValue?: number;
  width?: number;
  height?: number;
}

/**
 * SST distribution histogram using Observable Plot.
 * Shows temperature frequency across the current view region.
 */
export function SstHistogram({ data, nanValue = -999, width = 500, height = 200 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    // Filter out NaN placeholders
    const valid = data.filter((v) => v !== nanValue);
    if (!valid.length) return;

    const chart = Plot.plot({
      width,
      height,
      marginLeft: 40,
      marginBottom: 30,
      style: {
        background: 'transparent',
        color: 'rgba(220,230,240,0.85)',
        fontSize: '10px',
      },
      x: {
        label: '°C',
        tickFormat: (d: number) => `${d}°`,
      },
      y: {
        label: 'Frequency',
        grid: true,
      },
      marks: [
        Plot.rectY(
          valid,
          Plot.binX(
            { y: 'count' },
            {
              x: (d: number) => d,
              thresholds: 40,
              fill: 'rgba(93, 202, 165, 0.6)' as unknown as string,
            } as Record<string, unknown>,
          ),
        ),
        Plot.ruleY([0]),
      ],
    });

    containerRef.current.replaceChildren(chart);

    return () => {
      chart.remove();
    };
  }, [data, nanValue, width, height]);

  return <div ref={containerRef} />;
}
