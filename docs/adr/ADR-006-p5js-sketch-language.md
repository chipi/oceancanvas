# ADR-006 — p5.js as sketch language

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/render-system · §stack

## Context

OceanCanvas's renders are generative art produced from data. Each render type (field, particles, contour, pulse, scatter, composite) has a sketch template — a small program that consumes a payload and draws to a canvas. Sketches must run in two contexts: the browser (Recipe Editor preview) and headless Chromium (Puppeteer pipeline render).

## Decision

p5.js is the sketch language. All render-type templates and sketch overrides are p5.js sketches.

## Rationale

p5.js is designed for creative coding. The API matches the artistic mental model — `noStroke()`, `fill()`, `vertex()` — without imposing the data-vis vocabulary of D3 or the game-engine abstractions of Three.js. The community is large; sketch overrides written by users will draw on a substantial body of existing creative work.

Critically, p5.js runs in any browser the same way. The same sketch in the editor preview and in Puppeteer's headless Chromium produces the same pixels.

## Alternatives considered

- **D3.js** — designed for data visualization, not generative art. Wrong vocabulary; pulls toward chart-shaped output.
- **Three.js / WebGL** — too low-level for the kinds of pieces OceanCanvas typically produces (2D field renders, particle flows). Three.js shines for 3D; we don't need that.
- **Canvas API directly** — works but more boilerplate. p5.js sits on top and is well-suited to creative coding.
- **Custom shaders** — overkill. The render types we ship don't need GPU shaders; CPU canvas operations are sufficient at our resolutions.

## Consequences

**Positive:**
- Sketch authors find a familiar API.
- Existing p5.js learning resources apply directly.
- Browser preview and Puppeteer render produce identical output.

**Negative:**
- Performance ceiling. For very high particle counts (>50k) p5.js becomes slow. Mitigation: render types ship with sensible particle-count limits.
- p5.js is not a small library. ~750KB minified. Acceptable; it's a one-time download.

## Implementation notes

- Sketch templates in `sketches/` (one per render type).
- Sketch HTML loader in `sketches/_loader.html` — same loader used by browser preview and Puppeteer.
- Sketches read `window.OCEAN_PAYLOAD` and call `p5.setup()` / `p5.draw()`.
- A `render:complete` DOM event fires when the sketch finishes drawing — Puppeteer waits on this.
