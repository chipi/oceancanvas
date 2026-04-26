# OC_TA — Technical Architecture

- **Status** · v1.0 · April 2026
- **Type** · Reference document — structured for linking-into, not reading end-to-end
- **Lives at** · `docs/adr/OC_TA.md` (with the ADRs — TA captures what is settled, ADRs are the unit of settling)
- **Parallel to** · `docs/prd/OC_PA.md` · `docs/uxs/OC_IA.md`
- **Derived from** · OC-04 Pipeline Architecture · OC-03 Data Catalog

This document holds the structural reasoning that every RFC and ADR inherits — the components OceanCanvas is built from, the contracts between them, the constraints every change must honour, the locked stack, and the state board of every architectural question. Individual RFCs and ADRs link into specific sections rather than restating components or constraints per artifact.

TA holds *what is true across the system*. Per-question deliberation lives in RFCs ([`../rfc/`](../rfc/index.md)). Per-decision commitment lives in ADRs (this folder). TA is the document RFCs and ADRs anchor to so they don't have to carry that work themselves.

The §map at the bottom is the live state board — it is the single place to see what is open, what is decided, and what supersedes what. The folder-local indexes ([`./index.md`](index.md) for ADRs, [`../rfc/index.md`](../rfc/index.md) for RFCs) mirror the relevant slice of §map for direct discovery.

---

## §components

OceanCanvas is six subsystems with sharp boundaries. Each subsystem owns its concerns; cross-subsystem communication happens only through the contracts in §contracts.

### pipeline

The Prefect-orchestrated daily flow. Six tasks: discover (latest available date per source) → fetch (raw data to `data/sources/`) → process (raw to `data/processed/`) → build payload (per recipe) → render (Puppeteer + p5.js) → index (rebuild `manifest.json`). Runs at 06:00 UTC. Self-hosted in a Docker container. Owns: data acquisition, format normalisation, render orchestration.

### data-store

Three-layer file-based storage. `data/sources/` holds raw fetched files in their native formats (NetCDF, JSON). `data/processed/` holds browser-friendly outputs (flat JSON arrays, colourised PNG tiles, meta sidecars). `renders/` holds the daily PNG outputs per recipe. None of these are committed to git in v1; all are regenerable. Owns: persistence, regenerability, the contracts between pipeline tasks.

### render-system

The p5.js + Puppeteer rendering subsystem. Browser-side: the same sketch runs in the Recipe Editor preview and in the Puppeteer headless render. Server-side: Node.js subprocess launches Chromium, injects the render payload, waits for `render:complete`, screenshots the canvas. Owns: deterministic image production from a recipe + a payload.

### web-frontend

Static React app served from `gallery/`. deck.gl + MapLibre for spatial rendering. Observable Plot for time series. Reads `data/processed/` files and `manifest.json` directly as static assets. No runtime API server. Owns: the dashboard, the recipe editor, the gallery, the video editor — all four customer-facing surfaces.

### service-layer

Docker Compose stack. Three containers: `pipeline` (Python 3.12 + Node.js 20 + Chromium), `gallery` (Caddy serving the built React app), `prefect-server` (Prefect Server + Postgres for flow state). Volumes mount `data/`, `recipes/`, `renders/` from the host. Owns: deployment, container orchestration, the runnable system.

### ci

GitHub Actions for code validation only. Lint, unit tests, build Docker image, run a synthetic-data e2e test of the full pipeline. Never runs the production data pipeline. Owns: code-quality gating between development and production.

---

## §contracts

The data shapes that flow between components. Every contract is a stable interface — components on either side depend on it, and changing it is a breaking change.

### recipe.yaml

The authored work. One YAML file per recipe in `recipes/`. Specifies: id, name, region (lat/lon bounds), source(s), render type, creative parameters, optional sketch override. Read by the pipeline at fetch and render time. Read by the recipe editor for round-tripping. Schema defined by **RFC-001 → ADR (pending)**.

### data/processed/{source}/{date}.*

The pipeline's intermediate format. Three files per source per date: `.json` (flat float32 array + shape + min/max + lat/lon range + metadata), `.png` (colourised tile at processing-region resolution), `.meta.json` (statistics sidecar). Read by the dashboard for live visualisation, by the render-payload builder for recipe assembly. Format defined by **ADR-015**.

### render payload (`window.OCEAN_PAYLOAD`)

The data structure injected into the p5.js sketch at render time. Contains primary source array, context data (bathymetry), audio scalars, region bounds, recipe metadata. Same payload format used in the Recipe Editor preview and in the Puppeteer pipeline render — this parity is non-negotiable. Schema defined by **RFC-002 → ADR (pending)**.

### manifest.json

The gallery index. Lists all recipes, all render dates, dimensions and metadata for each. Rebuilt from scratch by pipeline Task 06 (Index). Read by the React gallery and the video editor. No partial updates — full rebuild each day.

---

## §constraints

The non-negotiables. Every RFC must honour these. A change to any of them is a major architectural shift requiring its own ADR and likely an updated TA.

### file-based storage in v1

No database. Recipe configs are YAML files. Pipeline state is JSON. Manifest is JSON. Renders are PNGs on disk. The system is `git clone` + `docker compose up`-able with no service dependencies. SQLite is permitted if the manifest grows large enough to require it; nothing more in Phase 1.

### deterministic rendering

Same recipe + same source data + same date = same render. Always. The render is a function, not an experiment. No random seeds left unset. No clock-dependent code paths. Re-running the pipeline produces byte-identical PNGs.

### daily cadence is sacred

The pipeline runs once at 06:00 UTC. Manual renders are the exception, never the rule. The system's primary mode is unattended. Anything that requires the pipeline to run more often than daily — for any reason — needs its own ADR.

### no-auth sources only in Phase 1

No source requiring API keys or authentication ships in v1. If a source becomes essential and requires auth, that is a deliberate ADR upgrading from `open-by-default`, not a drift.

### self-hostable end-to-end

Anyone with Docker can clone the repo and run the full stack on their machine. No cloud-only services in the critical path. Cloudflare R2 (Phase 2) is optional even when added — local serving via Caddy must remain a working alternative.

### shared payload format for preview and pipeline

The Recipe Editor's live preview runs the same p5.js sketch with the same payload format that the Puppeteer pipeline renders with. If the editor preview looks right, the pipeline render looks right. Any divergence between these paths is a bug, not a trade-off.

### attribution baked in

Source attribution is part of every render. Removing it requires a deliberate code change; including it is the default. (The promise side of this constraint lives in `OC_PA.md §promises/citation-travels`.)

---

## §stack

The locked tech choices. Each entry points to its ADR. Changes happen by writing a new ADR that supersedes the existing one — never by edit-in-place.

| Layer | Choice | Locked by |
|---|---|---|
| **Orchestration** | Prefect | [ADR-001](ADR-001-prefect-orchestration.md) |
| **REST/JSON ingestion** | dlt (data load tool) | [ADR-002](ADR-002-dlt-rest-ingestion.md) |
| **NetCDF ingestion** | xarray + requests | [ADR-003](ADR-003-xarray-netcdf.md) |
| **Data storage model** | Three-layer file-based (`sources/`, `processed/`, `renders/`) | [ADR-004](ADR-004-three-layer-data-store.md) |
| **Database** | None in v1 | [ADR-005](ADR-005-no-database-v1.md) |
| **Sketch language** | p5.js | [ADR-006](ADR-006-p5js-sketch-language.md) |
| **Server-side renderer** | Puppeteer + headless Chromium | [ADR-007](ADR-007-puppeteer-renderer.md) |
| **Render payload format** | Single payload for preview and pipeline | [ADR-008](ADR-008-shared-payload-format.md) |
| **Browser spatial rendering** | deck.gl + MapLibre GL | [ADR-009](ADR-009-deck-gl-maplibre.md) |
| **Browser charts** | Observable Plot | [ADR-010](ADR-010-observable-plot.md) |
| **Deployment** | Docker Compose | [ADR-011](ADR-011-docker-compose.md) |
| **Static file server** | Caddy | [ADR-012](ADR-012-caddy-static-server.md) |
| **CI** | GitHub Actions, code-only | [ADR-013](ADR-013-github-actions-code-only.md) |
| **CI gate** | Synthetic-data e2e | [ADR-014](ADR-014-synthetic-e2e-gate.md) |
| **Processed JSON format** | Multi-band as separate files | [ADR-015](ADR-015-processed-json-format.md) |
| **Recipe authorship** | Single-author in Phase 1 | [ADR-016](ADR-016-single-author-phase-1.md) |
| **Editorial layout** | One per source | [ADR-017](ADR-017-one-layout-per-source.md) |

---

## §map

The live state board. Open RFCs are under deliberation. Decided RFCs have closed into ADRs. ADRs are accepted or superseded.

### RFCs · [folder index](../rfc/index.md)

| RFC | Title | Status | Closes into |
|---|---|---|---|
| [RFC-001](../rfc/RFC-001-recipe-yaml-schema.md) | Recipe YAML schema | Draft v0.1 | ADR (pending) |
| [RFC-002](../rfc/RFC-002-render-payload-format.md) | Render payload format | Draft v0.1 | ADR-008 (locked principle) + ADR (pending, schema) |
| [RFC-003](../rfc/RFC-003-recipe-lifecycle.md) | Recipe lifecycle on source unavailability | Draft v0.1 | ADR (pending) |
| [RFC-004](../rfc/RFC-004-live-preview-architecture.md) | Live preview architecture | Draft v0.1 | ADR (pending) |
| [RFC-005](../rfc/RFC-005-yaml-round-tripping.md) | YAML round-tripping | Draft v0.1 | ADR (pending) |
| [RFC-006](../rfc/RFC-006-audio-system.md) | Audio system design | Draft v0.1 | Multiple ADRs (pending) |
| [RFC-007](../rfc/RFC-007-key-moment-detection.md) | Key moment detection | Draft v0.1 | ADR (pending) |

### ADRs · [folder index](index.md)

| ADR | Title | Status |
|---|---|---|
| [ADR-001](ADR-001-prefect-orchestration.md) | Prefect as orchestration | Accepted |
| [ADR-002](ADR-002-dlt-rest-ingestion.md) | dlt for REST/JSON ingestion | Accepted |
| [ADR-003](ADR-003-xarray-netcdf.md) | xarray + requests for NetCDF sources | Accepted |
| [ADR-004](ADR-004-three-layer-data-store.md) | Three-layer data store | Accepted |
| [ADR-005](ADR-005-no-database-v1.md) | No database in v1 | Accepted |
| [ADR-006](ADR-006-p5js-sketch-language.md) | p5.js as sketch language | Accepted |
| [ADR-007](ADR-007-puppeteer-renderer.md) | Puppeteer for server-side rendering | Accepted |
| [ADR-008](ADR-008-shared-payload-format.md) | Shared payload format for preview and pipeline | Accepted |
| [ADR-009](ADR-009-deck-gl-maplibre.md) | deck.gl + MapLibre for spatial rendering | Accepted |
| [ADR-010](ADR-010-observable-plot.md) | Observable Plot for time series | Accepted |
| [ADR-011](ADR-011-docker-compose.md) | Docker Compose deployment | Accepted |
| [ADR-012](ADR-012-caddy-static-server.md) | Caddy as static file server | Accepted |
| [ADR-013](ADR-013-github-actions-code-only.md) | GitHub Actions for code CI only | Accepted |
| [ADR-014](ADR-014-synthetic-e2e-gate.md) | Synthetic-data e2e test as CI gate | Accepted |
| [ADR-015](ADR-015-processed-json-format.md) | Processed JSON format with multi-band handling | Accepted |
| [ADR-016](ADR-016-single-author-phase-1.md) | Single-author recipes in Phase 1 | Accepted |
| [ADR-017](ADR-017-one-layout-per-source.md) | One editorial layout per source | Accepted |

---

## How RFCs and ADRs reference this doc

RFCs and ADRs link into TA sections by anchor. The conventions:

```
TA anchor · §components/pipeline · §contracts/recipe-yaml
Constraints · file-based storage in v1, deterministic rendering (TA §constraints)
Stack · Prefect, p5.js, Puppeteer (TA §stack)
```

ADRs in this folder reference TA with relative paths (`OC_TA.md` — same folder). RFCs in `../rfc/` reference TA with `../adr/OC_TA.md`.

An RFC that doesn't reference any TA section is a smell. It usually means either (a) the question can be answered without affecting the architecture, in which case it should not be an RFC, or (b) the RFC is restating TA-level content instead of using it.

ADRs reference the TA section they constrain or unlock. An ADR that locks a component or contract should be explicitly linked from the corresponding §components or §contracts entry.

---

## What this doc is not

| Doc | Mode | Holds |
|---|---|---|
| **OC-04 Pipeline Architecture** | Narrative | The technical concept — how the pipeline works at the idea level. Read once. |
| **OC_TA** (this doc) | Reference, structural | Components, contracts, constraints, stack, RFC/ADR map. Linked to. |
| **RFC** | Proposal, per-question | One open technical question with alternatives and trade-offs. |
| **ADR** | Record, per-decision | One decision, locked, with rationale. Append-only. |

TA does not hold per-question deliberation, per-decision rationale, narrative explanation, implementation specs, or the contents of any artifact. If a section here drifts toward any of those, it belongs in the corresponding doc, not here.

---

## Open threads

- **Phase 2 image serving.** Cloudflare R2 is named in OC-04 but not yet decided. Becomes an ADR when public hosting is on the table.
- **Database upgrade.** SQLite is permitted under ADR-005 if the manifest grows; the threshold isn't defined. Worth an ADR if the trigger is hit.
- **Multi-recipe authoring.** PRD-001 confirms single-author in Phase 1 (ADR-016). Multi-author is deferred indefinitely; document the deferral in TA when revisited.
- **Source extension RFCs.** Adding new no-auth sources beyond the OC-03 catalog probably doesn't need RFCs (each is a fetcher and a process step). New auth-required sources do — they cross §constraints/no-auth-sources.
