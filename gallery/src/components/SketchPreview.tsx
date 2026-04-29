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
 *
 * Completion detection: the sketch sets window.__RENDER_COMPLETE = true,
 * then the injected observer script posts a message to the parent.
 */
export function SketchPreview({ payload, className }: SketchPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Listen for completion message from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data === 'OCEAN_RENDER_COMPLETE') {
        setStatus('ready');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!payload) {
      setStatus('loading');
      return;
    }

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

    // Observer script: watches for __RENDER_COMPLETE and posts message to parent
    const observer = `
      (function() {
        var checks = 0;
        var iv = setInterval(function() {
          checks++;
          if (window.__RENDER_COMPLETE) {
            clearInterval(iv);
            parent.postMessage('OCEAN_RENDER_COMPLETE', '*');
          } else if (checks > 600) {
            clearInterval(iv);
            parent.postMessage('OCEAN_RENDER_TIMEOUT', '*');
          }
        }, 100);
      })();
    `;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>body { margin: 0; overflow: hidden; background: var(--canvas, #030B10); }</style>
<script src="/sketches/shared.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"><\/script>
</head><body>
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(p)};<\/script>
<script src="/sketches/${renderType}.js"><\/script>
<script>${observer}<\/script>
</body></html>`;

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    // Timeout fallback
    setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
        setErrorMsg('Render timed out');
      }
    }, 60000);
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
