import { type SyntheticEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  const renderUrl = `/renders/${entry.name}/${entry.latest}.png`;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <div className={styles.actions}>
          <a href="/" className={styles.action}>← gallery</a>
          <a href={`/timelapse/${entry.name}`} className={styles.action}>timelapse ↗</a>
          <a href={`/recipes/${entry.name}`} className={styles.action}>recipe ↗</a>
          <a
            href={renderUrl}
            download={`${entry.name}_${entry.latest}_oceancanvas.png`}
            className={styles.actionPrimary}
          >
            download
          </a>
        </div>
      </header>

      {/* Main body: render + context panel */}
      <div className={styles.body}>
        {/* Render area */}
        <div className={styles.renderArea}>
          <img
            className={styles.renderImage}
            src={renderUrl}
            alt={`${entry.name} — ${entry.latest}`}
            onError={handleImgError}
          />
          <div className={styles.overlay}>
            <div className={styles.recipeName}>{entry.name}</div>
            <div className={styles.recipeMeta}>
              {entry.render_type} · {entry.count} render{entry.count !== 1 ? 's' : ''}
            </div>
          </div>
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

      {/* 14-day strip */}
      {entry.dates.length > 0 && (
        <div className={styles.strip}>
          <div className={styles.stripLabel}>
            LAST {Math.min(14, entry.dates.length)} DAYS
          </div>
          <div className={styles.stripRow}>
            {entry.dates.slice(-14).map((date) => (
              <div key={date} className={`${styles.stripThumb} ${date === entry.latest ? styles.stripActive : ''}`}>
                <img
                  src={`/renders/${entry.name}/${date}.png`}
                  alt={date}
                  title={date}
                  loading="lazy"
                  onError={handleImgError}
                />
                <span className={styles.stripDate}>{date.substring(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
