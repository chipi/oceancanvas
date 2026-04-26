# ADR-009 — deck.gl + MapLibre for spatial rendering

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/web-frontend · §stack

## Context

The Dashboard renders ocean data — gridded fields, scatter point clouds, anomaly maps — over a geographic base. The data volumes are non-trivial: a 0.25° OISST grid is 1440×720 cells globally. The Recipe Editor draws bounding boxes on a map that pass to the recipe definition.

Two requirements: high-performance rendering of ocean-scale data, and a competent geographic base layer with coastlines and labels.

## Decision

Use **deck.gl** for data layers (heatmaps, scatter, vector fields) and **MapLibre GL JS** for the geographic base layer. deck.gl renders WebGL data layers on top of MapLibre's vector base. Both are open-source and require no API key.

## Rationale

deck.gl is purpose-built for high-performance data visualization on maps. WebGL-accelerated. Ocean-scale grids render at 60fps. The component model (BitmapLayer, ScatterplotLayer, GeoJsonLayer) maps cleanly to the kinds of layers OceanCanvas needs.

MapLibre is the open-source fork of Mapbox GL JS, free of API key requirements. Tile sources like OpenFreeMap or CARTO dark matter give us a clean dark base layer aligned with OceanCanvas's design language.

## Alternatives considered

- **Leaflet** — SVG-based; cannot handle ocean grid resolutions. A 1440×720 SVG choke-points the browser. Rejected on performance grounds.
- **CesiumJS / 3D globe** — 3D hides data behind the sphere, makes spatial comparison harder, adds rendering complexity. 2D projections are clearer for ocean exploration. Rejected.
- **Mapbox GL JS** — requires an API key. Violates the open-by-default constraint. Rejected.
- **deck.gl with Google Maps** — same API-key problem.

## Consequences

**Positive:**
- 60fps rendering of full-globe ocean grids.
- Hover interactions feel native.
- No API keys, no usage limits, no service dependency.

**Negative:**
- WebGL fallbacks needed for browsers without GPU support (rare in practice).
- MapLibre is less polished than Mapbox in some edge cases (3D buildings, terrain). We don't use those features.

## Implementation notes

- Dashboard React components in `gallery/src/dashboard/`.
- Base map setup in `gallery/src/dashboard/Map.tsx`.
- Tile source: OpenFreeMap or CARTO dark matter (no key required).
- Data layers as deck.gl React components.
