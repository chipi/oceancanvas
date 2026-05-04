# pipeline/

The data side of OceanCanvas. Python 3.12 + Prefect + xarray + dlt + numpy. Runs daily at 06:00 UTC; fetches raw ocean data from open scientific sources; processes it; renders each recipe to a PNG via Puppeteer + p5.js; assembles MP4 timelapses with generative audio.

The full pipeline lives in [`OC-04 Pipeline Architecture`](../docs/concept/04-pipeline-architecture.md). The locked technical decisions are in [`OC_TA.md`](../docs/adr/OC_TA.md) §stack and §constraints.

---

## Six tasks

The daily flow is six tasks in this order. Each has its own module under `src/oceancanvas/tasks/` with a docstring header explaining its job.

| # | Task | Module | What it does |
|---|---|---|---|
| 1 | Discover | `tasks/discover.py` | For each source, finds the latest available date. Handles the "is today's data ready yet?" question. |
| 2 | Fetch | `tasks/fetch.py` | Downloads raw source data to `data/sources/`. NetCDF via xarray; REST/JSON via dlt. Idempotent. |
| 3 | Process | `tasks/process.py` | Converts raw data to a browser-friendly intermediate JSON in `data/processed/`. Crops, regrids, applies thermal colour mapping where relevant. |
| 4 | Build payload | `tasks/build_payload.py` | Per recipe: reads processed data, crops to the recipe's region, assembles the render payload (per [ADR-008](../docs/adr/ADR-008-shared-payload-format.md) / [ADR-019](../docs/adr/ADR-019-render-payload-schema.md)). |
| 5 | Render | `tasks/render.py` | Spawns Puppeteer + headless Chromium, loads the relevant p5.js sketch with the payload, screenshots a PNG to `renders/{recipe}/{date}.png`. |
| 6 | Index | `tasks/index.py` | Walks `renders/`, rebuilds `manifest.json` from scratch. The gallery's source of truth. |

`flow.py` orchestrates them. `parallel_flow.py` is the production variant with per-recipe parallelism (per [ADR-023](../docs/adr/ADR-023-pipeline-parallelisation.md)).

---

## Other modules

| Module | Purpose |
|---|---|
| `audio.py` | Generative audio synthesis. Four-layer engine ([ADR-027](../docs/adr/ADR-027-generative-audio-composition.md)) with tension-arc envelope ([ADR-028](../docs/adr/ADR-028-tension-arc-shared-curve.md)) and Record Moment hold. Numpy + stdlib `wave`; ffmpeg only for sample decode + AAC encode. |
| `arc.py` | Tension-arc expansion (RFC-011 / ADR-028). Mirrors `gallery/src/lib/tensionArc.ts` — cross-validated TS↔Py via `tests/cross-validation/tension_arc_fixtures.json`. |
| `creative_mapping.py` | Creative state → technical render params + audio params. Mirrors `gallery/src/lib/creativeMapping.ts`. Cross-validated. |
| `moments.py` | Per-frame intensity signal + key-moment detection (peaks, records, inflections, thresholds). [ADR-024](../docs/adr/ADR-024-key-moment-detection.md). |
| `video.py` | MP4 assembly. ffmpeg concat for visuals; `_build_arc_chain` for arc-keyed `eq=saturation` + `vignette`; `_inject_hold` for the Record Moment hold. |
| `cli.py` | The `oceancanvas` CLI (per [ADR-022](../docs/adr/ADR-022-cli-entry-point.md)) — `run` / `backfill` / `render` / `fetch-historical` / `status` / `recipes` / `index` / `export-video`. |
| `backfill.py` | Multi-date pipeline runs for historical data. |
| `renderer/` | Node.js subprocess that hosts the Puppeteer + Chromium pipe ([ADR-007](../docs/adr/ADR-007-puppeteer-renderer.md)). Persistent worker NDJSON protocol per [ADR-023](../docs/adr/ADR-023-pipeline-parallelisation.md). |
| `schemas/recipe-schema.json` | JSON Schema for recipe YAML validation. Loaded by `_load_recipe`. |
| `io.py` | Atomic file writes; safe path handling. |
| `log.py` | Logger that prefers Prefect's `get_run_logger()` inside a flow context, falls back to stdlib `logging` in tests. No `print` in pipeline code. |

---

## Running it

**Inside Docker.** From the repo root:

```bash
docker compose up
make pipeline-run    # trigger immediately rather than waiting for 06:00 UTC
```

**Locally.** From the repo root:

```bash
cd pipeline
uv sync --extra dev
uv run oceancanvas run     # full daily flow
uv run oceancanvas status  # see what's been rendered
```

CLI commands assume `DATA_DIR`, `RECIPES_DIR`, `RENDERS_DIR` env vars (see `cli.py` for defaults — they fall back to `/data`, `/recipes`, `/renders` for Docker, or the project-relative paths for local dev). `oceancanvas --help` lists all commands.

---

## Tests

```bash
cd pipeline
uv run pytest tests/                          # all tests (~36s — most time is import+xarray)
uv run pytest tests/unit/                     # unit only
uv run pytest tests/unit/test_audio.py -v     # one file
uv run pytest -m "not slow"                   # skip live-API tests (default — see pyproject.toml)
```

Three tiers per [`CLAUDE.md` § Testing strategy](../CLAUDE.md):

- **Unit** (`tests/unit/`) — pure-function tests; mocked subprocess + filesystem. Fast.
- **Cross-validation** (loaded from `tests/cross-validation/*.json`) — shared fixtures verifying TS↔Py parity for `creative_mapping`, `creative_audio`, and `tension_arc`. Each fixture file is generated by a script under `scripts/build-*.mjs`; both Python and TypeScript tests assert against it.
- **End-to-end** (`e2e/` at the repo root, separate Playwright config) — full Docker Compose stack against fixture data.

---

## Adding a source

If you're integrating a new data source, the order is:

1. **Update** [`docs/concept/03-data-catalog.md`](../docs/concept/03-data-catalog.md) — add the source, terms, frequency, processing notes. Single source of truth for catalogue.
2. **Decide** the ingestion path: REST/JSON → dlt; NetCDF → xarray + requests; something else → write an RFC.
3. **Implement** in `tasks/fetch.py` (download) and `tasks/process.py` (convert to processed JSON).
4. **Add** processed-data tests with synthetic fixtures (per [ADR-014 — synthetic-data e2e gate](../docs/adr/ADR-014-synthetic-e2e-gate.md)).
5. **Author** at least one recipe using the new source so the gallery has something to render.

If the source needs auth (API keys), it can't ship in Phase 1 — see the no-auth constraint in [`OC_TA.md`](../docs/adr/OC_TA.md) §constraints. That requires an ADR upgrade.

---

## Conventions

For Python style, type hints, ruff settings, and commit format — read [`CLAUDE.md`](../CLAUDE.md). The short version:

- Python 3.12; type hints on every signature
- `ruff format` + `ruff check`
- `pyproject.toml`, no `requirements.txt`
- File I/O via `pathlib.Path`, never string concatenation
- Logging via `oceancanvas.log.get_logger()`, never `print`
- Each pipeline task has a unit test against synthetic data
