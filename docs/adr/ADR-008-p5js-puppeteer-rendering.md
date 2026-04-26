# ADR-008: p5.js + Puppeteer for Generative Art Rendering

- **Status**: Accepted
- **Related RFCs**: `docs/rfc/RFC-002-render-payload-format.md` *(to be written)*
- **Related PRDs**: `docs/prd/PRD-004-rendering-pipeline.md`

## Context & Problem Statement

The pipeline must render generative art from ocean data as PNG files, server-side, without a display. The render must be identical to the live browser preview in the recipe editor. The system must support six render types and be extensible for user-written sketches.

## Decision

Use p5.js for generative art sketches and Puppeteer (headless Chromium) to screenshot the canvas. Each recipe has a p5.js sketch template. The sketch receives `window.OCEAN_PAYLOAD` and draws to a canvas. Puppeteer injects the payload, waits for the `render:complete` DOM event, and screenshots.

## Rationale

p5.js is the standard creative coding library — it has the widest community, the most tutorials, and the most existing generative art code. Artists writing custom sketches (the sketch editor escape hatch) will already know or be able to learn p5.js. The same sketch code runs in the browser (live preview) and in Puppeteer (pipeline render) — one code path, two execution contexts.

## Alternatives Considered

1. **Canvas API directly (no p5.js)**
   - **Pros**: No dependency, slightly faster
   - **Cons**: Much more verbose for generative art patterns. Removes the sketch editor's accessibility to artists who know p5.js.
   - **Why Rejected**: p5.js is the creative coding standard. The accessibility benefit outweighs the dependency cost.

2. **Server-side Canvas (node-canvas)**
   - **Pros**: Pure Node.js, no Chromium dependency
   - **Cons**: Does not support WebGL (needed for particle systems). Cannot run the same code as the browser preview — two separate render paths required.
   - **Why Rejected**: Two render paths is a maintenance burden and a correctness risk. Browser parity is essential.

## Consequences

**Positive:**
- Single code path for preview and pipeline render — what you see in the editor is what the pipeline produces
- p5.js ecosystem accessible to sketch editor users
- Puppeteer handles the full browser rendering stack including WebGL

**Negative:**
- Chromium adds ~400MB to the pipeline Docker image
- Puppeteer startup time per render (~1–2 seconds) — acceptable for daily rendering

## Implementation Notes

Task 05 (Render) in `pipeline/render.js`. Sketch templates in `sketches/{render_type}.js`. Payload injected as `window.OCEAN_PAYLOAD` before sketch execution. `render:complete` event fired by the sketch when drawing is done.
