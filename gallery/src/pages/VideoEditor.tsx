import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AudioWaveform } from '../components/AudioWaveform';
import { ArcEditor } from '../components/ArcEditor';
import { useGenerativeAudio } from '../hooks/useGenerativeAudio';
import { useManifest } from '../hooks/useManifest';
import { PRESET_GROUPS, AUDIO_PRESETS, getPreset, presetFromAudioParams, type AudioPreset } from '../lib/audioPresets';
import { DEFAULT_CHANNEL_MIX, DEFAULT_EQ, type ChannelMix, type EqSettings } from '../lib/audioEngineTypes';
import { type MomentEvent, detectMoments } from '../lib/moments';
import { DEFAULT_ARC_SPEC, expandArc, type TensionArcSpec } from '../lib/tensionArc';
import { extractAudioParams, extractTensionArc } from '../lib/yamlParser';
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
  // '' = silent, 'recipe' = use recipe's audio: block, otherwise = named preset override
  const [audioTheme, setAudioTheme] = useState<string>('recipe');
  const [recipePreset, setRecipePreset] = useState<AudioPreset | null>(null);
  const [channelMix, setChannelMix] = useState<ChannelMix>(DEFAULT_CHANNEL_MIX);
  const [audioEq, setAudioEq] = useState<EqSettings>(DEFAULT_EQ);
  const [arcSpec, setArcSpec] = useState<TensionArcSpec>(DEFAULT_ARC_SPEC);
  const [overlays, setOverlays] = useState({
    date: true,
    attribution: true,
  });
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });
  const [exportOpen, setExportOpen] = useState(false);
  const [moments, setMoments] = useState<MomentEvent[]>([]);
  const [intensity, setIntensity] = useState<number[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const playRef = useRef<number | null>(null);

  const dates = entry?.dates || [];
  const currentDate = dates[selectedFrame] || '';
  const duration = dates.length / fps;

  // Resolve preset: 'recipe' = derived from YAML audio block (falls back to ocean if absent)
  // ''        = silent
  // other     = named preset override
  const resolvedPreset: AudioPreset | null =
    audioTheme === '' ? null :
    audioTheme === 'recipe' ? (recipePreset ?? getPreset('ocean')) :
    getPreset(audioTheme);

  // Dominant moment frame — the highest-scoring event, used to pin the arc peak.
  const dominantMomentFrame = moments.length > 0
    ? moments.reduce((a, b) => (a.score >= b.score ? a : b)).frame
    : null;

  // Tension arc — RFC-011. Expanded once per spec/totalFrames/momentFrame change.
  const tensionArc = dates.length > 0
    ? expandArc(arcSpec, dates.length, dominantMomentFrame)
    : [];

  // Hold mask — PRD-006 "drop to drone only" gesture. In the pipeline export,
  // frames are inserted at the moment to extend the visual hold. In the browser
  // we don't extend playback, but we apply the same gesture for the equivalent
  // span (~fps frames *after* the moment frame): pulse/accent stop, texture mutes,
  // drone holds. Audio + video drift slightly during preview but the gesture
  // is audible and matches what the exported MP4 plays. Mask matches the
  // pipeline _inject_hold convention: moment frame itself is False (so the
  // bell fires there), inserted/equivalent frames are True.
  const holdSpan = fps;  // 1-second hold at current fps
  const holdMask: boolean[] = dates.length > 0
    ? Array.from({ length: dates.length }, (_, i) =>
        arcSpec.pin_key_moment === true &&
        dominantMomentFrame !== null &&
        i > dominantMomentFrame &&
        i <= dominantMomentFrame + holdSpan,
      )
    : [];

  // Generative audio engine — RFC-010 four-layer composition + RFC-011 arc envelope
  const { masterVolume, setMasterVolume, audioReady, liveChannels } = useGenerativeAudio({
    preset: resolvedPreset,
    enabled: audioEnabled,
    isPlaying,
    intensity,
    values,
    dates,
    moments,
    currentFrame: selectedFrame,
    fps,
    channelMix,
    eq: audioEq,
    tensionArc,
    holdMask,
  });

  // Fetch recipe YAML — derive audio preset and tension arc spec from it
  useEffect(() => {
    if (!recipe) { setRecipePreset(null); setArcSpec(DEFAULT_ARC_SPEC); return; }
    fetch(`/recipes/${recipe}.yaml`)
      .then((r) => r.ok ? r.text() : '')
      .then((yaml) => {
        if (!yaml) { setRecipePreset(null); setArcSpec(DEFAULT_ARC_SPEC); return; }
        const audio = extractAudioParams(yaml);
        if (Object.keys(audio).length === 0) {
          setRecipePreset(null);
        } else {
          setRecipePreset(presetFromAudioParams(audio, recipe));
        }
        const arc = extractTensionArc(yaml);
        setArcSpec({
          ...DEFAULT_ARC_SPEC,
          ...(arc as Partial<TensionArcSpec>),
        });
      })
      .catch(() => { setRecipePreset(null); setArcSpec(DEFAULT_ARC_SPEC); });
  }, [recipe]);

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
        const seriesValues = series.map((d) => d.mean ?? d.count ?? 0);
        setValues(seriesValues);
        // Compute intensity signal for audio + visualizer
        const signal = detectMoments(seriesValues, undefined, 5, 0.3);
        setIntensity(signal.intensity);

        // Extract truly significant moments — not per-frame noise
        const significant = extractSignificantMoments(seriesValues, dates);
        setMoments(significant);
      })
      .catch(() => { setMoments([]); setIntensity([]); setValues([]); });
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
          <a href="/" className={styles.topbarLink}>← gallery</a>
          <a href={`/gallery/${recipe}`} className={styles.topbarLink}>← view</a>
          <a href={`/recipes/${recipe}`} className={styles.topbarLink}>← recipe</a>
          <button
            type="button"
            className={styles.actionPrimary}
            onClick={() => setExportOpen(true)}
          >
            download
          </button>
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
              autoPlay
              loop
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

          {/* Timeline ribbon */}
          <div className={styles.ribbon}>
            {/* Year ticks + key moment markers above the slider */}
            <div className={styles.ribbonAnnotations}>
              {/* Year labels at evenly spaced positions */}
              {(() => {
                const yearSet = new Set<string>();
                const ticks: Array<{year: string; pct: number}> = [];
                for (let i = 0; i < dates.length; i++) {
                  const y = dates[i]?.substring(0, 4);
                  if (y && !yearSet.has(y) && parseInt(y) % 5 === 0) {
                    yearSet.add(y);
                    ticks.push({ year: y, pct: (i / Math.max(1, dates.length - 1)) * 100 });
                  }
                }
                return ticks.map((t) => (
                  <span key={t.year} className={styles.yearTick} style={{ left: `${t.pct}%` }}>{t.year}</span>
                ));
              })()}
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
            {/* Slider */}
            <input
              type="range"
              min={0}
              max={dates.length - 1}
              value={selectedFrame}
              className={styles.ribbonSlider}
              onChange={(e) => { setIsPlaying(false); setSelectedFrame(parseInt(e.target.value, 10)); }}
            />
            {/* Playback controls below */}
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
              <span className={styles.playDate}>{currentDate}</span>
              <span className={styles.playTime}>
                {(selectedFrame / fps).toFixed(1)}s / {duration.toFixed(1)}s
              </span>
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
                  <select
                    className={styles.select}
                    value={audioTheme}
                    onChange={(e) => setAudioTheme(e.target.value)}
                  >
                    <option value="recipe">From recipe</option>
                    {PRESET_GROUPS.map((group) => (
                      <optgroup key={group.engine} label={group.label}>
                        {group.ids.map((id) => (
                          <option key={id} value={id}>{AUDIO_PRESETS[id].name}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="">Silent</option>
                  </select>
                  {audioTheme && (
                    <span className={audioReady ? styles.audioReady : styles.audioLoading}>
                      {audioReady ? 'ready' : isPlaying ? 'loading...' : 'press play'}
                    </span>
                  )}
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

                {/* Waveform + interactive 4-channel mixer + 3-band EQ */}
                <AudioWaveform
                  isPlaying={isPlaying}
                  channels={liveChannels}
                  mix={channelMix}
                  onMixChange={setChannelMix}
                  eq={audioEq}
                  onEqChange={setAudioEq}
                  arc={tensionArc}
                  currentFrame={selectedFrame}
                />

                {/* Tension arc editor — RFC-011 / PRD-006 */}
                <ArcEditor
                  spec={arcSpec}
                  onChange={setArcSpec}
                  totalFrames={dates.length}
                  dominantMomentFrame={dominantMomentFrame}
                />
              </>
            )}
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

        </aside>
      </div>

      {exportOpen && (
        <div className={styles.exportBackdrop} onClick={() => setExportOpen(false)}>
          <div className={styles.exportPopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.exportPopupTitle}>EXPORT MP4</div>
            <div className={styles.exportPopupNote}>Baked into the exported video</div>
            {Object.entries(overlays).map(([key, enabled]) => (
              <label key={key} className={styles.overlayRow}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleOverlay(key)}
                  disabled={exportState.status === 'exporting'}
                />
                <span>{key === 'date' ? 'Date stamp' : 'Source attribution'}</span>
              </label>
            ))}
            <div className={styles.exportPopupActions}>
              {exportState.status === 'idle' && (
                <button className={styles.exportBtn} onClick={handleExport}>
                  Render & download
                </button>
              )}
              {exportState.status === 'exporting' && (
                <button className={styles.exportBtn} disabled>
                  Rendering…
                </button>
              )}
              {exportState.status === 'done' && (
                <a
                  href={`/api/export/${recipe}/download`}
                  className={styles.exportBtn}
                  download
                  onClick={() => setTimeout(() => setExportOpen(false), 150)}
                >
                  Download MP4 ({((exportState.size || 0) / 1024 / 1024).toFixed(1)} MB)
                </a>
              )}
              <button
                type="button"
                className={styles.exportPopupClose}
                onClick={() => setExportOpen(false)}
              >
                close
              </button>
            </div>
            {exportState.status === 'exporting' && exportState.progress && (
              <div className={styles.exportProgress}>{exportState.progress}</div>
            )}
            {exportState.status === 'error' && (
              <div className={styles.exportError}>{exportState.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
