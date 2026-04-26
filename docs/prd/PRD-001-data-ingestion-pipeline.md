# PRD-001: Data Ingestion Pipeline

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-001-recipe-yaml-schema.md`, `docs/rfc/RFC-007-github-actions-ci-design.md`
- **Related ADRs**: `docs/adr/ADR-001-prefect-as-orchestration.md`, `docs/adr/ADR-002-dlt-tabular-ingestion.md`, `docs/adr/ADR-003-xarray-netcdf-processing.md`, `docs/adr/ADR-004-no-database-v1.md`, `docs/adr/ADR-005-docker-compose-deployment.md`, `docs/adr/ADR-007-github-actions-ci-only.md`
- **Source**: OC-02 Section 4 (Pipeline), OC-04 Section 1–6

## Summary

The data ingestion pipeline is the automated daily system that fetches ocean data from 15 open-government sources, processes it into browser-friendly formats, renders generative art from active recipes, and indexes the results. It runs at 06:00 UTC every day without human intervention. This is the engine that makes OceanCanvas a living gallery rather than a static one.

## Background & Context

OceanCanvas's core promise is that a recipe renders once per day automatically. Without the pipeline, there is no gallery — the recipe editor produces a YAML file and the gallery shows nothing. The pipeline is the connective tissue between the creative act (writing a recipe) and the output (an accumulating archive of renders).

The pipeline must be robust enough to run unattended daily, recoverable when individual sources fail, and transparent enough that a developer can diagnose problems from logs without SSH access to the production server.

## Goals

- Fetch fresh data from all 15 confirmed no-auth sources on a daily schedule
- Process raw source data into a standardised format readable by the dashboard and renderer
- Render every active recipe as a PNG using its p5.js sketch template
- Index all renders so the gallery can serve them without scanning the filesystem
- Recover gracefully from individual source or recipe failures without aborting the full run
- Run identically on developer laptop and production VPS via Docker Compose

## Non-Goals

- Real-time or sub-daily data fetching — daily cadence is sufficient for all 15 v1 sources
- Auth-required sources (Copernicus CMEMS, NASA Earthdata direct) — deferred to later phase
- Serving data to the browser — the pipeline writes files; Caddy serves them statically (ADR-006)
- Recipe management (creating, renaming, archiving) — covered in PRD-003

## Personas

- **The self-hoster**: Clones the repo, edits recipes, runs `docker compose up`. Expects the pipeline to run on schedule and produce renders without further intervention.
- **The developer**: Debugs pipeline failures, adds new sources, extends the render type system. Needs clear logs, task state history, and a recoverable run model.

## User Stories

- *As a self-hoster, I can run `docker compose up` and have the pipeline fetch data and render my recipes every day at 06:00 UTC without touching the terminal again.*
- *As a developer, I can see the status of every pipeline task in the Prefect UI and identify exactly which source or recipe failed.*
- *As a developer, I can restart a failed pipeline run from the failed task without re-processing sources that already succeeded.*

## Functional Requirements

### FR1: Orchestration

- **FR1.1**: The pipeline runs as a Prefect `@flow` on a daily schedule at 06:00 UTC
- **FR1.2**: All pipeline steps are Prefect `@task` functions with retry policies on network failure (3 retries, exponential backoff)
- **FR1.3**: Prefect Server runs as a Docker Compose service alongside the pipeline worker
- **FR1.4**: The Prefect UI is accessible at `localhost:4200` showing run history, task states, and logs

### FR2: Task 01 — Discover

- **FR2.1**: For each source, query the latest available date before fetching
- **FR2.2**: ERDDAP sources use the `/info/{datasetID}/index.json` endpoint to get the last time value
- **FR2.3**: Open-Meteo is always today; GEBCO never changes (static)
- **FR2.4**: Discovery results are passed to the fetch task to prevent requesting data that does not yet exist

### FR3: Task 02 — Fetch

- **FR3.1**: NetCDF sources (OISST, GEBCO, ESA CCI series, NSIDC) fetched via xarray + requests from ERDDAP griddap URLs
- **FR3.2**: REST/JSON sources (Open-Meteo, NDBC, Argo, SOCAT) fetched via dlt with incremental cursor tracking
- **FR3.3**: Raw files written to `data/sources/{source_id}/{YYYY-MM-DD}.{ext}` — gitignored, regenerable
- **FR3.4**: A source fetch failure marks that source's tasks as failed but does not abort other sources

### FR4: Task 03 — Process

- **FR4.1**: For each source and date, produce three outputs in `data/processed/{source_id}/{YYYY-MM-DD}/`: a flat float32 JSON array, a colourised PNG tile, and a meta sidecar JSON
- **FR4.2**: Processing is idempotent — if outputs already exist for a source/date, the task is a cache hit and is skipped
- **FR4.3**: The processing region is configured per source (e.g. North Atlantic 20°N–75°N, 90°W–10°E)
- **FR4.4**: The meta sidecar records: date, source_id, shape, min, max, nan_pct, processing_region, processing_timestamp

### FR5: Task 04 — Build Payload

- **FR5.1**: For each active recipe, read `data/processed/` for the sources the recipe requires
- **FR5.2**: Crop data to the recipe's specific lat/lon region
- **FR5.3**: Assemble a `render_payload.json` containing: primary data array, context data (GEBCO), audio scalars, region bounds, metadata
- **FR5.4**: Payload written to a temporary path and cleaned up after Task 06

### FR6: Task 05 — Render

- **FR6.1**: For each active recipe, launch a Puppeteer subprocess with headless Chromium
- **FR6.2**: Load the recipe's p5.js sketch HTML, inject the render payload as `window.OCEAN_PAYLOAD`
- **FR6.3**: Wait for the `render:complete` DOM event (max 30 seconds)
- **FR6.4**: Screenshot the canvas and write to `renders/{recipe_name}/{YYYY-MM-DD}.png`
- **FR6.5**: A render failure for one recipe does not abort other recipes

### FR7: Task 06 — Index

- **FR7.1**: Walk the `renders/` directory and collect all PNGs with their metadata
- **FR7.2**: Rebuild `renders/manifest.json` from scratch — no append, full rebuild
- **FR7.3**: Clean up all temporary payload files from Task 04
- **FR7.4**: Update Prefect flow state to complete

## Success Metrics

- 95% of daily runs complete without manual intervention
- Individual source or recipe failures do not abort the full run
- A failed run can be restarted from the failed task within 5 minutes
- The Prefect UI shows full task history for the last 30 days

## Dependencies

- PRD-002: Data processing step (Task 03 detail)
- PRD-003: Recipe system (defines what active recipes are)
- PRD-004: Rendering pipeline (Task 05 detail)
- RFC-001: Recipe YAML schema (defines what the pipeline reads)

## Constraints & Assumptions

**Constraints:**
- All 15 v1 sources require no authentication — no secrets management in v1
- Pipeline runs on self-hosted hardware (developer laptop or Hetzner VPS)
- Docker and Docker Compose must be installed on the host

**Assumptions:**
- 06:00 UTC is after all daily sources have updated (verified per source in OC-03)
- Network connectivity to NOAA ERDDAP, ESA CCI portal, and Open-Meteo is available at run time

## Release Checklist

- [ ] Prefect flow with 6 tasks running on daily schedule
- [ ] All 3 Phase 1 sources (OISST, Open-Meteo, GEBCO) fetching and processing correctly
- [ ] At least one recipe rendering successfully end to end
- [ ] manifest.json rebuilt correctly after each run
- [ ] E2e test passing in GitHub Actions (RFC-007) with synthetic 10×10 data
- [ ] Prefect UI accessible at localhost:4200
