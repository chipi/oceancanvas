import { useEffect, useRef, useState } from 'react';

const STEM_NAMES = [
  'stem_0_calm.mp3',
  'stem_1_breathing.mp3',
  'stem_2_present.mp3',
  'stem_3_swelling.mp3',
  'stem_4_apex.mp3',
];

/**
 * Audio playback hook — plays stems using HTML5 Audio elements.
 * Returns master volume state + setter for UI control.
 */
export function useAudioPlayback(
  theme: string,
  enabled: boolean,
  isPlaying: boolean,
  intensity: number[],
  currentFrame: number,
) {
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [audioReady, setAudioReady] = useState(false);
  const mountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Create audio elements
  useEffect(() => {
    // Clean previous
    audiosRef.current.forEach((a) => { a.pause(); a.removeAttribute('src'); a.load(); });
    audiosRef.current = [];
    setAudioReady(false);

    if (!enabled || !theme) return;

    const baseUrl = `/audio/themes/${theme}/`;
    const audios: HTMLAudioElement[] = [];
    let loadCount = 0;

    for (const name of STEM_NAMES) {
      const a = new Audio();
      a.loop = true;
      a.volume = 0;
      a.preload = 'auto';
      a.addEventListener('canplaythrough', () => {
        loadCount++;
        if (loadCount === STEM_NAMES.length && mountedRef.current) {
          setAudioReady(true);
        }
      }, { once: true });
      a.src = baseUrl + name;
      audios.push(a);
    }

    audiosRef.current = audios;

    return () => {
      audios.forEach((a) => {
        a.pause();
        a.removeAttribute('src');
        a.load();
      });
    };
  }, [theme, enabled]);

  // Play/pause
  useEffect(() => {
    const audios = audiosRef.current;
    if (!audios.length) return;

    if (isPlaying && audioReady) {
      // Set volumes before play
      const level = intensity[currentFrame] ?? 0;
      setVolumes(audios, level, masterVolume);
      audios.forEach((a) => a.play().catch(() => {}));
    } else {
      audios.forEach((a) => a.pause());
    }
  }, [isPlaying, audioReady]); // eslint-disable-line

  // Crossfade on frame change
  useEffect(() => {
    if (!isPlaying || !audiosRef.current.length) return;
    const level = intensity[currentFrame] ?? 0;
    setVolumes(audiosRef.current, level, masterVolume);
  }, [currentFrame, masterVolume]); // eslint-disable-line

  return { masterVolume, setMasterVolume, audioReady };
}

function setVolumes(audios: HTMLAudioElement[], level: number, master: number) {
  const count = audios.length;
  const active = Math.min(count - 1, Math.floor(level * count));
  audios.forEach((a, i) => {
    const w = i === active ? 1.0 : Math.abs(i - active) === 1 ? 0.2 : 0;
    a.volume = Math.min(1, w * master);
  });
}
