import { useEffect, useRef, useState } from 'react';

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
  intensity: number[], // per-frame intensity [0-1]
  currentFrame: number,
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainsRef = useRef<GainNode[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const buffersRef = useRef<AudioBuffer[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load stems on mount / theme change
  useEffect(() => {
    if (!enabled || !theme) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    setLoaded(false);

    Promise.all(
      STEM_NAMES.map(async (name) => {
        const url = `/audio/themes/${theme}/${name}.wav`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          const buf = await resp.arrayBuffer();
          return ctx.decodeAudioData(buf);
        } catch {
          return null;
        }
      }),
    ).then((buffers) => {
      const valid = buffers.filter((b): b is AudioBuffer => b !== null);
      if (valid.length === 0) return;
      buffersRef.current = valid;

      // Create gain nodes for crossfading
      const gains = valid.map(() => {
        const g = ctx.createGain();
        g.gain.value = 0;
        g.connect(ctx.destination);
        return g;
      });
      gainsRef.current = gains;
      setLoaded(true);
    });

    return () => {
      sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
      ctx.close();
      ctxRef.current = null;
      gainsRef.current = [];
      sourcesRef.current = [];
      buffersRef.current = [];
      setLoaded(false);
    };
  }, [theme, enabled]);

  // Start/stop sources when playing changes
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !loaded) return;

    if (isPlaying) {
      // Start all stems looping, control volume via gains
      sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
      const sources = buffersRef.current.map((buf, i) => {
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.loop = true;
        source.connect(gainsRef.current[i]);
        source.start();
        return source;
      });
      sourcesRef.current = sources;
      if (ctx.state === 'suspended') ctx.resume();
    } else {
      sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
      sourcesRef.current = [];
    }
  }, [isPlaying, loaded]);

  // Update gains based on current intensity
  useEffect(() => {
    if (!loaded || gainsRef.current.length === 0) return;

    const level = intensity[currentFrame] ?? 0;
    const stemCount = gainsRef.current.length;
    const activeStem = Math.min(stemCount - 1, Math.floor(level * stemCount));

    gainsRef.current.forEach((g, i) => {
      const target = i === activeStem ? 0.8 : (Math.abs(i - activeStem) === 1 ? 0.2 : 0);
      g.gain.linearRampToValueAtTime(target, (ctxRef.current?.currentTime ?? 0) + 0.1);
    });
  }, [currentFrame, intensity, loaded]);

  return { loaded };
}
