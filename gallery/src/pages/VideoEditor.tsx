import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useManifest } from '../hooks/useManifest';
import { type MomentEvent, detectMoments } from '../lib/moments';
import styles from './VideoEditor.module.css';

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
  const [showAllMoments, setShowAllMoments] = useState(false);
  const [moments, setMoments] = useState<MomentEvent[]>([]);
  const [intensity, setIntensity] = useState<number[]>([]);
  const playRef = useRef<number | null>(null);

  const dates = entry?.dates || [];
  const currentDate = dates[selectedFrame] || '';
  const duration = dates.length / fps;

  // Audio playback — stems crossfade based on intensity signal
  useAudioPlayback(audioTheme, audioEnabled, isPlaying, intensity, selectedFrame);

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
        // Use higher threshold + filter to keep only truly significant moments
        const signal = detectMoments(values, undefined, 5, 0.35);
        // Deduplicate: keep only the highest-scoring event per 12-frame window
        const filtered: typeof signal.events = [];
        for (const e of signal.events) {
          const nearby = filtered.find((f) => Math.abs(f.frame - e.frame) < 12);
          if (!nearby || e.score > nearby.score) {
            if (nearby) filtered.splice(filtered.indexOf(nearby), 1);
            filtered.push(e);
          }
        }
        setMoments(filtered);
        setIntensity(signal.intensity);
        setMoments(signal.events);
        setIntensity(signal.intensity);
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
          {exportState.status === 'done' ? (
            <a
              href={`/api/export/${recipe}/download`}
              className={styles.exportBtn}
              download
            >
              download MP4
            </a>
          ) : (
            <button
              className={styles.exportBtn}
              onClick={handleExport}
              disabled={exportState.status === 'exporting'}
            >
              {exportState.status === 'exporting' ? 'exporting...' : 'export MP4'}
            </button>
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

          {/* Playback controls + timeline ribbon */}
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
              <span className={styles.playTime}>
                {(selectedFrame / fps).toFixed(1)}s / {duration.toFixed(1)}s
              </span>
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
              {/* Key moment markers */}
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
            <div className={styles.ribbonLabels}>
              <span>{dates[0]?.substring(0, 4)}</span>
              <span>{dates[Math.floor(dates.length / 2)]?.substring(0, 4)}</span>
              <span>{dates[dates.length - 1]?.substring(0, 4)}</span>
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
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Theme</span>
                <select
                  className={styles.select}
                  value={audioTheme}
                  onChange={(e) => setAudioTheme(e.target.value)}
                >
                  <option value="ocean">Ocean</option>
                  <option value="">Silent</option>
                </select>
              </div>
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
              {(showAllMoments ? moments : moments.slice(0, 8)).map((m) => (
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
                  <span className={styles.momentFrame}>{dates[m.frame]?.substring(0, 7) || `fr.${m.frame}`}</span>
                </div>
              ))}
              {moments.length > 8 && (
                <button
                  className={styles.momentToggle}
                  onClick={() => setShowAllMoments((s) => !s)}
                >
                  {showAllMoments ? 'show less' : `show all ${moments.length}`}
                </button>
              )}
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
