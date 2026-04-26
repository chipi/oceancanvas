# PRD-004: Rendering Pipeline

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-002-render-payload-format.md`
- **Related ADRs**: `docs/adr/ADR-008-p5js-puppeteer-rendering.md`
- **Source**: OC-02 Section 4 (Task 05), OC-04 Rendering Architecture

## Summary

The rendering pipeline is Task 05 of the daily Prefect flow. It takes a recipe's assembled render payload and produces a PNG by running a p5.js sketch through Puppeteer (headless Chromium). The same sketch code that runs in the browser for live preview runs here server-side — one code path, two execution contexts.

## Background & Context

The render is the daily artifact — a PNG that accumulates over time into the recipe's gallery archive. The rendering pipeline is what makes OceanCanvas generative art rather than a data visualisation: the p5.js sketch transforms data into a visual expression using the creative parameters encoded in the recipe.

## Goals

- Render each active recipe as a PNG once per day using its p5.js sketch template
- Produce renders at a consistent canvas resolution (1200×900 by default)
- Support all six render types: field, particles, contour, pulse, scatter, composite
- Ensure the pipeline render is visually identical to the live browser preview in the recipe editor

## Non-Goals

- Real-time rendering — renders are produced once daily, not on demand (except "render now" which is a manual trigger)
- Video rendering — video assembly is handled by ffmpeg in the video editor (PRD-008)
- Custom sketch validation — the sketch editor (escape hatch) provides no guardrails

## User Stories

- *As a recipe owner, I can trust that the pipeline render will look exactly like what I saw in the recipe editor's live preview.*
- *As a user, I can trigger an immediate render from the recipe editor using "render now" without waiting for the daily run.*

## Functional Requirements

### FR1: Puppeteer execution

- **FR1.1**: Task 05 launches a Node.js subprocess that runs Puppeteer with headless Chromium
- **FR1.2**: The sketch HTML is loaded, `window.OCEAN_PAYLOAD` is injected as the render payload
- **FR1.3**: Puppeteer waits for the `render:complete` DOM event (max 30 seconds timeout)
- **FR1.4**: The canvas is screenshotted at the configured resolution and saved as PNG

### FR2: Render types

- **FR2.1**: Six render type sketch templates: `sketches/field.js`, `sketches/particles.js`, `sketches/contour.js`, `sketches/pulse.js`, `sketches/scatter.js`, `sketches/composite.js`
- **FR2.2**: The recipe YAML specifies which render type to use; the pipeline loads the corresponding template
- **FR2.3**: Phase 1 implements: field, particles, contour. Pulse, scatter, composite deferred.

### FR3: Browser–pipeline parity

- **FR3.1**: The same `window.OCEAN_PAYLOAD` injection is used in both the browser preview and the Puppeteer render
- **FR3.2**: The sketch code is identical in both contexts — no browser-specific or Node-specific branches
- **FR3.3**: If a sketch renders correctly in the browser preview, it renders correctly in the pipeline

### FR4: Output

- **FR4.1**: PNG written to `renders/{recipe_name}/{YYYY-MM-DD}.png`
- **FR4.2**: Default canvas resolution: 1200×900 (4:3 ratio)
- **FR4.3**: A render failure for one recipe logs the error and continues to the next recipe — it does not abort the run

### FR5: Manual render trigger

- **FR5.1**: The recipe editor exposes a "render now" action that triggers Task 05 for that recipe immediately
- **FR5.2**: The resulting PNG is written to the normal renders path and manifest.json is updated
- **FR5.3**: "Render now" does not re-run Tasks 01–04 — it uses the most recent processed data

## Success Metrics

- Pipeline render matches browser preview for all three Phase 1 render types
- Render time per recipe under 10 seconds on development hardware
- A render failure for one recipe does not prevent other recipes from rendering

## Dependencies

- PRD-003: Recipe system (defines what the pipeline reads)
- RFC-002: Render payload format (defines `window.OCEAN_PAYLOAD`)

## Release Checklist

- [ ] Field render type producing correct PNG from OISST data
- [ ] Particles render type producing correct PNG from OISST data
- [ ] Contour render type producing correct PNG from OISST data
- [ ] Browser preview visually matches pipeline render for each type
- [ ] "Render now" action works from the recipe editor
- [ ] Render failures are logged and do not abort the full pipeline run
