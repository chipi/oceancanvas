# sketches/

The p5.js render code. One file per render type. Loaded by Puppeteer in the pipeline (server-side) AND by the Recipe Editor in the browser (live preview) — same code, same payload, same output. Per [ADR-008](../docs/adr/ADR-008-shared-payload-format.md): if the editor preview looks right, the pipeline render looks right. Divergence is a bug.

For the language choice, see [ADR-006](../docs/adr/ADR-006-p5js-sketch-language.md) (p5.js, not WebGL). For the renderer architecture, see [ADR-007](../docs/adr/ADR-007-puppeteer-renderer.md) (Puppeteer + headless Chromium, NDJSON worker protocol per [ADR-023](../docs/adr/ADR-023-pipeline-parallelisation.md)).

---

## What's here

| File | Purpose |
|---|---|
| `shared.js` | Constants + helpers used by every sketch — colormaps (thermal, arctic, otherworldly), canvas background colour, attribution rendering, payload reading. Loaded first. |
| `field.js` | Render type `field` — continuous gridded data painted as a smooth temperature wash. SST, sea-level, anomaly. |
| `scatter.js` | Render type `scatter` — point observations (biologging, Argo) as coloured dots, sized + opacity-tuned by the recipe's creative state. |
| `particles.js` | Render type `particles` — animated particles tracing flow lines. (Currently single-frame screenshot; extension to flow data is open.) |
| `coastline.json` | Natural Earth 110m coastline, GeoJSON. Loaded by `scatter.js` for context overlay. |
| `p5.min.js` | Bundled p5.js — vendored locally so the pipeline doesn't hit a CDN. |
| `test.html` | Standalone test harness. Opens in a browser; loads a sketch with a synthetic payload; useful when iterating on render code without spinning up the pipeline. |

---

## How a sketch is invoked

Both the pipeline renderer and the Recipe Editor's live preview do the same dance:

1. **Set `window.OCEAN_PAYLOAD`** to the render payload object (per [ADR-019](../docs/adr/ADR-019-render-payload-schema.md)). Example:
   ```js
   window.OCEAN_PAYLOAD = {
     version: 2,
     recipe: { id: 'north-atlantic-sst', render: { type: 'field', colormap: 'thermal', opacity: 0.71 }, ... },
     region: { lat_min: 25, lat_max: 65, lon_min: -80, lon_max: 0 },
     output: { width: 1920, height: 1080 },
     data: { primary: { data: [...], shape: [240, 240], min: 5.2, max: 28.1, ... } }
   };
   ```
2. **Load `shared.js`**, then load the relevant sketch file (e.g. `field.js`).
3. **p5.js auto-runs**: `setup()` reads the payload, builds the canvas; `draw()` renders.
4. **Pipeline screenshots** the canvas via Puppeteer; **editor preview** displays it live.

The render is deterministic: same payload → byte-identical PNG (per the project's `determinism` constraint).

---

## Authoring a new render type

1. **Decide if you need a new sketch or can extend an existing one.** A render type is a stable user-facing contract — adding `flow_field` is an ADR-level decision. Updating `field.js` to handle a new colormap variant is not.
2. **Read** [`shared.js`](shared.js) — every sketch uses its colormap functions, attribution rendering, and payload helpers.
3. **Read one of the existing sketches** as a reference (`field.js` is the most representative).
4. **Build incrementally with `test.html`** — you don't need the pipeline running. Edit `test.html`'s `window.OCEAN_PAYLOAD` to point at synthetic data, refresh the browser.
5. **Add the new type** to the enum in [`pipeline/src/oceancanvas/schemas/recipe-schema.json`](../pipeline/src/oceancanvas/schemas/recipe-schema.json) — `render.type.enum`. Recipes referencing the new type will then validate.
6. **Update** [`recipes/README.md`](../recipes/README.md) §"Render types" with what the new type is for.
7. **Author** at least one recipe using the new type so the gallery has something to render.

The renderer subprocess in `pipeline/src/oceancanvas/renderer/` already auto-discovers sketch files in this folder. No code change needed there — drop the new `.js` in, recipes can reference it.

---

## Determinism

Sketches must be deterministic: same `OCEAN_PAYLOAD` → byte-identical output PNG. That means:

- **Use `recipe.render.seed`** for any randomness. Pass it to `randomSeed(payload.recipe.render.seed)` early in `setup()`.
- **Don't use `Date.now()`** or any clock-dependent value in render logic.
- **Don't fetch external resources at render time** — everything must be in the payload or pre-loaded (`coastline.json` is OK; an external CDN tile is not).
- **Beware of float precision** — the payload's `data[]` is JSON, so doubles round-trip cleanly, but accumulated floating-point operations can vary across browsers. Use seeded random and explicit value clamping.

The CI gate ([ADR-014](../docs/adr/ADR-014-synthetic-e2e-gate.md)) renders synthetic-data fixtures and asserts byte-identical PNGs. If your sketch fails this, you have a non-determinism source.

---

## Conventions

- ES modules disabled — sketches run in the browser as plain `<script>` tags. Use `var`/`let`/`const` and global functions.
- p5.js global mode (no instance mode unless there's a strong reason).
- Comment headers describe what the sketch is and what payload fields it reads.
- Keep sketches under ~300 lines. Anything bigger is a code smell — split into helpers in `shared.js` or a sibling utility file.
