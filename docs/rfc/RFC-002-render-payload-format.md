# RFC-002: Render Payload Format

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-004-rendering-pipeline.md`, `docs/prd/PRD-006-recipe-editor-studio.md`
- **Related ADRs**: `docs/adr/ADR-008-p5js-puppeteer-rendering.md`

## Abstract

This RFC defines the format of `window.OCEAN_PAYLOAD` — the data structure injected into every p5.js sketch at render time. The payload is the contract between the pipeline (which builds it in Task 04) and the sketch (which consumes it). The same payload is used in both the browser live preview and the Puppeteer pipeline render.

**Architecture Alignment:** The payload is assembled by Task 04 (Build Payload) from `data/processed/` outputs and injected by Puppeteer before sketch execution (ADR-008).

## Problem Statement

Without a formal payload specification, sketch authors (both internal and external) cannot write sketches confidently. The pipeline and the sketch must agree on the exact structure, key names, and data types. A mismatch causes silent failures — the sketch renders nothing or renders incorrectly.

## Goals

1. Define all fields in `window.OCEAN_PAYLOAD` with types and semantics
2. Ensure the payload is sufficient for all six render types
3. Keep the payload format stable so existing sketches continue to work as new sources are added

## Design & Implementation

### 1. Payload structure

```javascript
window.OCEAN_PAYLOAD = {
  // Metadata
  meta: {
    recipe_name: "north_atlantic_sst",  // string
    date: "2026-04-25",                  // string — ISO date of the render
    render_type: "field",                // string — field|particles|contour|pulse|scatter|composite
    source_id: "oisst",                  // string — primary source identifier
    canvas_width: 1200,                  // integer — pixels
    canvas_height: 900,                  // integer — pixels
  },

  // Primary source data — gridded (for field, particles, contour, composite)
  primary: {
    values: Float32Array,     // flat 1D array, row-major (lat × lon)
    shape: [lat_count, lon_count],  // integer array [2]
    min: number,              // float — data minimum in the recipe region
    max: number,              // float — data maximum in the recipe region
    lat_range: [lat_min, lat_max],  // float array [2]
    lon_range: [lon_min, lon_max],  // float array [2]
    nan_mask: Uint8Array,     // 1 where value is null/NaN, 0 where valid
    units: "°C",              // string — physical units
    label: "Sea Surface Temperature",  // string — human-readable label
  },

  // Primary source data — scalar time series (for pulse)
  scalar: {
    values: Float32Array,     // time series values
    dates: string[],          // ISO date strings, same length as values
    min: number,
    max: number,
    units: "m",
    label: "Significant Wave Height",
  },

  // Primary source data — point observations (for scatter)
  points: {
    lats: Float32Array,       // latitude of each observation
    lons: Float32Array,       // longitude of each observation
    values: Float32Array,     // observed value at each point
    min: number,
    max: number,
    units: "PSU",
    label: "Salinity",
  },

  // Context data — always GEBCO bathymetry for the recipe region
  context: {
    values: Float32Array,     // depth in metres (negative = below sea level)
    shape: [lat_count, lon_count],
    min: number,
    max: number,
    lat_range: [lat_min, lat_max],
    lon_range: [lon_min, lon_max],
  },

  // Audio scalars — from the recipe's audio source, for the render date
  audio: {
    wave_height: number,      // metres — significant wave height
    wave_period: number,      // seconds — mean wave period
    wind_speed: number,       // m/s — 10m wind speed
  },

  // Creative parameters — from the recipe YAML, for sketch styling
  style: {
    colormap: "thermal",           // string — colormap name
    opacity: 0.71,                 // float 0–1
    smooth: true,                  // boolean
    clamp_percentile: [2, 98],     // [low, high] for outlier clipping
    energy: 0.14,                  // float 0–1 — calm→turbulent
    presence: 0.28,                // float 0–1 — ghost→solid
    temporal_weight: 0.28,         // float 0–1 — moment→epoch
    colour_character: 0.22,        // float 0–1 — cold→warm→otherworldly
  },
};
```

### 2. Helper functions

The payload ships with three helper functions attached:

```javascript
window.OCEAN_PAYLOAD.latLonToIndex = (lat, lon) => { /* returns flat array index */ }
window.OCEAN_PAYLOAD.indexToLatLon = (index) => { /* returns {lat, lon} */ }
window.OCEAN_PAYLOAD.normalise = (value, min, max) => { /* returns 0–1 */ }
```

### 3. Null handling

Null/NaN values in the primary grid are stored as `0` in the Float32Array with `nan_mask[i] = 1`. Sketches must check `nan_mask` before using a value. Land cells and missing data both have `nan_mask[i] = 1`.

## Key Decisions

1. **Float32Array for performance**
   - **Decision**: Use typed arrays (Float32Array, Uint8Array) rather than plain JS arrays
   - **Rationale**: A 1440×720 grid of regular JS numbers would be ~8MB. Float32Array is ~4MB and transfers faster from the pipeline to the browser.

2. **Separate primary/scalar/points fields**
   - **Decision**: Three distinct shapes for three data types rather than a single polymorphic field
   - **Rationale**: Cleaner for sketch authors — a field sketch can access `payload.primary.values` without checking what type the data is.

## Open Questions

1. Should the payload include a pre-computed colormap lookup table (for performance in tight render loops)?
2. Should context (GEBCO) be at the same resolution as primary, or always at a fixed lower resolution?

## References

- OC-04: Render payload format section
- PRD-004: Rendering pipeline
