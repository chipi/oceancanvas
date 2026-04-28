# ADR-007 — Puppeteer for server-side rendering

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/render-system · §stack

## Context

The pipeline must produce a PNG render for each active recipe daily, server-side, without human supervision. The rendering uses p5.js sketches (ADR-006) — designed to run in a browser. The pipeline runs in a container.

We need a way to run a real browser, headlessly, programmatically, in a Docker container. The browser must execute the same JavaScript path that the live editor preview uses, because byte-identical output between contexts is locked by ADR-008.

## Decision

Use Puppeteer with bundled headless Chromium for server-side rendering. The pipeline's Task 05 (Render) launches a Node.js subprocess that spawns Puppeteer, loads the sketch HTML, injects the render payload, waits for `window.__RENDER_COMPLETE`, screenshots the canvas, and saves the PNG.

## Rationale

Puppeteer is the most stable and widely-used solution for headless Chromium control. Its API is well-documented; its event model handles deterministic waits cleanly; it bundles a known-good Chromium version so we don't depend on the host system.

The "same browser" guarantee matters: the editor preview runs in the user's Chromium-family browser; Puppeteer runs Chromium directly. The rendering primitives match.

## Alternatives considered

- **Playwright** — Microsoft's successor, supports multiple browsers. More flexible than Puppeteer (Firefox, WebKit support) but also heavier. Puppeteer is sufficient for our needs since we only target Chromium-family.
- **Selenium** — older, slower, less designed for headless / programmatic control. Rejected.
- **Server-side p5.js via node-canvas** — runs p5.js in Node directly without a browser. Tempting (lighter than Chromium) but rendering primitives differ subtly between node-canvas and browser canvas. Pixel-identical output between editor preview and pipeline render is not guaranteed. Rejected on grounds of ADR-008 violation risk.
- **Custom WebGL renderer in Node** — would require rewriting the sketches. Rejected.

## Consequences

**Positive:**
- Browser preview and pipeline render share the same rendering path.
- Puppeteer's mature API handles edge cases (load failures, network timeouts, etc.).
- The bundled Chromium version is pinned — upgrades are deliberate.

**Negative:**
- Chromium is heavy. ~300MB in the pipeline container. Acceptable; the alternative is rendering bugs.
- Headless Chromium has occasional flake under heavy load. Mitigated by Prefect's retry policy.

## Implementation notes

- Renderer in `pipeline/src/oceancanvas/renderer/render.mjs` (Node.js subprocess, receives payload via stdin, outputs PNG via stdout).
- Pipeline container includes Node.js 20, system Chromium, and `puppeteer-core`.
- Sketch HTML is constructed inline by the renderer — no separate loader file.
- Sketch files in `sketches/` (one per render type, mounted at `/sketches` in Docker).
