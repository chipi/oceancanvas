import { useEffect, useRef } from 'react';

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
}

/**
 * Synthesizer-style waveform display — overlapping coloured waves
 * at different frequencies, amplitude driven by channel intensity.
 */
export function AudioWaveform({ channels, width = 280, height = 80, isPlaying }: Props) {
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
  }, [channels, width, height, isPlaying]);

  return <canvas ref={canvasRef} className="audio-waveform" />;
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
