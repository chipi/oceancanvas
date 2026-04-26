# ADR-009: deck.gl + MapLibre GL for Dashboard Spatial Rendering

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-005-dashboard-data-explorer.md`

## Context & Problem Statement

The dashboard displays ocean data as spatial heatmaps — OISST at 1440×720 cells, ESA SST-CCI at 7200×3600 cells. These grids must render at 60fps with hover interaction (coordinate and value lookup). The dashboard also needs Argo float scatter layers and geographic context (coastlines, lat/lon grid).

## Decision

Use deck.gl for all spatial data rendering (BitmapLayer for raster tiles, ScatterplotLayer for point data) and MapLibre GL as the geographic base layer. deck.gl overlays WebGL layers on top of MapLibre.

## Rationale

deck.gl renders millions of cells at 60fps via WebGL — no other browser mapping library handles ocean-scale grids at this resolution. BitmapLayer displays pre-colourised PNG tiles from `data/processed/` as geographic overlays instantly. MapLibre GL is the open-source Mapbox alternative with free tile sources requiring no API key.

## Alternatives Considered

1. **Leaflet**
   - **Why Rejected**: SVG-based rendering cannot handle ocean grid resolutions. Performance degrades significantly at 1440×720 cells.

2. **Mapbox GL JS**
   - **Why Rejected**: Requires API key and paid plan for production use. MapLibre GL is the open-source fork with identical API.

3. **CesiumJS (3D globe)**
   - **Why Rejected**: 3D globes hide data behind the sphere and make spatial comparison harder. 2D projections are clearer for ocean data exploration.

## Consequences

**Positive:**
- 60fps rendering of full-resolution ocean grids
- BitmapLayer fast path: pre-colourised PNG tile displayed in one draw call
- JSON array loaded once per source per date — coordinate lookup is O(1) array index

**Negative:**
- WebGL required — no fallback for non-WebGL browsers (acceptable given target audience)

## Implementation Notes

React app in `gallery/`. deck.gl and MapLibre both have React bindings. Free tiles: OpenFreeMap or CARTO dark matter. No API key required for either.
