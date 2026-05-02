import { useEffect, useState } from 'react';
import { ObservationTimeline } from '../components/ObservationTimeline';
import { SstHistogram } from '../components/SstHistogram';
import { SstTimeSeries } from '../components/SstTimeSeries';
import styles from './DashboardSpread.module.css';

interface ManifestRecipe {
  name: string;
  render_type: string;
  source: string;
  dates: string[];
  latest: string;
  count: number;
}

interface MetaData {
  date: string;
  source_id: string;
  min: number;
  max: number;
  mean: number;
  nan_pct?: number;
  profile_count?: number;
  lat_range?: [number, number];
  lon_range?: [number, number];
}

const SOURCES = [
  { id: 'north-atlantic-sst', label: 'SST', source: 'oisst', sub: 'NOAA OISST' },
  { id: 'argo-global', label: 'Argo Floats', source: 'argo', sub: 'ifremer GDAC' },
  { id: 'whale-shark', label: 'Whale Shark', source: 'obis-whale-shark', sub: 'OBIS' },
  { id: 'leatherback-turtle', label: 'Leatherback', source: 'obis-leatherback-turtle', sub: 'OBIS' },
  { id: 'elephant-seal', label: 'Elephant Seal', source: 'obis-elephant-seal', sub: 'OBIS' },
];

const CLIMATOLOGY_MEAN = 13.8;

export function DashboardSpread() {
  const [manifest, setManifest] = useState<Record<string, ManifestRecipe> | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [sstData, setSstData] = useState<number[]>([]);
  const [monthlySeries, setMonthlySeries] = useState<Array<{date: string; mean: number; min: number; max: number}>>([]);
  const [obsSeries, setObsSeries] = useState<Array<{date: string; count: number}>>([]);

  const active = SOURCES[activeIdx];
  const entry = manifest?.[active.id];

  useEffect(() => {
    fetch('/renders/manifest.json')
      .then((r) => r.json())
      .then((m) => setManifest(m.recipes || {}))
      .catch(() => {});
  }, []);

  // Load data when source changes
  useEffect(() => {
    if (!entry) return;
    setMeta(null);
    setSstData([]);
    setMonthlySeries([]);
    setObsSeries([]);

    const sourceDir = active.source;

    if (sourceDir === 'oisst') {
      // SST: meta + grid data + monthly series
      fetch(`/data/processed/oisst/${entry.latest}.meta.json`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((m) => setMeta(m))
        .catch(() => {});

      fetch(`/data/processed/oisst/${entry.latest}.json`)
        .then((r) => r.json())
        .then((d) => { if (d?.data) setSstData(d.data); })
        .catch(() => {});

      fetch('/data/processed/oisst/sst-monthly-series.json')
        .then((r) => r.json())
        .then((s) => { if (Array.isArray(s)) setMonthlySeries(s); })
        .catch(() => {});
    }

    // All sources: observation count time series
    fetch(`/data/processed/${sourceDir}/time-series.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((s) => { if (Array.isArray(s)) setObsSeries(s); })
      .catch(() => {});
  }, [activeIdx, entry?.latest]);

  const anomaly = meta ? Math.round((meta.mean - CLIMATOLOGY_MEAN) * 10) / 10 : null;
  const isOisst = active.source === 'oisst';

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <span className={styles.topbarLabel}>/DATA EXPLORER</span>
        <span className={styles.topbarChip}>{active.label} ⊓ {active.sub}</span>
        <nav className={styles.topbarNav}>
          <a href="/" className={styles.topbarLink}>← gallery</a>
          <a href="/dashboard" className={styles.topbarLink}>dashboard</a>
        </nav>
      </header>

      {/* Body: source rail left, content right */}
      <div className={styles.body}>
        {/* Source rail — same pattern as Dashboard */}
        <nav className={styles.sourceRail}>
          {SOURCES.map((s, i) => (
            <button
              key={s.id}
              className={i === activeIdx ? styles.sourceActive : styles.sourceInactive}
              onClick={() => setActiveIdx(i)}
            >
              <div>{s.label}</div>
              <div className={styles.sourceLabel}>{s.sub}</div>
            </button>
          ))}
        </nav>

        {/* Main content area */}
        <div className={styles.content}>
      {/* Hero section */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.eyebrow}>
            {active.label} · {entry?.latest || ''}
          </div>
          {isOisst && meta ? (
            <>
              <div className={styles.heroNumber}>{meta.mean.toFixed(1)}°</div>
              <div className={styles.heroSubtitle}>
                Mean SST across the North Atlantic basin
              </div>
              {anomaly !== null && (
                <div className={anomaly >= 0 ? styles.anomalyWarm : styles.anomalyCool}>
                  {anomaly >= 0 ? '+' : ''}{anomaly.toFixed(1)}° above 1981–2010 climatology
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.heroNumber}>{entry?.count || '—'}</div>
              <div className={styles.heroSubtitle}>
                {active.source.startsWith('obis') ? 'occurrence records' : 'float profiles'}
                {' '}· {entry?.dates?.length || 0} time periods
              </div>
            </>
          )}
          <div className={styles.metaRow}>
            <span>{entry?.count || 0} renders</span>
            <span>{entry?.dates?.[0]?.substring(0, 4) || ''} → {entry?.latest?.substring(0, 4) || ''}</span>
            <span>{active.sub}</span>
          </div>
        </div>
        <div className={styles.heroRight}>
          {entry?.latest && (
            <img
              className={styles.heroHeatmap}
              src={`/renders/${active.id}/${entry.latest}.png`}
              alt={active.label}
            />
          )}
        </div>
      </div>

      {/* Data strip */}
      <div className={styles.dataStrip}>
        {isOisst && meta ? (
          <>
            <div className={styles.dataCol}>
              <div className={styles.dataValue}>{meta.max.toFixed(1)}°</div>
              <div className={styles.dataLabel}>REGION MAX</div>
            </div>
            <div className={styles.dataCol}>
              <div className={styles.dataValue}>{meta.min.toFixed(1)}°</div>
              <div className={styles.dataLabel}>REGION MIN</div>
            </div>
            <div className={styles.dataCol}>
              <div className={styles.dataValue}>{CLIMATOLOGY_MEAN}°</div>
              <div className={styles.dataLabel}>BASELINE</div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.dataCol}>
              <div className={styles.dataValue}>{obsSeries.reduce((s, d) => s + d.count, 0).toLocaleString()}</div>
              <div className={styles.dataLabel}>TOTAL RECORDS</div>
            </div>
            <div className={styles.dataCol}>
              <div className={styles.dataValue}>{entry?.dates?.length || 0}</div>
              <div className={styles.dataLabel}>TIME PERIODS</div>
            </div>
            <div className={styles.dataCol}>
              <div className={styles.dataValue}>{entry?.dates?.[0]?.substring(0, 4) || '—'}</div>
              <div className={styles.dataLabel}>EARLIEST</div>
            </div>
          </>
        )}
        <div className={styles.dataCol}>
          <div className={styles.dataValue}>{entry?.count || 0}</div>
          <div className={styles.dataLabel}>RENDERS</div>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartsSection}>
        {/* Chart 1: SST histogram or observation timeline */}
        <div className={styles.chartPlaceholder}>
          <div className={styles.chartTitle}>
            {isOisst ? `SST DISTRIBUTION ⊓ ${entry?.latest || ''}` : `${active.label.toUpperCase()} ⊓ OBSERVATIONS OVER TIME`}
          </div>
          <div className={styles.chartBody}>
            {isOisst ? (
              sstData.length > 0 ? <SstHistogram data={sstData} /> : 'Loading...'
            ) : (
              obsSeries.length > 0 ? (
                <ObservationTimeline data={obsSeries} label="Records" color="#5DCAA5" />
              ) : 'Loading...'
            )}
          </div>
        </div>

        {/* Chart 2: SST time series or observation timeline for SST */}
        <div className={styles.chartPlaceholder}>
          <div className={styles.chartTitle}>
            {isOisst ? 'MEAN SST ⊓ 1981→2026' : `${active.label.toUpperCase()} ⊓ DATA COVERAGE`}
          </div>
          <div className={styles.chartBody}>
            {isOisst ? (
              monthlySeries.length > 0 ? (
                <SstTimeSeries data={monthlySeries} baseline={CLIMATOLOGY_MEAN} />
              ) : 'Loading...'
            ) : (
              obsSeries.length > 0 ? (
                <ObservationTimeline
                  data={obsSeries.map((d) => ({
                    date: d.date,
                    count: Math.round(obsSeries.slice(0, obsSeries.indexOf(d) + 1).reduce((s, x) => s + x.count, 0)),
                  }))}
                  label="Cumulative"
                  color="#EF9F27"
                />
              ) : 'Loading...'
            )}
          </div>
        </div>
      </div>

      {/* Citation */}
      <footer className={styles.citation}>
        {active.sub} · {active.label} · {entry?.dates?.[0]?.substring(0, 4) || ''}–{entry?.latest?.substring(0, 4) || ''} · OceanCanvas
      </footer>

        </div>{/* /content */}
      </div>{/* /body */}
    </div>
  );
}
