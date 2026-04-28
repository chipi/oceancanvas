# ADR-002 — dlt for REST/JSON ingestion

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/pipeline · §stack

## Context

Several OceanCanvas sources are REST/JSON APIs returning record-shaped data: Open-Meteo Marine, NOAA NDBC buoys, Argo float profiles, SOCAT ship tracks. Each requires fetching, incremental cursor tracking (don't re-fetch what we have), and writing to disk in a queryable format.

Hand-writing this for each source means duplicating cursor logic, retry logic, and serialisation logic. A standard tool would reduce code volume and make the per-source fetcher genuinely small.

## Decision

Use dlt (data load tool) for all REST/JSON sources. dlt resources are wrapped inside Prefect tasks. dlt writes to `data/sources/` via its filesystem destination.

## Rationale

dlt's `@dlt.resource` generator model is natural for paginated/incremental REST APIs. Cursor state is tracked automatically per resource, replacing hand-written `state.json` management for these sources. Filesystem destination keeps the architecture file-based — no database introduced.

## Alternatives considered

- **Hand-written fetchers per source** — works but reproduces dlt's cursor and retry logic per source. Higher code volume, more bug surface.
- **Pandas + custom state file** — works but couples the fetcher to pandas and requires custom incremental logic.

## Consequences

**Positive:**
- Per-source fetchers are small (often under 30 lines).
- Incremental fetching works without explicit state code.
- dlt handles schema evolution and column inference automatically.

**Negative:**
- Adds dlt as a dependency.
- dlt's abstraction is suited for tabular/record data. For binary gridded data (NetCDF), it's the wrong tool — use ADR-003 instead.

## Implementation notes

- dlt resources defined inside `pipeline/src/oceancanvas/tasks/fetch.py`.
- One dlt resource per REST/JSON source.
- Wrapped in the `fetch` Prefect `@task` for retry and logging.
