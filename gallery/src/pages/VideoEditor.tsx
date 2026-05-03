import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useManifest } from '../hooks/useManifest';
import { type MomentEvent, detectMoments } from '../lib/moments';
import styles from './VideoEditor.module.css';

/** Extract truly significant moments — all-time records, decade highs/lows, major anomalies. */
function extractSignificantMoments(values: number[], dates: string[]): MomentEvent[] {
  if (values.length < 3) return [];

  const events: MomentEvent[] = [];
  let allTimeHigh = -Infinity;
  let allTimeLow = Infinity;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    // All-time high
    if (v > allTimeHigh) {
      allTimeHigh = v;
      // Only mark as event if it's significantly above previous record
      if (i > 0) {
        events.push({
          frame: i, score: 1.0,
          label: `All-time high (${v.toFixed(1)}°)`,
          type: 'record',
        });
      }
    }

    // All-time low
    if (v < allTimeLow) {
      allTimeLow = v;
      if (i > 0) {
        events.push({
          frame: i, score: 0.8,
          label: `All-time low (${v.toFixed(1)}°)`,
          type: 'record',
        });
      }
    }
  }

  // Keep only the LAST all-time high (the actual record) and first all-time low
  const finalHigh = events.filter((e) => e.label.startsWith('All-time high')).pop();
  const finalLow = events.filter((e) => e.label.startsWith('All-time low')).pop();
  const filtered: MomentEvent[] = [];
  if (finalHigh) filtered.push(finalHigh);
  if (finalLow) filtered.push(finalLow);

  // Find the hottest and coldest year (max/min of annual means)
  const annual: Record<string, number[]> = {};
  for (let i = 0; i < values.length; i++) {
    const year = (dates[i] || '').substring(0, 4);
    if (!year) continue;
    if (!annual[year]) annual[year] = [];
    annual[year].push(values[i]);
  }
  const annualMeans = Object.entries(annual).map(([y, vals]) => ({
    year: y,
    mean: vals.reduce((s, v) => s + v, 0) / vals.length,
    frame: dates.findIndex((d) => d.startsWith(y + '-07')) || dates.findIndex((d) => d.startsWith(y)),
  })).filter((a) => a.frame >= 0);

  if (annualMeans.length > 2) {
    const hottest = annualMeans.reduce((a, b) => a.mean > b.mean ? a : b);
    const coldest = annualMeans.reduce((a, b) => a.mean < b.mean ? a : b);
    filtered.push({
      frame: hottest.frame, score: 0.9,
      label: `Hottest year: ${hottest.year} (${hottest.mean.toFixed(1)}°)`,
      type: 'peak',
    });
    filtered.push({
      frame: coldest.frame, score: 0.7,
      label: `Coldest year: ${coldest.year} (${coldest.mean.toFixed(1)}°)`,
      type: 'peak',
    });

    // Biggest year-over-year jump
    let maxJump = 0, jumpIdx = 0;
    for (let i = 1; i < annualMeans.length; i++) {
      const jump = Math.abs(annualMeans[i].mean - annualMeans[i - 1].mean);
      if (jump > maxJump) { maxJump = jump; jumpIdx = i; }
    }
    if (maxJump > 0.3) {
      const j = annualMeans[jumpIdx];
      filtered.push({
        frame: j.frame, score: 0.6,
        label: `Largest shift: ${j.year} (${maxJump > 0 ? '+' : ''}${maxJump.toFixed(1)}°)`,
        type: 'inflection',
      });
    }
  }

  // Sort by frame
  filtered.sort((a, b) => a.frame - b.frame);
  return filtered;
}

interface ExportState {
  status: 'idle' | 'exporting' | 'done' | 'error';
  progress?: string;
  path?: string;
  size?: number;
  error?: string;
}

export function VideoEditor() {
  const { recipe } = useParams<{ recipe: string }>();
  const { manifest } = useManifest();
  const entry = manifest?.recipes?.[recipe || ''];

  const [selectedFrame, setSelectedFrame] = useState(0);
  const [fps, setFps] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioTheme, setAudioTheme] = useState('ocean');
  const [overlays, setOverlays] = useState({
    date: true,
    attribution: true,
  });
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });
  const [moments, setMoments] = useState<MomentEvent[]>([]);
  const [intensity, setIntensity] = useState<number[]>([]);
  const playRef = useRef<number | null>(null);

  const dates = entry?.dates || [];
  const currentDate = dates[selectedFrame] || '';
  const duration = dates.length / fps;

  // Audio playback — stems crossfade based on intensity signal
  const { masterVolume, setMasterVolume, audioReady } = useAudioPlayback(
    audioTheme, audioEnabled, isPlaying, intensity, selectedFrame,
  );

  // Load time series and compute key moments
  useEffect(() => {
    if (!entry) return;
    const source = entry.source || 'oisst';
    const sourceDir = source === 'oisst' ? 'oisst' : source;
    // Try time-series.json (non-OISST) or sst-monthly-series.json (OISST)
    const url = source === 'oisst'
      ? '/data/processed/oisst/sst-monthly-series.json'
      : `/data/processed/${sourceDir}/time-series.json`;

    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((series: Array<{mean?: number; count?: number}>) => {
        const values = series.map((d) => d.mean ?? d.count ?? 0);
        // Compute intensity signal for audio crossfading
        const signal = detectMoments(values, undefined, 5, 0.3);
        setIntensity(signal.intensity);

        // Extract truly significant moments — not per-frame noise
        const significant = extractSignificantMoments(values, dates);
        setMoments(significant);
      })
      .catch(() => { setMoments([]); setIntensity([]); });
  }, [entry?.source]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || dates.length === 0) return;
    const interval = 1000 / (fps * playbackSpeed);
    playRef.current = window.setInterval(() => {
      setSelectedFrame((f) => {
        if (f >= dates.length - 1) {
          setIsPlaying(false);
          return f;
        }
        return f + 1;
      });
    }, interval);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, fps, playbackSpeed, dates.length]);

  const togglePlay = useCallback(() => {
    if (selectedFrame >= dates.length - 1) setSelectedFrame(0);
    setIsPlaying((p) => !p);
  }, [selectedFrame, dates.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { setIsPlaying(false); setSelectedFrame((f) => Math.max(0, f - 1)); }
      if (e.key === 'ArrowRight') { setIsPlaying(false); setSelectedFrame((f) => Math.min(dates.length - 1, f + 1)); }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dates.length, togglePlay]);

  const handleExport = useCallback(async () => {
    if (!recipe) return;
    setExportState({ status: 'exporting', progress: 'Starting ffmpeg...' });
    try {
      const resp = await fetch(`/api/export/${recipe}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fps,
          audio_theme: audioEnabled ? audioTheme : null,
        }),
      });
      const result = await resp.json();
      if (result.ok) {
        setExportState({
          status: 'done',
          path: result.path,
          size: result.size,
        });
      } else {
        setExportState({ status: 'error', error: result.error });
      }
    } catch (e) {
      setExportState({ status: 'error', error: (e as Error).message });
    }
  }, [recipe, fps]);

  const toggleOverlay = useCallback((key: string) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  if (!entry) {
    return (
      <div className={styles.page}>
        <header className={styles.topbar}>
          <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        </header>
        <div className={styles.empty}>
          {recipe ? `No renders for "${recipe}"` : 'Select a recipe'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <span className={styles.topbarPath}>
          /timelapse editor / {recipe}
        </span>
        <div className={styles.topbarActions}>
          <a href={`/gallery/${recipe}`} className={styles.topbarLink}>← gallery</a>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exportState.status === 'exporting'}
          >
            {exportState.status === 'exporting' ? 'exporting...' : 'export MP4'}
          </button>
          {exportState.status === 'done' && (
            <a
              href={`/api/export/${recipe}/download`}
              className={styles.downloadBtn}
              download
            >
              download
            </a>
          )}
        </div>
      </header>

      {/* Body: preview left, controls right */}
      <div className={styles.body}>
        {/* Preview area */}
        <div className={styles.preview}>
          {exportState.status === 'done' ? (
            <video
              className={styles.previewVideo}
              src={`/api/export/${recipe}/download`}
              controls
              autoPlay
            />
          ) : (
            <img
              className={styles.previewImage}
              src={`/renders/${recipe}/${currentDate}.png`}
              alt={`${recipe} ${currentDate}`}
            />
          )}
          <div className={styles.previewOverlay}>
            <span className={styles.previewDate}>{currentDate}</span>
            <span className={styles.previewFrame}>
              {selectedFrame + 1} / {dates.length}
            </span>
          </div>

          {/* Timeline ribbon + controls */}
          <div className={styles.ribbon}>
            <div className={styles.playControls}>
              <button className={styles.playBtn} onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <select
                className={styles.speedSelect}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
              <span className={styles.ribbonYear}>{dates[0]?.substring(0, 4)}</span>
              <span className={styles.playTime}>
                {(selectedFrame / fps).toFixed(1)}s / {duration.toFixed(1)}s
              </span>
              <span className={styles.ribbonYear}>{dates[dates.length - 1]?.substring(0, 4)}</span>
            </div>
            <div className={styles.ribbonTrack}>
              <input
                type="range"
                min={0}
                max={dates.length - 1}
                value={selectedFrame}
                className={styles.ribbonSlider}
                onChange={(e) => { setIsPlaying(false); setSelectedFrame(parseInt(e.target.value, 10)); }}
              />
              {moments.map((m) => (
                <div
                  key={m.frame}
                  className={styles.momentMarker}
                  style={{
                    left: `${(m.frame / Math.max(1, dates.length - 1)) * 100}%`,
                    backgroundColor: m.type === 'record' ? '#EF9F27' : m.type === 'peak' ? '#5DCAA5' : '#666',
                  }}
                  title={`${m.label} (frame ${m.frame})`}
                  onClick={() => { setIsPlaying(false); setSelectedFrame(m.frame); }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Control panel */}
        <aside className={styles.controls}>
          {/* Sequence */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>SEQUENCE</div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Recipe</span>
              <span className={styles.fieldValue}>{recipe}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Frames</span>
              <span className={styles.fieldValue}>{dates.length}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>FPS</span>
              <select
                className={styles.select}
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value, 10))}
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={30}>30</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Duration</span>
              <span className={styles.fieldValue}>{duration.toFixed(1)}s</span>
            </div>
          </div>

          {/* Audio */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>AUDIO</div>
            <label className={styles.overlayRow}>
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={() => setAudioEnabled((e) => !e)}
              />
              <span>Enable audio</span>
            </label>
            {audioEnabled && (
              <>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Theme</span>
                  <select
                    className={styles.select}
                    value={audioTheme}
                    onChange={(e) => setAudioTheme(e.target.value)}
                  >
                    <option value="ocean">Ocean</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="deep">Deep</option>
                    <option value="">Silent</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                    className={styles.volumeSlider}
                  />
                </div>
                {audioTheme && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <span className={audioReady ? styles.audioReady : styles.audioLoading}>
                      {audioReady ? 'ready' : 'loading...'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Overlays — what gets baked into export */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>EXPORT OVERLAYS</div>
            <div className={styles.overlayNote}>Baked into exported MP4</div>
            {Object.entries(overlays).map(([key, enabled]) => (
              <label key={key} className={styles.overlayRow}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleOverlay(key)}
                />
                <span>{key === 'date' ? 'Date stamp' : 'Source attribution'}</span>
              </label>
            ))}
          </div>

          {/* Key moments */}
          {moments.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>KEY MOMENTS ({moments.length})</div>
              <div className={styles.momentList}>
                {moments.map((m) => (
                  <div
                    key={m.frame}
                    className={styles.momentRow}
                    onClick={() => { setIsPlaying(false); setSelectedFrame(m.frame); }}
                  >
                    <span
                      className={styles.momentDot}
                      style={{ backgroundColor: m.type === 'record' ? '#EF9F27' : m.type === 'peak' ? '#5DCAA5' : '#666' }}
                    />
                    <span className={styles.momentLabel}>{m.label}</span>
                    <span className={styles.momentFrame}>{dates[m.frame]?.substring(0, 7) || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export status */}
          {exportState.status !== 'idle' && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>EXPORT</div>
              {exportState.status === 'exporting' && (
                <div className={styles.exportProgress}>{exportState.progress}</div>
              )}
              {exportState.status === 'done' && (
                <div className={styles.exportDone}>
                  Ready ({((exportState.size || 0) / 1024 / 1024).toFixed(1)} MB)
                </div>
              )}
              {exportState.status === 'error' && (
                <div className={styles.exportError}>{exportState.error}</div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
