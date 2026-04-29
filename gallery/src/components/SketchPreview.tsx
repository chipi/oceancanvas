import { useEffect, useRef, useState } from 'react';
import type { OceanPayload } from '../lib/payloadBuilder';
import styles from './SketchPreview.module.css';

interface SketchPreviewProps {
  payload: OceanPayload | null;
  className?: string;
}

/**
 * Renders a p5.js sketch in a sandboxed iframe.
 *
 * Loads shared.js + {render_type}.js from /sketches/, injects the payload
 * as window.OCEAN_PAYLOAD. Re-renders on payload change with 200ms debounce.
 */
export function SketchPreview({ payload, className }: SketchPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!payload) {
      setStatus('loading');
      return;
    }

    // Debounce re-renders during rapid control changes
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      renderSketch(payload);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [payload]);

  function renderSketch(p: OceanPayload) {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setStatus('loading');
    setErrorMsg(null);

    const renderType = p.recipe.render.type || 'field';

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>body { margin: 0; overflow: hidden; background: #030B10; }</style>
<script src="/sketches/shared.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"><\/script>
</head><body>
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(p)};<\/script>
<script src="/sketches/${renderType}.js"><\/script>
</body></html>`;

    // Write to iframe
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    // Poll for completion
    let checks = 0;
    const maxChecks = 150; // 15 seconds at 100ms intervals
    const poll = setInterval(() => {
      checks++;
      try {
        const win = iframe.contentWindow as Window & { __RENDER_COMPLETE?: boolean };
        if (win?.__RENDER_COMPLETE) {
          clearInterval(poll);
          setStatus('ready');
        } else if (checks >= maxChecks) {
          clearInterval(poll);
          setStatus('error');
          setErrorMsg('Render timed out');
        }
      } catch {
        // Cross-origin error — iframe not ready yet
      }
    }, 100);
  }

  const width = payload?.output.width ?? 960;
  const height = payload?.output.height ?? 540;

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      <iframe
        ref={iframeRef}
        className={styles.iframe}
        style={{ aspectRatio: `${width} / ${height}` }}
        sandbox="allow-scripts allow-same-origin"
        title="Sketch preview"
      />
      {status === 'loading' && <div className={styles.shimmer} />}
      {status === 'error' && (
        <div className={styles.error}>{errorMsg || 'Render failed'}</div>
      )}
    </div>
  );
}
