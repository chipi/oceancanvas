# ADR-020 — Live preview architecture

> **Status** · Accepted
> **Date** · 2026-04-30
> **TA anchor** · §components/render-system · §components/web-frontend · §constraints
> **Related RFC** · RFC-004 (closes)
> **Related PRDs** · PRD-003 Recipe Editor

## Context

The Recipe Editor's live preview must be both responsive (fast feedback during creative exploration) and faithful (what you see is what the pipeline renders). RFC-004 explored three architectures: mock preview, real sketch with downsampled data, and server-side preview renders. The tension is between interactive speed (~200ms feedback) and pixel-perfect fidelity.

## Decision

Real p5.js sketch with downsampled payload in an iframe using `srcDoc`. The same sketch code runs in both contexts — no editor-only branches. Downsampling happens in the browser's payload builder (bilinear interpolation for grids, point cap for scatter). Scripts are fetched, cached, and inlined into the srcDoc HTML. The editor shows the actual pipeline PNG by default; live preview activates only when the user changes a creative control.

## Rationale

Running the real sketch maintains code parity (ADR-008). Downsampling trades some visual character for interactive speed but keeps the artistic signature intact. Showing the pipeline PNG first ensures the user sees the authoritative render before exploring changes. The srcDoc iframe with inlined scripts avoids cross-origin issues while keeping sketch code shared.

## Alternatives considered

- **Mock/simplified preview** — fast but breaks the "what you see is what you get" promise. Divergence between preview and render erodes trust.
- **Server-side preview renders** — pixel-perfect but adds latency (seconds per change), server load, and a new API surface. Overkill for creative exploration.
- **External script loading in iframe** — null origin in srcDoc blocks external fetches. Inlining is the only reliable approach.

## Consequences

**Positive:**
- Single sketch codebase for preview and pipeline
- Fast creative exploration with real artistic output
- Pipeline PNG as default prevents confusion about preview vs. final render

**Negative:**
- Downsampled preview is not byte-identical to pipeline render (documented in #36)
- Script inlining adds complexity to SketchPreview component
- 500ms debounce needed to prevent excessive re-renders during slider drags

## Implementation notes

- Preview component: `gallery/src/components/SketchPreview.tsx` (srcDoc iframe, script caching, debounce)
- Payload builder: `gallery/src/lib/payloadBuilder.ts` (buildPreviewPayload with crop + downsample)
- Sketches: `sketches/{field,particles,scatter}.js` (shared between pipeline and preview)
- Render signal: `window.__RENDER_COMPLETE = true` (sketch signals completion to parent)
