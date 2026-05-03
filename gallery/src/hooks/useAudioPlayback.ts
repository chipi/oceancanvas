import { useEffect, useRef, useState } from 'react';

const STEM_NAMES = [
  'stem_0_calm.mp3',
  'stem_1_breathing.mp3',
  'stem_2_present.mp3',
  'stem_3_swelling.mp3',
  'stem_4_apex.mp3',
];

/**
 * Audio playback hook — fetches stems as blobs then plays via Audio elements.
 * Uses the same fetch→blob→objectURL approach proven in audio-test.html.
 */
export function useAudioPlayback(
  theme: string,
  enabled: boolean,
  isPlaying: boolean,
  intensity: number[],
  currentFrame: number,
) {
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [audioReady, setAudioReady] = useState(false);

  // Fetch stems as blobs and create Audio elements
  useEffect(() => {
    audiosRef.current.forEach((a) => a.pause());
    audiosRef.current = [];
    setAudioReady(false);

    if (!enabled || !theme) return;

    let cancelled = false;

    Promise.all(
      STEM_NAMES.map((name) =>
        fetch(`/audio/themes/${theme}/${name}`)
          .then((r) => r.blob())
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = new Audio(url);
            a.loop = true;
            a.volume = 0;
            return a;
          })
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const audios = results.filter((a): a is HTMLAudioElement => a !== null);
      if (audios.length === 0) return;
      audiosRef.current = audios;
      setAudioReady(true);
    });

    return () => {
      cancelled = true;
      audiosRef.current.forEach((a) => a.pause());
      audiosRef.current = [];
    };
  }, [theme, enabled]);

  // Play/pause
  useEffect(() => {
    const audios = audiosRef.current;
    if (!audios.length || !audioReady) return;

    if (isPlaying) {
      const level = intensity[currentFrame] ?? 0;
      applyVolumes(audios, level, masterVolume);
      audios.forEach((a) => a.play().catch(() => {}));
    } else {
      audios.forEach((a) => a.pause());
    }
  }, [isPlaying, audioReady]); // eslint-disable-line

  // Crossfade on frame change
  useEffect(() => {
    if (!isPlaying || !audiosRef.current.length) return;
    applyVolumes(audiosRef.current, intensity[currentFrame] ?? 0, masterVolume);
  }, [currentFrame, masterVolume]); // eslint-disable-line

  return { masterVolume, setMasterVolume, audioReady };
}

function applyVolumes(audios: HTMLAudioElement[], level: number, master: number) {
  const count = audios.length;
  // Min stem 1 — stem 0 is too quiet to hear
  const active = Math.max(1, Math.min(count - 1, Math.floor(level * count)));
  audios.forEach((a, i) => {
    const w = i === active ? 1.0 : Math.abs(i - active) === 1 ? 0.3 : 0;
    a.volume = Math.min(1, w * master);
  });
}
