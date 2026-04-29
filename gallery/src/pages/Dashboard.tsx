import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';

interface SstMeta {
  date: string;
  source_id: string;
  min: number;
  max: number;
  mean: number;
  nan_pct: number;
}

function useSstData() {
  const [meta, setMeta] = useState<SstMeta | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Find latest date from manifest, then load meta
    fetch('/renders/manifest.json')
      .then((r) => r.json())
      .then((manifest) => {
        const oisst = manifest.recipes?.['north-atlantic-sst'];
        if (oisst?.latest) {
          setLatestDate(oisst.latest);
          return fetch(`/data/processed/oisst/${oisst.latest}.meta.json`);
        }
        // Fallback: try a known date pattern
        return null;
      })
      .then((r) => r?.json())
      .then((m) => { if (m) setMeta(m); })
      .catch((e) => setError(e.message));
  }, []);

  return { meta, latestDate, error };
}

export function Dashboard() {
  const { meta, latestDate, error } = useSstData();
  const [hoverCoords, setHoverCoords] = useState<string | null>(null);

  if (error) {
    return <div className={styles.page}><div className={styles.error}>Data unavailable: {error}</div></div>;
  }

  const anomaly = meta ? Math.round((meta.mean - 14.0) * 10) / 10 : null; // rough climatology baseline

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <span className={styles.topbarPath}>
          /sea surface temperature <span className={styles.topbarMuted}>⊓ NOAA OISST</span>
        </span>
        <span className={styles.topbarTime}>{latestDate || ''} / 06:00 UTC</span>
      </header>

      <div className={styles.body}>
        {/* Source rail */}
        <nav className={styles.sourceRail}>
          <div className={styles.sourceActive}>SST</div>
          <div className={styles.sourceLabel}>sea surface temp</div>
          <div className={styles.sourceInactive}>Sea level</div>
          <div className={styles.sourceInactive}>Salinity</div>
          <div className={styles.sourceInactive}>Sea ice</div>
          <div className={styles.sourceInactive}>Chlorophyll</div>
        </nav>

        {/* Map area */}
        <div className={styles.mapArea}>
          {latestDate ? (
            <img
              className={styles.heatmap}
              src={`/data/processed/oisst/${latestDate}.png`}
              alt="SST heatmap"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width);
                const y = ((e.clientY - rect.top) / rect.height);
                const lat = (75 - y * 55).toFixed(1);
                const lon = (-90 + x * 100).toFixed(1);
                setHoverCoords(`${lat}°N  ${lon}°W`);
              }}
              onMouseLeave={() => setHoverCoords(null)}
            />
          ) : (
            <div className={styles.loading}>Loading SST data...</div>
          )}

          {/* Hover coordinates */}
          {hoverCoords && (
            <div className={styles.hoverCoords}>{hoverCoords}</div>
          )}

          {/* Legend strip */}
          <div className={styles.legend}>
            <span className={styles.legendLabel}>{meta ? `${Math.round(meta.max)}°C` : ''}</span>
            <div className={styles.legendBar} />
            <span className={styles.legendLabel}>{meta ? `${Math.round(meta.min)}°C` : ''}</span>
          </div>

          {/* Stats overlay */}
          {meta && (
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta.mean.toFixed(1)}°</div>
                <div className={styles.statLabel}>REGION MEAN</div>
                {anomaly !== null && (
                  <div className={anomaly >= 0 ? styles.statAnomaly : styles.statAnomalyCool}>
                    {anomaly >= 0 ? '+' : ''}{anomaly.toFixed(1)}° vs climatology
                  </div>
                )}
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta.max.toFixed(1)}°</div>
                <div className={styles.statLabel}>REGION MAX</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta.min.toFixed(1)}°</div>
                <div className={styles.statLabel}>REGION MIN</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Citation footer */}
      <footer className={styles.citation}>
        NOAA OISST · 0.25° · DAILY · 1981–2026 · OceanCanvas
      </footer>
    </div>
  );
}
