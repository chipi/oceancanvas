import { useEffect, useMemo, useRef, useState } from 'react';
import type { OceanPayload } from '../lib/payloadBuilder';
import styles from './SketchPreview.module.css';

interface SketchPreviewProps {
  payload: OceanPayload | null;
  className?: string;
}

/**
 * Renders a p5.js sketch in an iframe using srcdoc.
 *
 * Each payload change produces a new srcdoc string, forcing a full
 * iframe reload. This ensures p5.js setup() runs fresh each time.
 * Debounced at 500ms to avoid thrashing during rapid control changes.
 */
export function SketchPreview({ payload, className }: SketchPreviewProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedPayload, setDebouncedPayload] = useState<OceanPayload | null>(null);

  // Debounce payload changes
  useEffect(() => {
    if (!payload) {
      setDebouncedPayload(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedPayload(payload);
      setStatus('loading');
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [payload]);

  // Listen for completion message from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data === 'OCEAN_RENDER_COMPLETE') setStatus('ready');
      if (e.data === 'OCEAN_RENDER_TIMEOUT') setStatus('error');
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Build srcdoc HTML — inline everything so no external script loading issues
  const srcdoc = useMemo(() => {
    if (!debouncedPayload) return '';

    const renderType = debouncedPayload.recipe.render.type || 'field';

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>body{margin:0;overflow:hidden;background:#030B10}</style>
</head><body>
<script>
window.OCEAN_PAYLOAD = ${JSON.stringify(debouncedPayload)};
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script src="/sketches/shared.js"></script>
<script src="/sketches/${renderType}.js"></script>
<script>
// Observer: notify parent when render completes
(function(){
  var n=0,iv=setInterval(function(){
    n++;
    if(window.__RENDER_COMPLETE){clearInterval(iv);parent.postMessage("OCEAN_RENDER_COMPLETE","*")}
    else if(n>300){clearInterval(iv);parent.postMessage("OCEAN_RENDER_TIMEOUT","*")}
  },100);
})();
</script>
</body></html>`;
  }, [debouncedPayload]);

  const width = payload?.output.width ?? 960;
  const height = payload?.output.height ?? 540;

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      {srcdoc ? (
        <iframe
          key={srcdoc}
          className={styles.iframe}
          style={{ aspectRatio: `${width} / ${height}` }}
          srcDoc={srcdoc}
          sandbox="allow-scripts allow-same-origin"
          title="Sketch preview"
        />
      ) : (
        <div className={styles.shimmer} style={{ aspectRatio: `${width} / ${height}` }} />
      )}
      {status === 'loading' && srcdoc && <div className={styles.shimmer} />}
      {status === 'error' && (
        <div className={styles.error}>Render timed out — try simplifying the recipe</div>
      )}
    </div>
  );
}
