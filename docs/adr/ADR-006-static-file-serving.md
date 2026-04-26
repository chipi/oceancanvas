# ADR-006: Static File Serving — No Runtime API Server

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-005-dashboard-data-explorer.md`

## Context & Problem Statement

The dashboard, gallery, and recipe editor need to serve ocean data to the browser. The question is whether this requires a runtime API server or whether all data can be served as static files.

## Decision

No runtime API server. Everything the browser needs is served as static files by Caddy. The React app reads `manifest.json` for the gallery index, `data/processed/{source}/{date}.json` for hover interaction, and `data/processed/{source}/{date}.png` for heatmap tiles.

## Rationale

All data produced by the pipeline is already file-shaped. The processed JSON arrays, PNG tiles, and meta sidecars are written to disk by Task 03. The manifest is written by Task 06. There is nothing a runtime API would compute that the pipeline has not already computed. Serving static files is simpler, more reliable, and cheaper than running a server process.

## Alternatives Considered

1. **FastAPI or Flask backend**
   - **Pros**: Could serve dynamic queries (arbitrary lat/lon ranges, on-demand processing)
   - **Cons**: Adds a stateful service that must stay running, handle errors, and be maintained. At v1 scale all queries are predictable and can be pre-computed by the pipeline.
   - **Why Rejected**: Unnecessary complexity. The pipeline pre-computes everything the browser needs.

## Consequences

**Positive:**
- No runtime API to maintain, monitor, or scale
- Caddy handles HTTPS, compression, and caching automatically
- All files are cacheable — the CDN (Cloudflare R2 in production) handles load

**Negative:**
- Dynamic queries (arbitrary region subsets) are not possible without a server — deferred to future phase

## Implementation Notes

Caddy serves `renders/`, `data/processed/`, and the built React app from the same origin. File layout: `data/processed/{source_id}/{YYYY-MM-DD}.{json|png|meta.json}`.
