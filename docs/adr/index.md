# ADR Index

Architecture Decision Records for OceanCanvas. Permanent record of significant technical decisions.

ADRs are never deleted. Superseded ADRs are updated to status Superseded and link forward to the ADR that replaced them.

## Stream A — Pre-extracted from OC-04 (concept phase decisions)

| ADR | Title | Status |
|---|---|---|
| [ADR-001](ADR-001-prefect-as-orchestration.md) | Prefect as pipeline orchestration | Accepted |
| [ADR-002](ADR-002-dlt-tabular-ingestion.md) | dlt for tabular and REST source ingestion | Accepted |
| [ADR-003](ADR-003-xarray-netcdf-processing.md) | xarray + requests for NetCDF binary sources | Accepted |
| [ADR-004](ADR-004-no-database-v1.md) | No database in v1 — file-based architecture | Accepted |
| [ADR-005](ADR-005-docker-compose-deployment.md) | Docker Compose for deployment | Accepted |
| [ADR-006](ADR-006-static-file-serving.md) | Static file serving — no runtime API server | Accepted |
| [ADR-007](ADR-007-github-actions-ci-only.md) | GitHub Actions for CI only | Accepted |
| [ADR-008](ADR-008-p5js-puppeteer-rendering.md) | p5.js + Puppeteer for generative art rendering | Accepted |
| [ADR-009](ADR-009-deckgl-maplibre-dashboard.md) | deck.gl + MapLibre GL for dashboard spatial rendering | Accepted |
| [ADR-010](ADR-010-observable-plot-charts.md) | Observable Plot for time series and analytical charts | Accepted |
| [ADR-011](ADR-011-ffmpeg-video-assembly.md) | ffmpeg for video frame assembly and audio muxing | Accepted |
| [ADR-012](ADR-012-generative-music-api.md) | Generative music API for audio generation | Accepted |
| [ADR-013](ADR-013-cloudflare-r2-image-serving.md) | Cloudflare R2 for production image serving | Accepted |
| [ADR-014](ADR-014-no-auth-sources-only-v1.md) | No-authentication data sources only for v1 | Accepted |
| [ADR-015](ADR-015-editorial-design-philosophy.md) | Editorial design philosophy — dark canvas, data as hero | Accepted |

## Stream B — Post-RFC decisions

| ADR | Title | Status | Origin RFC |
|---|---|---|---|
| — | *(none yet — populated as RFCs close)* | | |

## Template

New ADRs: copy [`ADR_TEMPLATE.md`](ADR_TEMPLATE.md) and number sequentially.
