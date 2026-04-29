import { useEffect, useState } from 'react';
import styles from './DashboardSpread.module.css';

interface SstMeta {
  date: string;
  source_id: string;
  min: number;
  max: number;
  mean: number;
  nan_pct: number;
  lat_range?: [number, number];
  lon_range?: [number, number];
}

// 1981–2010 climatological mean (approximate)
const CLIMATOLOGY_MEAN = 13.8;

export function DashboardSpread() {
  const [meta, setMeta] = useState<SstMeta | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);

  useEffect(() => {
    fetch('/renders/manifest.json')
      .then((r) => r.json())
      .then((manifest) => {
        const recipes = Object.values(manifest.recipes || {}) as Array<{ source?: string; latest?: string }>;
        const oisst = recipes.find((r) => r.source === 'oisst');
        if (oisst?.latest) {
          setLatestDate(oisst.latest);
          return fetch(`/data/processed/oisst/${oisst.latest}.meta.json`);
        }
        return null;
      })
      .then((r) => r?.json())
      .then((m) => { if (m) setMeta(m); })
      .catch(() => {});
  }, []);

  const anomaly = meta ? Math.round((meta.mean - CLIMATOLOGY_MEAN) * 10) / 10 : null;

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <span className={styles.topbarLabel}>/DATA EXPLORER</span>
        <span className={styles.topbarChip}>SST ⊓ NOAA OISST</span>
      </header>

      {/* Hero section — two columns */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.eyebrow}>
            North Atlantic · {latestDate || ''}
          </div>
          <div className={styles.heroNumber}>
            {meta ? meta.mean.toFixed(1) : '—'}°
          </div>
          <div className={styles.heroSubtitle}>
            Mean SST across the North Atlantic basin, 20°N–75°N
          </div>
          {anomaly !== null && (
            <div className={anomaly >= 0 ? styles.anomalyWarm : styles.anomalyCool}>
              {anomaly >= 0 ? '+' : ''}{anomaly.toFixed(1)}° above 1981–2010 climatology
            </div>
          )}
          <div className={styles.metaRow}>
            <span>41yr record</span>
            <span>0.25° resolution</span>
            <span>2d latency</span>
          </div>
        </div>
        <div className={styles.heroRight}>
          {latestDate && (
            <img
              className={styles.heroHeatmap}
              src={`/data/processed/oisst/${latestDate}.png`}
              alt="SST heatmap"
            />
          )}
        </div>
      </div>

      {/* Data strip */}
      <div className={styles.dataStrip}>
        <div className={styles.dataCol}>
          <div className={styles.dataValue}>{meta?.max.toFixed(1) ?? '—'}°</div>
          <div className={styles.dataLabel}>REGION MAX</div>
          <div className={styles.dataSub}>Gulf Stream core</div>
        </div>
        <div className={styles.dataCol}>
          <div className={styles.dataValue}>{meta?.min.toFixed(1) ?? '—'}°</div>
          <div className={styles.dataLabel}>REGION MIN</div>
          <div className={styles.dataSub}>Labrador Sea</div>
        </div>
        <div className={styles.dataCol}>
          <div className={styles.dataValue}>{CLIMATOLOGY_MEAN}°</div>
          <div className={styles.dataLabel}>1981–2010 MEAN</div>
          <div className={styles.dataSub}>baseline</div>
        </div>
        <div className={styles.dataCol}>
          <div className={styles.dataValue}>2023</div>
          <div className={styles.dataLabel}>HOTTEST YEAR</div>
          <div className={styles.dataSub}>+1.7° above baseline</div>
        </div>
      </div>

      {/* Charts placeholder */}
      <div className={styles.chartsSection}>
        <div className={styles.chartPlaceholder}>
          <div className={styles.chartTitle}>ANNUAL MEAN SST ⊓ NORTH ATLANTIC 1981→2026</div>
          <div className={styles.chartBody}>
            Observable Plot trend chart — coming when historical data is loaded
          </div>
        </div>
        <div className={styles.chartPlaceholder}>
          <div className={styles.chartTitle}>ANOMALY ⊓ LAST 10 YEARS</div>
          <div className={styles.chartBody}>
            Anomaly bar chart — coming when historical data is loaded
          </div>
        </div>
      </div>

      {/* Citation */}
      <footer className={styles.citation}>
        NOAA OISST · 0.25° · DAILY · 1981–2026
      </footer>
    </div>
  );
}
