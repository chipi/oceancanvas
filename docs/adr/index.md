# ADR Index

Architectural Decision Records for OceanCanvas. Each ADR is a single decision, locked, with rationale.

The reference document for this folder is [`OC_TA.md`](OC_TA.md) — Technical Architecture. Every ADR locks a piece of TA. ADRs and TA live together because they are both *settled* — TA captures what is true now, ADRs capture how it became true.

For exploration of open technical questions that haven't yet closed into ADRs, see [`../rfc/`](../rfc/index.md).

## What gets an ADR

A single architectural decision, locked. ADRs commit. They are short. They are written *after* a decision is made, not as part of making it. ADRs are append-only — superseded by new ADRs, never edited in place.

If the decision needs deliberation first, write an [RFC](../rfc/index.md). If the work is "set up the thing", neither — it's a config file and a commit.

## Reference

| Doc | Purpose |
|---|---|
| [OC_TA.md](OC_TA.md) | Components, contracts, constraints, stack, RFC/ADR state map. The reference doc this folder anchors to. |
| [ADR_TEMPLATE.md](ADR_TEMPLATE.md) | ADR template. Read the "Notes on writing ADRs" section before starting. |

## ADRs

| ADR | Title | Status | TA anchor |
|---|---|---|---|
| [ADR-001](ADR-001-prefect-orchestration.md) | Prefect as orchestration | Accepted | §components/pipeline · §stack |
| [ADR-002](ADR-002-dlt-rest-ingestion.md) | dlt for REST/JSON ingestion | Accepted | §components/pipeline · §stack |
| [ADR-003](ADR-003-xarray-netcdf.md) | xarray + requests for NetCDF sources | Accepted | §components/pipeline · §stack |
| [ADR-004](ADR-004-three-layer-data-store.md) | Three-layer data store | Accepted | §components/data-store |
| [ADR-005](ADR-005-no-database-v1.md) | No database in v1 | Accepted | §constraints |
| [ADR-006](ADR-006-p5js-sketch-language.md) | p5.js as sketch language | Accepted | §components/render-system · §stack |
| [ADR-007](ADR-007-puppeteer-renderer.md) | Puppeteer for server-side rendering | Accepted | §components/render-system · §stack |
| [ADR-008](ADR-008-shared-payload-format.md) | Shared payload format for preview and pipeline | Accepted | §contracts/render-payload · §constraints |
| [ADR-009](ADR-009-deck-gl-maplibre.md) | deck.gl + MapLibre for spatial rendering | Accepted | §components/web-frontend · §stack |
| [ADR-010](ADR-010-observable-plot.md) | Observable Plot for time series | Accepted | §components/web-frontend · §stack |
| [ADR-011](ADR-011-docker-compose.md) | Docker Compose deployment | Accepted | §components/service-layer · §stack |
| [ADR-012](ADR-012-caddy-static-server.md) | Caddy as static file server | Accepted | §components/service-layer · §stack |
| [ADR-013](ADR-013-github-actions-code-only.md) | GitHub Actions for code CI only | Accepted | §components/ci · §stack |
| [ADR-014](ADR-014-synthetic-e2e-gate.md) | Synthetic-data e2e test as CI gate | Accepted | §components/ci |
| [ADR-015](ADR-015-processed-json-format.md) | Processed JSON format with multi-band handling | Accepted | §contracts/processed-data |
| [ADR-016](ADR-016-single-author-phase-1.md) | Single-author recipes in Phase 1 | Accepted | §components/data-store · §constraints |
| [ADR-017](ADR-017-one-layout-per-source.md) | One editorial layout per source | Accepted | §components/web-frontend |
| [ADR-018](ADR-018-recipe-yaml-schema.md) | Recipe YAML schema (flat + comment-marker) | Accepted | §contracts/recipe-yaml |
| [ADR-019](ADR-019-render-payload-schema.md) | Render payload JSON schema | Accepted | §contracts/render-payload |
| [ADR-020](ADR-020-live-preview-architecture.md) | Live preview architecture | Accepted | §components/render-system · §components/web-frontend |
| [ADR-021](ADR-021-yaml-round-tripping.md) | YAML round-tripping | Accepted | §contracts/recipe-yaml · §components/web-frontend |
| [ADR-022](ADR-022-cli-entry-point.md) | CLI entry point, invocation model, dependencies | Accepted | §components/pipeline · §stack |
| [ADR-023](ADR-023-pipeline-parallelisation.md) | Pipeline parallelisation and render concurrency | Accepted | §components/pipeline · §components/render-system |
| [ADR-024](ADR-024-key-moment-detection.md) | Key moment detection algorithm | Accepted | §components/render-system |
| [ADR-025](ADR-025-recipe-lifecycle.md) | Recipe lifecycle on source unavailability | Accepted | §components/pipeline · §constraints |
| [ADR-026](ADR-026-audio-stem-system.md) | Audio stem system | Superseded by ADR-027 | §components/render-system |
| [ADR-027](ADR-027-generative-audio-composition.md) | Generative audio composition | Accepted | §components/render-system · §contracts/recipe-yaml |
| [ADR-028](ADR-028-tension-arc-shared-curve.md) | Tension arc as shared primitive | Accepted | §components/render-system · §contracts/recipe-yaml · §contracts/render-payload |

## State map

The live state of all RFCs and ADRs lives in [`OC_TA.md §map`](OC_TA.md#map). This index mirrors the ADR portion. RFCs in deliberation are tracked in [`../rfc/index.md`](../rfc/index.md).

When an RFC closes into a new ADR, three things update together:

1. The new ADR file is added here.
2. The RFC's status flips to *Decided* in `../rfc/index.md` and in TA §map.
3. The new ADR is added to TA §map's ADRs table. If it locks a piece of §stack, the §stack table also updates with the ADR pointer.
