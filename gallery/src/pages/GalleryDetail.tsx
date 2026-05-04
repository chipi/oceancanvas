import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { useManifest } from '../hooks/useManifest';
import { getSourceInfo } from '../lib/sourceInfo';
import styles from './GalleryDetail.module.css';

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.opacity = '0.3';
}

export function GalleryDetail() {
  const { recipe } = useParams<{ recipe: string }>();
  const navigate = useNavigate();
  const { manifest } = useManifest();

  const entry = manifest?.recipes?.[recipe || ''];
  const source = getSourceInfo(entry?.source || '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Default to latest date
  useEffect(() => {
    if (entry?.latest && !selectedDate) setSelectedDate(entry.latest);
  }, [entry, selectedDate]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') navigate('/');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  if (!entry) {
    return (
      <div className={styles.page}>
        <header className={styles.topbar}>
          <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        </header>
        <div className={styles.empty}>Recipe not found</div>
      </div>
    );
  }

  const displayDate = selectedDate || entry.latest;
  const renderUrl = `/renders/${entry.name}/${displayDate}.png`;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <div className={styles.actions}>
          <a href="/" className={styles.action}>← gallery</a>
          <a href={`/recipes/${entry.name}`} className={styles.action}>recipe ↗</a>
          <a href={`/timelapse/${entry.name}`} className={styles.action}>timelapse ↗</a>
          <a
            href={renderUrl}
            download={`${entry.name}_${displayDate}_oceancanvas.png`}
            className={styles.actionPrimary}
          >
            download
          </a>
        </div>
      </header>

      {/* Main body: render+strip left, context right */}
      <div className={styles.body}>
        {/* Left column: render + strip */}
        <div className={styles.leftCol}>
          <div className={styles.renderArea}>
            <img
              className={styles.renderImage}
              src={renderUrl}
              alt={`${entry.name} — ${displayDate}`}
              onError={handleImgError}
            />
            <div className={styles.overlay}>
              <div className={styles.recipeName}>{entry.name}</div>
              <div className={styles.recipeMeta}>
                {entry.render_type} · {entry.count} render{entry.count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Timeline scrubber — browse all historical renders */}
          {entry.dates.length > 1 && (
            <TimelineScrubber
              dates={entry.dates}
              selected={displayDate}
              recipeName={entry.name}
              onSelect={handleDateSelect}
            />
          )}
        </div>

        {/* Context panel */}
        <aside className={styles.context}>
          {source && (
            <>
              <div className={styles.contextSection}>
                <div className={styles.contextLabel}>ABOUT THIS DATA</div>
                <div className={styles.contextTitle}>{source.name}</div>
                <div className={styles.contextAgency}>{source.agency}</div>
                <p className={styles.contextBody}>{source.description}</p>
              </div>

              <div className={styles.contextSection}>
                <div className={styles.contextLabel}>RESOLUTION</div>
                <div className={styles.contextValue}>{source.resolution}</div>
              </div>

              <div className={styles.contextSection}>
                <div className={styles.contextLabel}>COVERAGE</div>
                <div className={styles.contextValue}>{source.coverage}</div>
              </div>
            </>
          )}

          <div className={styles.contextSection}>
            <div className={styles.contextLabel}>RECIPE</div>
            <div className={styles.contextValue}>{entry.name}</div>
            <div className={styles.contextDetail}>
              {entry.render_type} · {entry.source} · {entry.latest}
            </div>
          </div>

          {source && (
            <div className={styles.contextSection}>
              <div className={styles.contextLabel}>SOURCE</div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contextLink}
              >
                {source.url.replace('https://', '')}
              </a>
              <div className={styles.contextDetail}>{source.license}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
