/**
 * ArcEditor — RFC-011 §"Recipe schema" / PRD-006 §"The experience".
 *
 * Small SVG curve editor that lets the recipe author pick a tension-arc
 * preset and drag the peak. Lives beside the mixer + EQ in the Video Editor
 * audio sidebar block.
 *
 * The curve preview is computed via the same `expandArc()` function the audio
 * engine and pipeline use, so what the author sees is exactly what plays
 * back — no drift between editor preview and engine output.
 */

import { useCallback, useMemo, useRef } from 'react';
import {
  type ArcPreset,
  type TensionArcSpec,
  expandArc,
} from '../lib/tensionArc';
import styles from './ArcEditor.module.css';

interface Props {
  spec: TensionArcSpec;
  onChange: (spec: TensionArcSpec) => void;
  totalFrames: number;
  dominantMomentFrame: number | null;
}

interface PresetMeta {
  id: ArcPreset;
  label: string;
  hint: string;
}

const PRESETS: PresetMeta[] = [
  { id: 'classic',  label: 'classic',  hint: 'build → peak → resolve' },
  { id: 'plateau',  label: 'plateau',  hint: 'rise → hold → drop' },
  { id: 'drift',    label: 'drift',    hint: 'undulating, no peak' },
  { id: 'invert',   label: 'invert',   hint: 'tense start, early release' },
  { id: 'none',     label: 'none',     hint: 'flat — no arc' },
];

const VIEW_W = 280;
const VIEW_H = 50;
const SAMPLE_COUNT = 60;  // dense enough for a smooth preview, cheap to compute

export function ArcEditor({ spec, onChange, totalFrames, dominantMomentFrame }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  // Compute the preview curve: 60 samples expanded via the canonical expandArc.
  const pathD = useMemo(() => buildPath(spec, dominantMomentFrame), [spec, dominantMomentFrame]);

  // Effective peak position (after pin_key_moment override) — drives where the handle sits.
  const effectivePeak = useMemo(() => {
    if (
      spec.pin_key_moment &&
      dominantMomentFrame !== null &&
      totalFrames > 1
    ) {
      return Math.max(0.05, Math.min(0.95, dominantMomentFrame / (totalFrames - 1)));
    }
    return spec.peak_position;
  }, [spec, dominantMomentFrame, totalFrames]);

  const handleX = effectivePeak * VIEW_W;
  const handleY = (1 - spec.peak_height) * VIEW_H;
  const isDisabled = spec.preset === 'none';

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg || isDisabled) return;
      const rect = svg.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const newPosition = clamp(x, 0.05, 0.95);
      const newHeight = clamp(1 - y, 0.1, 1.0);
      // Disable pin when user drags — manual override of the auto-pinned peak
      onChange({
        ...spec,
        peak_position: round(newPosition, 2),
        peak_height: round(newHeight, 2),
        pin_key_moment: false,
      });
    },
    [spec, onChange, isDisabled],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (isDisabled) return;
      draggingRef.current = true;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer, isDisabled],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current) return;
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );
  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      draggingRef.current = false;
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    },
    [],
  );

  // Keyboard accessibility — arrow keys nudge the peak.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (isDisabled) return;
      const step = e.shiftKey ? 0.1 : 0.02;
      let next = spec;
      if (e.key === 'ArrowLeft')  next = { ...spec, peak_position: clamp(spec.peak_position - step, 0.05, 0.95), pin_key_moment: false };
      else if (e.key === 'ArrowRight') next = { ...spec, peak_position: clamp(spec.peak_position + step, 0.05, 0.95), pin_key_moment: false };
      else if (e.key === 'ArrowUp')    next = { ...spec, peak_height:   clamp(spec.peak_height + step, 0.1, 1.0) };
      else if (e.key === 'ArrowDown')  next = { ...spec, peak_height:   clamp(spec.peak_height - step, 0.1, 1.0) };
      else return;
      e.preventDefault();
      onChange({ ...next, peak_position: round(next.peak_position, 2), peak_height: round(next.peak_height, 2) });
    },
    [spec, onChange, isDisabled],
  );

  return (
    <div className={styles.editor}>
      <svg
        ref={svgRef}
        className={`${styles.canvas} ${isDisabled ? styles.canvasDisabled : ''}`}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={isDisabled ? -1 : 0}
        role="slider"
        aria-label="Tension arc peak"
        aria-valuemin={0.05}
        aria-valuemax={0.95}
        aria-valuenow={effectivePeak}
      >
        {/* Mid-line guide */}
        <line x1={0} y1={VIEW_H / 2} x2={VIEW_W} y2={VIEW_H / 2} className={styles.midline} />
        {/* Curve */}
        <path d={pathD} className={styles.curve} fill="none" />
        {/* Peak handle */}
        {!isDisabled && (
          <circle
            cx={handleX}
            cy={handleY}
            r={5}
            className={styles.handle}
            pointerEvents="none"
          />
        )}
      </svg>

      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.pill} ${spec.preset === p.id ? styles.pillActive : ''}`}
            onClick={() => onChange({ ...spec, preset: p.id })}
            title={p.hint}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!isDisabled && dominantMomentFrame !== null && (
        <label className={styles.pinRow}>
          <input
            type="checkbox"
            checked={spec.pin_key_moment ?? false}
            onChange={(e) => onChange({ ...spec, pin_key_moment: e.target.checked })}
          />
          <span>pin peak to record moment (frame {dominantMomentFrame})</span>
        </label>
      )}
    </div>
  );
}

function buildPath(spec: TensionArcSpec, dominantMomentFrame: number | null): string {
  const arc = expandArc(spec, SAMPLE_COUNT, dominantMomentFrame);
  const dx = VIEW_W / Math.max(1, SAMPLE_COUNT - 1);
  const points = arc.map((v, i) => `${(i * dx).toFixed(2)},${((1 - clamp(v, 0, 1)) * VIEW_H).toFixed(2)}`);
  return `M ${points[0]} L ${points.slice(1).join(' L ')}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}
