# gallery/

The browser-side of OceanCanvas. React + Vite + TypeScript. Reads `renders/manifest.json`, renders the four customer-facing surfaces, hosts the live preview for the Recipe Editor, drives the Video Editor's audio engine.

For *why* the gallery is what it is, see [PRD-004 Gallery](../docs/prd/PRD-004-gallery.md). For the visual contract, see [UXS-004 Gallery](../docs/uxs/UXS-004-gallery.md). For the architectural decisions that shape this code, see [`OC_TA.md`](../docs/adr/OC_TA.md) `§components/web-frontend`.

---

## What's here

| Path | Purpose |
|---|---|
| `src/pages/` | The four customer-facing surfaces — `Gallery`, `GalleryDetail`, `Dashboard`, `DashboardSpread`, `RecipeEditor`, `VideoEditor`. |
| `src/components/` | Shared components — `TimelineScrubber`, `SketchPreview`, `CreativeControls`, `AudioWaveform`, `ArcEditor`. |
| `src/hooks/` | React hooks — `useManifest`, `useGenerativeAudio`. |
| `src/lib/` | Pure logic — `creativeMapping`, `payloadBuilder`, `yamlParser`, `tensionArc`, `audioEngine`, `audioEngineAmbient`, `audioEngineTypes`, `audioPresets`, `moments`, `sourceInfo`. |
| `src/tokens.css` | Design tokens shared across surfaces (colours, spacing, type). Mirrors [OC-05 Design System](../docs/concept/05-design-system.md). |
| `server/` | Tiny Node.js HTTP servers used in dev — `save-recipe.mjs` (port 3001) writes recipe YAML to disk; `export-video.mjs` (port 3002) shells out to the pipeline CLI. |
| `Caddyfile` | Static-server config for the `gallery` Docker container. Serves `/data/`, `/renders/`, `/recipes/`, `/sketches/`, `/audio/`, proxies `/api/*`. |
| `Dockerfile` | Multi-stage build — `npm run build` → Caddy serving the `dist/` SPA. |
| `vite.config.ts` | Dev server (5173) + proxies to Caddy (8080), save-server (3001), export-server (3002). |

---

## Running it

**Inside Docker (matches production).** From the repo root:

```bash
docker compose up gallery
# → http://localhost:8080
```

**Local dev (hot-reload).** From the repo root:

```bash
python3 -m http.server 8080 &   # serves data/, renders/, sketches/, recipes/
cd gallery
npm install
make gallery-dev   # OR: npm run dev (Vite at 5173) + node server/save-recipe.mjs
# → http://localhost:5173
```

The dev server proxies `/data/` etc. through to the Python file server on 8080, and the API endpoints to the save/export servers on 3001/3002.

---

## Tests

```bash
npm test          # vitest watch
npm test -- --run # one-shot
npm run build     # tsc + vite (catches type errors before bundling)
```

Tests live alongside source: `src/lib/foo.ts` ↔ `src/lib/foo.test.ts`. Cross-validation tests load fixtures from `../tests/cross-validation/` and assert byte-identical parity with the Python equivalents — see `creativeMapping.test.ts` and `tensionArc.test.ts`.

---

## Conventions

| Topic | Where it lives |
|---|---|
| State management | Local component state + URL state (React Router). No Redux, no Zustand in Phase 1 (per CLAUDE.md). |
| Styling | CSS modules. Design tokens from `src/tokens.css`. Per-component CSS file alongside the `.tsx`. |
| Naming | PascalCase files for components; kebab-case routes. |
| Sketch payload | `window.OCEAN_PAYLOAD` per [ADR-008](../docs/adr/ADR-008-shared-payload-format.md) and [ADR-019](../docs/adr/ADR-019-render-payload-schema.md). Same shape pipeline produces. |
| Audio | Web Audio API directly; no Tone.js. Two engines (`SynthEngine`, `AmbientEngine`) implement `AudioEngineInterface`. See [ADR-027](../docs/adr/ADR-027-generative-audio-composition.md). |

For full code conventions including TypeScript style, testing strategy, commit format, and the doc-system rules — read [`CLAUDE.md`](../CLAUDE.md).

---

## Adding a new surface

If you're adding a fifth customer-facing surface, the order is:

1. **PRD** — write the user-value argument in `docs/prd/PRD-NNN-name.md` (template at `docs/prd/PRD_TEMPLATE.md`).
2. **UXS** — write the visual contract in `docs/uxs/UXS-NNN-name.md` (template at `docs/uxs/UXS_TEMPLATE.md`).
3. **Update** `docs/uxs/OC_IA.md` with the new surface in the surfaces table and navigation map.
4. **Add** the route in `src/App.tsx`, the page component in `src/pages/`, the cross-surface nav links to existing pages.

If you're adding a *new component*, it lives in `src/components/`. If it has its own state and is reusable, give it a hook in `src/hooks/`. Pure transformations live in `src/lib/`.
