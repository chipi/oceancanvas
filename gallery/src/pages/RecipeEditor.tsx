import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CreativeControls } from '../components/CreativeControls';
import { SketchPreview } from '../components/SketchPreview';
import type { CreativeState } from '../lib/creativeMapping';
import { MOOD_PRESETS, creativeToTechnical } from '../lib/creativeMapping';
import type { OceanPayload, ProcessedData } from '../lib/payloadBuilder';
import { buildPreviewPayload } from '../lib/payloadBuilder';
import { CREATIVE_MARKER, detectState, extractRenderParams, parseRecipeYaml, type RecipeState } from '../lib/yamlParser';
import styles from './RecipeEditor.module.css';

const DEFAULT_STATE: CreativeState = { ...MOOD_PRESETS['Becalmed'] };

export function RecipeEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';

  const [mode, setMode] = useState<'creative' | 'yaml'>('creative');
  const [creativeState, setCreativeState] = useState<CreativeState>(DEFAULT_STATE);
  const [yamlText, setYamlText] = useState('');
  const [recipeState, setRecipeState] = useState<RecipeState>('matched');
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [recipeName, setRecipeName] = useState(id || 'new-recipe');
  const [renderType, setRenderType] = useState('field');
  const [loadedParams, setLoadedParams] = useState<Record<string, unknown> | null>(null);
  const [userEdited, setUserEdited] = useState(false);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const region = useMemo(() => ({
    lat: [
      Number(searchParams.get('lat_min') || 25),
      Number(searchParams.get('lat_max') || 65),
    ] as [number, number],
    lon: [
      Number(searchParams.get('lon_min') || -80),
      Number(searchParams.get('lon_max') || 0),
    ] as [number, number],
  }), [searchParams]);

  // Load processed data for preview
  useEffect(() => {
    fetch('/renders/manifest.json')
      .then((r) => r.json())
      .then((manifest) => {
        const recipes = Object.values(manifest.recipes || {}) as Array<{ source?: string; latest?: string }>;
        const oisstRecipe = recipes.find((r) => r.source === 'oisst');
        if (oisstRecipe?.latest) {
          setLatestDate(oisstRecipe.latest);
          return fetch(`/data/processed/oisst/${oisstRecipe.latest}.json`);
        }
        return null;
      })
      .then((r) => r?.json())
      .then((data) => { if (data) setProcessedData(data); })
      .catch((e) => console.error('Failed to load preview data:', e));
  }, []);

  // Load existing recipe
  useEffect(() => {
    if (!isNew && id) {
      fetch(`/recipes/${id}.yaml`)
        .then((r) => {
          if (!r.ok) throw new Error('Recipe not found');
          return r.text();
        })
        .then((text) => {
          setYamlText(text);
          setRecipeName(id);
          const typeMatch = text.match(/type:\s*(\w+)/);
          if (typeMatch) setRenderType(typeMatch[1]);
          // Extract actual render params so preview matches the pipeline render
          const params = extractRenderParams(text);
          if (Object.keys(params).length > 0) setLoadedParams(params);
        })
        .catch(() => {});
    }
  }, [id, isNew]);

  const technical = useMemo(() => creativeToTechnical(creativeState), [creativeState]);

  // Don't build payload until recipe is loaded (for existing recipes)
  const recipeReady = isNew || loadedParams !== null || userEdited;

  const payload = useMemo<OceanPayload | null>(() => {
    if (!processedData || !recipeReady) return null;
    return buildPreviewPayload(
      processedData,
      {
        id: recipeName,
        name: recipeName,
        render: { type: renderType, seed: 42, ...(loadedParams || technical) },
        render_date: processedData.date,
      },
      region,
      { full: true },
    );
  }, [processedData, recipeName, technical, region, renderType, loadedParams, recipeReady]);

  // Sync creative → YAML
  useEffect(() => {
    if (mode === 'creative') {
      const yaml = [
        `name: ${recipeName}`,
        `region:`,
        `  lat: [${region.lat[0]}, ${region.lat[1]}]`,
        `  lon: [${region.lon[0]}, ${region.lon[1]}]`,
        `sources:`,
        `  primary: oisst`,
        `schedule: daily`,
        ``,
        CREATIVE_MARKER,
        `render:`,
        `  type: ${renderType}`,
        ...Object.entries(technical).map(([k, v]) => `  ${k}: ${v}`),
        `  seed: 42`,
      ].join('\n');
      setYamlText(yaml);
      setRecipeState('matched');
    }
  }, [creativeState, mode, recipeName, region, technical, renderType]);

  const handleModeSwitch = useCallback((newMode: 'creative' | 'yaml') => {
    if (newMode === 'creative' && mode === 'yaml') {
      setRecipeState(detectState(creativeState, technical));
    }
    setMode(newMode);
  }, [mode, creativeState, technical]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const resp = await fetch(`/api/recipes/${recipeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yamlText,
      });
      const result = await resp.json();
      setSaveMsg(result.ok ? 'Saved' : `Error: ${result.error}`);
    } catch (e) {
      setSaveMsg(`Save failed: ${(e as Error).message}`);
    }
    setSaving(false);
  }, [recipeName, yamlText]);

  const taggedLines = useMemo(() => parseRecipeYaml(yamlText), [yamlText]);

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <span className={styles.topbarRecipe}>{recipeName}</span>
        <span className={styles.topbarMeta}>
          {renderType} · {technical.colormap} · {processedData?.date || ''}
        </span>
        <div className={styles.topbarNav}>
          {!isNew && <a href={`/gallery/${recipeName}`} className={styles.navLink}>view ↗</a>}
          <a href="/" className={styles.navLink}>gallery ↗</a>
        </div>
      </header>

      {/* Body: render left, controls right */}
      <div className={styles.body}>
        {/* Render area: show pipeline PNG until user edits, then live preview */}
        <div className={styles.renderArea}>
          {!userEdited && !isNew && latestDate ? (
            <img
              className={styles.renderImage}
              src={`/renders/${recipeName}/${latestDate}.png`}
              alt={recipeName}
              onError={() => setUserEdited(true)}
            />
          ) : !processedData ? (
            <div className={styles.loadingMsg}>Loading ocean data for preview...</div>
          ) : (
            <SketchPreview payload={payload} />
          )}
          <div className={styles.overlay}>
            <div className={styles.overlayName}>{recipeName}</div>
            <div className={styles.overlayMeta}>
              {renderType} · {technical.colormap}
              {!userEdited && !isNew ? '' : ' · live preview'}
            </div>
          </div>
        </div>

        {/* Controls panel — right side */}
        <aside className={styles.controls}>
          {/* Flip bar */}
          <div className={styles.flipBar}>
            <button
              className={`${styles.flipPill} ${mode === 'creative' ? styles.flipActive : ''}`}
              onClick={() => handleModeSwitch('creative')}
            >
              creative
            </button>
            <button
              className={`${styles.flipPill} ${mode === 'yaml' ? styles.flipActive : ''}`}
              onClick={() => handleModeSwitch('yaml')}
            >
              yaml
            </button>
            {recipeState !== 'matched' && mode === 'creative' && (
              <span className={styles.stateIndicator}>{recipeState}</span>
            )}
          </div>

          {/* Creative or YAML */}
          <div className={styles.controlBody}>
            {mode === 'creative' ? (
              <CreativeControls state={creativeState} onChange={(s) => { setLoadedParams(null); setUserEdited(true); setCreativeState(s); }} />
            ) : (
              <div className={styles.yamlEditor}>
                <pre className={styles.yamlPre}>
                  {taggedLines.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.type === 'creative' ? styles.yamlCreative :
                        line.type === 'marker' ? styles.yamlMarker :
                        styles.yamlStructural
                      }
                    >
                      {line.text || '\u00A0'}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actionBar}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save recipe'}
            </button>
            <button className={styles.discardBtn} onClick={() => setCreativeState({ ...DEFAULT_STATE })}>
              Discard
            </button>
            {saveMsg && <span className={styles.saveMsg}>{saveMsg}</span>}
          </div>
        </aside>
      </div>
    </div>
  );
}
