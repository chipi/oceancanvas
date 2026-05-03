import { useEffect, useRef } from 'react';

const STEM_NAMES = [
  'stem_0_calm',
  'stem_1_breathing',
  'stem_2_present',
  'stem_3_swelling',
  'stem_4_apex',
];

/**
 * Audio playback hook — plays stems based on intensity signal.
 *
 * Loads 5 WAV stems, crossfades between them based on the current
 * intensity value [0-1]. Uses Web Audio API for gapless switching.
 */
export function useAudioPlayback(
  theme: string,
  enabled: boolean,
  isPlaying: boolean,
  intensity: number[],
  currentFrame: number,
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainsRef = useRef<GainNode[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const buffersRef = useRef<AudioBuffer[]>([]);
  const loadedRef = useRef(false);

  // Load stems once
  useEffect(() => {
    if (!enabled || !theme) {
      loadedRef.current = false;
      return;
    }

    let cancelled = false;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    Promise.all(
      STEM_NAMES.map(async (name) => {
        try {
          const resp = await fetch(`/audio/themes/${theme}/${name}.wav`);
          if (!resp.ok) return null;
          const buf = await resp.arrayBuffer();
          return await ctx.decodeAudioData(buf);
        } catch {
          return null;
        }
      }),
    ).then((buffers) => {
      if (cancelled) return;
      const valid = buffers.filter((b): b is AudioBuffer => b !== null);
      if (valid.length === 0) return;
      buffersRef.current = valid;

      const gains = valid.map(() => {
        const g = ctx.createGain();
        g.gain.value = 0;
        g.connect(ctx.destination);
        return g;
      });
      gainsRef.current = gains;
      loadedRef.current = true;
    }).catch(() => {
      // Audio loading failed — continue without audio
      loadedRef.current = false;
    });

    return () => {
      cancelled = true;
      loadedRef.current = false;
      // Stop all sources
      sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
      sourcesRef.current = [];
      gainsRef.current = [];
      buffersRef.current = [];
      // Close context last
      try { ctx.close(); } catch {}
      ctxRef.current = null;
    };
  }, [theme, enabled]);

  // Start/stop playback
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !loadedRef.current) return;

    if (isPlaying) {
      // Resume context (browsers suspend until user interaction)
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      // Stop existing sources
      sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });

      // Start all stems looping
      try {
        const sources = buffersRef.current.map((buf, i) => {
          const source = ctx.createBufferSource();
          source.buffer = buf;
          source.loop = true;
          source.connect(gainsRef.current[i]);
          source.start();
          return source;
        });
        sourcesRef.current = sources;
      } catch {
        // Audio playback failed — silent fallback
        sourcesRef.current = [];
      }
    } else {
      sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
      sourcesRef.current = [];
    }
  }, [isPlaying]);

  // Update gains based on current intensity
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !loadedRef.current || gainsRef.current.length === 0) return;

    const level = intensity[currentFrame] ?? 0;
    const stemCount = gainsRef.current.length;
    const activeStem = Math.min(stemCount - 1, Math.floor(level * stemCount));

    try {
      const now = ctx.currentTime;
      gainsRef.current.forEach((g, i) => {
        const target = i === activeStem ? 0.8 : (Math.abs(i - activeStem) === 1 ? 0.2 : 0);
        g.gain.linearRampToValueAtTime(target, now + 0.1);
      });
    } catch {
      // Gain update failed — ignore
    }
  }, [currentFrame, intensity]);
}
