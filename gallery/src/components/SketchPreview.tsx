import { useEffect, useMemo, useRef, useState } from 'react';
import type { OceanPayload } from '../lib/payloadBuilder';
import styles from './SketchPreview.module.css';

interface SketchPreviewProps {
  payload: OceanPayload | null;
  className?: string;
}

// Cache fetched script contents so we don't re-fetch on every render
const scriptCache: Record<string, string> = {};

async function fetchScript(url: string): Promise<string> {
  if (scriptCache[url]) return scriptCache[url];
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`);
  const text = await resp.text();
  scriptCache[url] = text;
  return text;
}

/**
 * Renders a p5.js sketch in an iframe using srcdoc with inlined scripts.
 * All scripts are fetched and inlined to avoid srcDoc origin issues.
 */
export function SketchPreview({ payload, className }: SketchPreviewProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [srcdoc, setSrcdoc] = useState('');

  // Listen for completion message from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data === 'OCEAN_RENDER_COMPLETE') setStatus('ready');
      if (e.data === 'OCEAN_RENDER_TIMEOUT') setStatus('error');
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Debounce + build srcdoc with inlined scripts
  useEffect(() => {
    if (!payload) {
      setSrcdoc('');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buildSrcdoc(payload);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [payload]);

  async function buildSrcdoc(p: OceanPayload) {
    setStatus('loading');
    const renderType = p.recipe.render.type || 'field';

    try {
      const [sharedJs, sketchJs] = await Promise.all([
        fetchScript('/sketches/shared.js'),
        fetchScript(`/sketches/${renderType}.js`),
      ]);

      const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>body{margin:0;overflow:hidden;background:#030B10}</style>
</head><body>
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(p)};</script>
<script>${sharedJs}</script>
<script>${sketchJs}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script>
(function(){
  var n=0,iv=setInterval(function(){
    n++;
    if(window.__RENDER_COMPLETE){clearInterval(iv);parent.postMessage("OCEAN_RENDER_COMPLETE","*")}
    else if(n>300){clearInterval(iv);parent.postMessage("OCEAN_RENDER_TIMEOUT","*")}
  },100);
})();
</script>
</body></html>`;

      setSrcdoc(html);
    } catch (e) {
      setStatus('error');
    }
  }

  const width = payload?.output.width ?? 960;
  const height = payload?.output.height ?? 540;

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      {srcdoc ? (
        <iframe
          key={srcdoc.length + '_' + (payload?.recipe?.render?.type || '')}
          className={styles.iframe}
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          title="Sketch preview"
        />
      ) : (
        <div className={styles.shimmer} />
      )}
      {status === 'loading' && srcdoc && <div className={styles.shimmer} />}
      {status === 'error' && (
        <div className={styles.error}>Render timed out — try simplifying the recipe</div>
      )}
    </div>
  );
}
