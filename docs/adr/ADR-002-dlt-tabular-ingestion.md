# ADR-002: dlt for Tabular and REST Source Ingestion

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`

## Context & Problem Statement

Four OceanCanvas sources (Open-Meteo Marine API, NOAA NDBC buoys, Argo float profiles, SOCAT ship tracks) are REST APIs returning JSON records. Each requires incremental fetching — tracking the last fetched cursor value so subsequent runs only fetch new records. Hand-writing cursor state management for four sources creates four places where state bugs can silently corrupt the archive.

## Decision

Use dlt (data load tool) inside Prefect tasks for all REST/JSON sources. dlt handles incremental cursor tracking automatically via its `@dlt.resource` generator model. dlt writes to files via its filesystem destination — no database dependency introduced.

## Rationale

dlt's incremental cursor state built-in replaces hand-written `state.json` management for tabular sources. The `@dlt.resource` generator model is natural for sources that return paginated JSON records. Writing to the filesystem destination keeps the architecture consistent — everything is file-based.

## Alternatives Considered

1. **Hand-written state management**
   - **Pros**: No additional dependency
   - **Cons**: Four separate implementations, each a potential source of subtle bugs. State file corruption would silently cause duplicate or missing records.
   - **Why Rejected**: dlt solves exactly this problem and is actively maintained for it.

2. **Singer/Meltano taps**
   - **Pros**: Large ecosystem of existing taps
   - **Cons**: Heavy framework for four sources; no existing taps for Open-Meteo or NDBC in the required format
   - **Why Rejected**: Over-engineered for four sources with well-documented APIs.

## Consequences

**Positive:**
- Incremental state per source tracked automatically
- `@dlt.resource` generator pattern handles pagination naturally
- Consistent filesystem output — no database dependency

**Negative:**
- Team must learn dlt's resource model for new tabular source additions

**Neutral:**
- dlt is used only for REST/JSON sources. NetCDF binary sources use xarray + requests directly (ADR-003). Two patterns, genuinely different data shapes.

## Implementation Notes

Sources using dlt: `pipeline/fetch_openmeteo.py`, `pipeline/fetch_ndbc.py`, `pipeline/fetch_argo.py`, `pipeline/fetch_socat.py`. dlt filesystem destination writes to `data/sources/{source_id}/`.
