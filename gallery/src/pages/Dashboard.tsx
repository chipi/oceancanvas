import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

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

interface ManifestRecipe {
  name: string;
  render_type: string;
  source: string;
  dates: string[];
  latest: string;
  count: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<SstMeta | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoverCoords, setHoverCoords] = useState<string | null>(null);

  useEffect(() => {
    fetch('/renders/manifest.json')
      .then((r) => r.json())
      .then((manifest) => {
        const oisst = manifest.recipes?.['north-atlantic-sst'] as ManifestRecipe | undefined;
        if (oisst) {
          setDates(oisst.dates);
          setSelectedDate(oisst.latest);
          return fetch(`/data/processed/oisst/${oisst.latest}.meta.json`);
        }
        return null;
      })
      .then((r) => r?.json())
      .then((m) => { if (m) setMeta(m); })
      .catch((e) => setError(e.message));
  }, []);

  // Load meta for selected date
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    fetch(`/data/processed/oisst/${date}.meta.json`)
      .then((r) => r.json())
      .then((m) => { if (m) setMeta(m); })
      .catch(() => {});
  }, []);

  if (error) {
    return <div className={styles.page}><div className={styles.error}>Data unavailable: {error}</div></div>;
  }

  const CLIMATOLOGY_MEAN = 13.8;
  const anomaly = meta ? Math.round((meta.mean - CLIMATOLOGY_MEAN) * 10) / 10 : null;
  const selectedIdx = selectedDate ? dates.indexOf(selectedDate) : -1;

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <span className={styles.topbarPath}>
          /sea surface temperature <span className={styles.topbarMuted}>⊓ NOAA OISST</span>
        </span>
        <span className={styles.topbarTime}>{selectedDate || ''}</span>
        <nav className={styles.topbarNav}>
          <a href="/" className={styles.topbarLink}>← gallery</a>
          <a href="/dashboard/oisst/explorer" className={styles.topbarLink}>data explorer</a>
        </nav>
      </header>

      <div className={styles.body}>
        {/* Source rail */}
        <nav className={styles.sourceRail}>
          <div className={styles.sourceActive}>SST</div>
          <div className={styles.sourceLabel}>sea surface temp</div>
          <div className={styles.sourceInactive}>Argo floats</div>
          <div className={styles.sourceInactive}>Whale shark</div>
          <div className={styles.sourceInactive}>Leatherback</div>
          <div className={styles.sourceInactive}>Elephant seal</div>
        </nav>

        {/* Map area — show the actual render PNG */}
        <div className={styles.mapArea}>
          {selectedDate ? (
            <img
              className={styles.heatmap}
              src={`/renders/north-atlantic-sst/${selectedDate}.png`}
              alt={`SST ${selectedDate}`}
              onMouseMove={(e) => {
                const latRange = meta?.lat_range ?? [20, 75];
                const lonRange = meta?.lon_range ?? [-90, 10];
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const lat = (latRange[1] - y * (latRange[1] - latRange[0])).toFixed(1);
                const lon = (lonRange[0] + x * (lonRange[1] - lonRange[0])).toFixed(1);
                setHoverCoords(`${lat}°N  ${lon}°W`);
              }}
              onMouseLeave={() => setHoverCoords(null)}
            />
          ) : (
            <div className={styles.loading}>Loading SST data...</div>
          )}

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

          <button
            className={styles.createRecipe}
            onClick={() => {
              const lr = meta?.lat_range ?? [20, 75];
              const lnr = meta?.lon_range ?? [-90, 10];
              navigate(`/recipes/new?lat_min=${lr[0]}&lat_max=${lr[1]}&lon_min=${lnr[0]}&lon_max=${lnr[1]}&source=oisst`);
            }}
          >
            Create recipe from this region →
          </button>
        </div>
      </div>

      {/* Timeline scrubber */}
      {dates.length > 1 && (
        <div className={styles.scrubber}>
          <div className={styles.scrubberControls}>
            <span className={styles.scrubberDate}>{selectedDate}</span>
            <span className={styles.scrubberCount}>
              {selectedIdx + 1} / {dates.length}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={dates.length - 1}
            value={selectedIdx >= 0 ? selectedIdx : dates.length - 1}
            className={styles.scrubberInput}
            onChange={(e) => handleDateChange(dates[parseInt(e.target.value, 10)])}
          />
          <div className={styles.scrubberLabels}>
            <span>{dates[0]?.substring(0, 4)}</span>
            <span>{dates[Math.floor(dates.length / 2)]?.substring(0, 4)}</span>
            <span>{dates[dates.length - 1]?.substring(0, 4)}</span>
          </div>
        </div>
      )}

      {/* Citation footer */}
      <footer className={styles.citation}>
        NOAA OISST · 0.25° · DAILY · 1981–2026 · OceanCanvas
      </footer>
    </div>
  );
}
