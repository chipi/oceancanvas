import { useEffect, useRef } from 'react';
import type { ChannelKey, ChannelMix, EqBand, EqSettings } from '../lib/audioEngineTypes';

interface ChannelState {
  drone: number;    // 0-1 intensity
  pulse: number;    // 0-1 rate of change
  accent: boolean;  // firing now
  texture: number;  // 0-1 seasonal
}

interface Props {
  channels: ChannelState;
  width?: number;
  height?: number;
  isPlaying: boolean;
  mix?: ChannelMix;
  onMixChange?: (mix: ChannelMix) => void;
  eq?: EqSettings;
  onEqChange?: (eq: EqSettings) => void;
  /** Per-frame tension arc (RFC-011); painted as a faint guide line over the canvas. */
  arc?: number[];
  /** Current playback frame — used to position the live arc value indicator. */
  currentFrame?: number;
}

interface ChannelMeta {
  key: ChannelKey;
  label: string;
  color: string;
}

// Channel labelled "pad" since the engine voices it as a minor-triad chord pad now,
// not a single sustained drone. Internal key stays 'drone' for code stability.
const CHANNEL_META: ChannelMeta[] = [
  { key: 'drone',   label: 'pad',     color: 'rgba(93, 202, 165, 0.85)' },
  { key: 'pulse',   label: 'pulse',   color: 'rgba(239, 159, 39, 0.85)' },
  { key: 'accent',  label: 'accent',  color: 'rgba(216, 90, 48, 0.95)' },
  { key: 'texture', label: 'texture', color: 'rgba(93, 202, 165, 0.45)' },
];

const EQ_META: Array<{ key: EqBand; label: string }> = [
  { key: 'bass',   label: 'bass'   },
  { key: 'mid',    label: 'mid'    },
  { key: 'treble', label: 'treble' },
];

/**
 * Synthesizer-style waveform display + 4-channel mixer.
 *
 * The legend rows are interactive: click a label to mute/unmute a channel,
 * drag the slider beside it to set its volume. Mute toggles parent state via
 * `onMixChange`; the engine picks up the new mix and re-applies bus gains.
 */
export function AudioWaveform({
  channels, width = 280, height = 80, isPlaying,
  mix, onMixChange, eq, onEqChange,
  arc, currentFrame = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * 2; // retina
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    function draw() {
      if (!ctx) return;
      frameRef.current++;
      const t = frameRef.current * 0.03;

      // Clear with dark background
      ctx.fillStyle = 'rgba(3, 11, 16, 0.85)';
      ctx.fillRect(0, 0, width, height);

      const midY = height / 2;

      // Draw each channel as a wave
      // Drone — slow sine, teal, frequency follows intensity
      const droneFreq = 0.5 + channels.drone * 2;
      const droneAmp = channels.drone * midY * 0.6;
      drawWave(ctx, t, droneFreq, droneAmp, width, midY, 'rgba(93, 202, 165, 0.7)', 1.5);

      // Pulse — faster, amber, sharper waveform
      const pulseFreq = 2 + channels.pulse * 8;
      const pulseAmp = channels.pulse * midY * 0.4;
      drawWave(ctx, t * 1.3, pulseFreq, pulseAmp, width, midY, 'rgba(239, 159, 39, 0.6)', 1.2);

      // Texture — very slow, dim, wide
      const texFreq = 0.3 + channels.texture * 0.5;
      const texAmp = channels.texture * midY * 0.3;
      drawWave(ctx, t * 0.7, texFreq, texAmp, width, midY, 'rgba(93, 202, 165, 0.25)', 2);

      // Accent — bright flash burst when firing
      if (channels.accent) {
        const accentAmp = midY * 0.8;
        drawBurst(ctx, t, width, midY, accentAmp, 'rgba(216, 90, 48, 0.9)');
      }

      // Center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Tension arc overlay — faint guide showing the authored shape over time
      if (arc && arc.length > 1) {
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const stepX = width / (arc.length - 1);
        for (let i = 0; i < arc.length; i++) {
          const x = i * stepX;
          const y = (1 - clamp01(arc[i])) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Live indicator dot at currentFrame
        const idx = Math.max(0, Math.min(arc.length - 1, currentFrame));
        const x = idx * stepX;
        const y = (1 - clamp01(arc[idx])) * height;
        ctx.fillStyle = 'rgba(180, 220, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isPlaying) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    if (isPlaying) {
      draw();
    } else {
      // Draw static state
      draw();
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [channels, width, height, isPlaying, arc, currentFrame]);

  const mixInteractive = !!(mix && onMixChange);
  const eqInteractive = !!(eq && onEqChange);

  function updateMix(key: ChannelKey, patch: { volume?: number; muted?: boolean }) {
    if (!mix || !onMixChange) return;
    onMixChange({ ...mix, [key]: { ...mix[key], ...patch } });
  }

  function updateEq(key: EqBand, value: number) {
    if (!eq || !onEqChange) return;
    onEqChange({ ...eq, [key]: value });
  }

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
  const sliderStyle: React.CSSProperties = { flex: 1, height: 2, cursor: mixInteractive ? 'pointer' : 'default' };
  const labelBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'transparent', border: 'none', padding: 0,
    fontSize: 9, letterSpacing: '0.04em', fontFamily: 'inherit',
    minWidth: 44, textAlign: 'left',
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} />
      <div style={{
        marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr',
        columnGap: 14, fontSize: 9, letterSpacing: '0.04em',
        alignItems: 'stretch',
      }}>
        {/* Column 1 — channel mixer (4 stacked rows). justify-content spreads
            them to fill the same vertical room as the vertical EQ column. */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', alignItems: 'stretch',
          padding: '4px 0',
        }}>
          {CHANNEL_META.map((c) => {
            const cm = mix?.[c.key];
            const muted = !!cm?.muted;
            const volume = cm?.volume ?? 1;
            return (
              <div key={c.key} style={rowStyle}>
                <button
                  type="button"
                  onClick={() => mixInteractive && updateMix(c.key, { muted: !muted })}
                  disabled={!mixInteractive}
                  title={mixInteractive ? (muted ? 'unmute' : 'mute') : undefined}
                  style={{
                    ...labelBase,
                    cursor: mixInteractive ? 'pointer' : 'default',
                    color: muted ? 'rgba(255,255,255,0.25)' : c.color,
                    textDecoration: muted ? 'line-through' : 'none',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: muted ? 'rgba(255,255,255,0.15)' : c.color,
                    display: 'inline-block',
                  }} />
                  {c.label}
                </button>
                <input
                  type="range" min={0} max={1.5} step={0.05} value={volume}
                  disabled={!mixInteractive || muted}
                  onChange={(e) => updateMix(c.key, { volume: parseFloat(e.target.value) })}
                  style={{ ...sliderStyle, opacity: muted ? 0.3 : 0.85 }}
                />
              </div>
            );
          })}
        </div>

        {/* Column 2 — 3-band EQ (bass / mid / treble), gain in dB [-12..+12].
            Vertical sliders side-by-side: the column doesn't have horizontal
            room for three labelled rows, but it has plenty of vertical room. */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4, alignItems: 'end',
        }}>
          {EQ_META.map((band) => {
            const value = eq?.[band.key] ?? 0;
            return (
              <div key={band.key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{
                  fontSize: 9, letterSpacing: '0.04em',
                  color: 'rgba(180, 200, 220, 0.7)',
                }}>{band.label}</span>
                <input
                  type="range" min={-12} max={12} step={0.5} value={value}
                  disabled={!eqInteractive}
                  onChange={(e) => updateEq(band.key, parseFloat(e.target.value))}
                  style={{
                    writingMode: 'vertical-lr', direction: 'rtl',
                    WebkitAppearance: 'slider-vertical',
                    width: 14, height: 56, opacity: 0.85,
                    cursor: eqInteractive ? 'pointer' : 'default',
                  } as React.CSSProperties}
                />
                <span style={{
                  fontSize: 8, color: 'rgba(180, 200, 220, 0.55)',
                  fontFamily: 'ui-monospace, monospace',
                }}>
                  {value > 0 ? '+' : ''}{value.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  time: number,
  freq: number,
  amp: number,
  width: number,
  midY: number,
  color: string,
  lineWidth: number,
) {
  if (amp < 0.5) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const phase = (x / width) * Math.PI * 2 * freq + time;
    // Mix sine + slight harmonic for richer look
    const y = midY + Math.sin(phase) * amp + Math.sin(phase * 2.01) * amp * 0.15;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawBurst(
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  midY: number,
  amp: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const xn = x / width;
    // Decaying burst from center
    const envelope = Math.exp(-Math.abs(xn - 0.5) * 8);
    const phase = xn * Math.PI * 2 * 12 + time * 5;
    const y = midY + Math.sin(phase) * amp * envelope;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
