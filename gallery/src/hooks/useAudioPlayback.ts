import { useEffect, useRef, useState } from 'react';

const STEM_URLS = [
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

  // Create audio elements once
  useEffect(() => {
    if (!enabled || !theme || theme === '') {
      setAudioReady(false);
      audiosRef.current = [];
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

    let loaded = 0;
    audios.forEach((a) => {
      a.addEventListener('canplaythrough', () => {
        loaded++;
        if (loaded === audios.length) setAudioReady(true);
      }, { once: true });
      // Also handle load errors
      a.addEventListener('error', () => {
        console.warn('Audio stem failed to load:', a.src);
      }, { once: true });
    });

    return () => {
      audios.forEach((a) => {
        a.pause();
        a.src = '';
      });
      audiosRef.current = [];
      setAudioReady(false);
    };
  }, [theme, enabled]);

  // Play/pause + set initial volume
  useEffect(() => {
    const audios = audiosRef.current;
    if (!audios.length) return;

    if (isPlaying) {
      // Set initial volumes before playing
      const level = intensity[currentFrame] ?? 0;
      updateVolumes(audios, level, masterVolume);

      audios.forEach((a) => {
        a.play().catch((err) => {
          console.warn('Audio play blocked:', err.message);
        });
      });
    } else {
      audios.forEach((a) => a.pause());
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Crossfade volumes on frame change
  useEffect(() => {
    const audios = audiosRef.current;
    if (!audios.length || !isPlaying) return;

    const level = intensity[currentFrame] ?? 0;
    updateVolumes(audios, level, masterVolume);
  }, [currentFrame, intensity, masterVolume, isPlaying]);

  return { masterVolume, setMasterVolume, audioReady };
}

function updateVolumes(audios: HTMLAudioElement[], level: number, master: number) {
  const count = audios.length;
  const active = Math.min(count - 1, Math.floor(level * count));

  audios.forEach((a, i) => {
    let stemVol: number;
    if (i === active) stemVol = 1.0;
    else if (Math.abs(i - active) === 1) stemVol = 0.2;
    else stemVol = 0;
    a.volume = Math.min(1, stemVol * master);
  });
}
