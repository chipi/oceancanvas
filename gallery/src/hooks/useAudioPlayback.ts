import { useEffect, useRef } from 'react';

const STEM_URLS = [
  'stem_0_calm.mp3',
  'stem_1_breathing.mp3',
  'stem_2_present.mp3',
  'stem_3_swelling.mp3',
  'stem_4_apex.mp3',
];

/**
 * Audio playback hook — plays stems using HTML5 Audio elements.
 * All stems loop simultaneously; volume crossfades based on intensity.
 */
export function useAudioPlayback(
  theme: string,
  enabled: boolean,
  isPlaying: boolean,
  intensity: number[],
  currentFrame: number,
) {
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const readyRef = useRef(false);

  // Create audio elements once
  useEffect(() => {
    if (!enabled || !theme) {
      readyRef.current = false;
      return;
    }

    const audios = STEM_URLS.map((name) => {
      const a = new Audio(`/audio/themes/${theme}/${name}`);
      a.loop = true;
      a.volume = 0;
      a.preload = 'auto';
      return a;
    });
    audiosRef.current = audios;

    // Wait for all to be loadable
    let loaded = 0;
    audios.forEach((a) => {
      a.addEventListener('canplaythrough', () => {
        loaded++;
        if (loaded === audios.length) readyRef.current = true;
      }, { once: true });
    });

    return () => {
      audios.forEach((a) => {
        a.pause();
        a.src = '';
      });
      audiosRef.current = [];
      readyRef.current = false;
    };
  }, [theme, enabled]);

  // Play/pause all stems together
  useEffect(() => {
    const audios = audiosRef.current;
    if (!audios.length) return;

    if (isPlaying) {
      audios.forEach((a) => {
        a.play().catch(() => {});
      });
    } else {
      audios.forEach((a) => a.pause());
    }
  }, [isPlaying]);

  // Crossfade volumes based on intensity
  useEffect(() => {
    const audios = audiosRef.current;
    if (!audios.length) return;

    const level = intensity[currentFrame] ?? 0;
    const count = audios.length;
    const active = Math.min(count - 1, Math.floor(level * count));

    audios.forEach((a, i) => {
      if (i === active) a.volume = 0.7;
      else if (Math.abs(i - active) === 1) a.volume = 0.15;
      else a.volume = 0;
    });
  }, [currentFrame, intensity]);
}
