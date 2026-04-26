# ADR-004 — Three-layer data store

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/data-store

## Context

The pipeline produces and consumes data in several distinct stages: raw fetched files in their native formats, browser-friendly intermediate formats, and the final daily renders. Mixing these in one folder confuses access patterns and makes it hard to reason about regenerability.

## Decision

Three top-level data folders, each with a clear role:

- **`data/sources/`** — raw fetched files in native formats (NetCDF, JSON). Not committed to git. Regenerable by re-running fetch tasks.
- **`data/processed/`** — browser-ready outputs from Task 03: flat JSON arrays, colourised PNG tiles, meta sidecars. Not committed to git. Regenerable from `data/sources/` by re-running Task 03.
- **`renders/`** — daily PNG outputs per recipe. Either committed to repo (Phase 1) or pushed to Cloudflare R2 (Phase 2).

## Rationale

Each layer has a clear input, a clear output, and a clear regeneration path. A failure in any layer doesn't corrupt the layers below it. Re-running the pipeline is idempotent; partial failures recover cleanly.

The dashboard reads from `data/processed/` directly as static assets — no API server. The render-payload builder also reads from `data/processed/`. Both consumers see the same intermediate format.

## Alternatives considered

- **Single data folder** — simpler but conflates concerns. A failed fetch and a stale processed file look the same.
- **Database-backed intermediate layer** — would require a database (violates ADR-005). Unnecessary at v1 scale.

## Consequences

**Positive:**
- Clear ownership: Task 02 owns `sources/`, Task 03 owns `processed/`, Task 05 owns `renders/`.
- Regenerability is visible in the directory structure.
- `.gitignore` rules are simple — `data/*` is ignored, `renders/` is committed (Phase 1).

**Negative:**
- Disk usage is higher than a single layer would require. Acceptable; data is regenerable so old layers can be pruned.

## Implementation notes

- Top-level folders in repo root.
- Pipeline tasks read/write only their owned layer.
- Mounts as Docker volumes in `docker-compose.yml`.
