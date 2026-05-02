import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './TimelineScrubber.module.css';

interface Props {
  dates: string[];
  selected: string;
  recipeName: string;
  onSelect: (date: string) => void;
}

/**
 * Timeline scrubber for browsing historical renders.
 * Shows a slider + thumbnail strip spanning the full date range.
 */
export function TimelineScrubber({ dates, selected, recipeName, onSelect }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<number | null>(null);

  const selectedIdx = dates.indexOf(selected);

  // Scroll the selected thumbnail into view
  useEffect(() => {
    if (!stripRef.current) return;
    const thumb = stripRef.current.children[selectedIdx] as HTMLElement;
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedIdx]);

  // Playback
  useEffect(() => {
    if (!isPlaying) return;
    playRef.current = window.setInterval(() => {
      onSelect(dates[(dates.indexOf(selected) + 1) % dates.length]);
    }, 300);
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, selected, dates, onSelect]);

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSelect(dates[parseInt(e.target.value, 10)]);
    },
    [dates, onSelect],
  );

  const handlePrev = useCallback(() => {
    if (selectedIdx > 0) onSelect(dates[selectedIdx - 1]);
  }, [selectedIdx, dates, onSelect]);

  const handleNext = useCallback(() => {
    if (selectedIdx < dates.length - 1) onSelect(dates[selectedIdx + 1]);
  }, [selectedIdx, dates, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') { e.preventDefault(); setIsPlaying((p) => !p); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePrev, handleNext]);

  const startYear = dates[0]?.substring(0, 4) || '';
  const endYear = dates[dates.length - 1]?.substring(0, 4) || '';

  return (
    <div className={styles.scrubber}>
      {/* Controls row */}
      <div className={styles.controls}>
        <button className={styles.btn} onClick={handlePrev} disabled={selectedIdx <= 0}>
          ◀
        </button>
        <button className={styles.btn} onClick={() => setIsPlaying((p) => !p)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className={styles.btn} onClick={handleNext} disabled={selectedIdx >= dates.length - 1}>
          ▶
        </button>
        <span className={styles.dateLabel}>{selected}</span>
        <span className={styles.countLabel}>
          {selectedIdx + 1} / {dates.length}
        </span>
      </div>

      {/* Slider */}
      <div className={styles.sliderRow}>
        <span className={styles.yearLabel}>{startYear}</span>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={dates.length - 1}
          value={selectedIdx >= 0 ? selectedIdx : 0}
          onChange={handleSlider}
        />
        <span className={styles.yearLabel}>{endYear}</span>
      </div>

      {/* Thumbnail strip */}
      <div className={styles.strip} ref={stripRef}>
        {dates.map((date) => (
          <button
            key={date}
            className={`${styles.thumb} ${date === selected ? styles.thumbActive : ''}`}
            onClick={() => onSelect(date)}
            title={date}
          >
            <img
              src={`/renders/${recipeName}/${date}.png`}
              alt={date}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
