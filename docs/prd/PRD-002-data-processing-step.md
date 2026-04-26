# PRD-002: Data Processing Step

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-003-processed-json-format.md`
- **Related ADRs**: `docs/adr/ADR-003-xarray-netcdf-processing.md`, `docs/adr/ADR-004-no-database-v1.md`, `docs/adr/ADR-006-static-file-serving.md`
- **Source**: OC-04 Section 3 (Task 03)

## Summary

The data processing step is Task 03 of the pipeline. It transforms raw source files (NetCDF, JSON) into three browser-ready outputs per source per date: a flat float32 JSON array, a colourised PNG tile, and a statistics meta sidecar. These outputs are the shared data layer consumed by both the dashboard and the render payload builder — written once, read by many.

## Background & Context

Without Task 03, there is a gap between raw source data and what the dashboard and renderer actually need. A NetCDF file with CF conventions and coordinate metadata is not something a browser can consume directly. The processing step bridges that gap — it runs once per source per date and produces lightweight, browser-ready files that serve two consumers without duplication.

## Goals

- Transform raw NetCDF and JSON source files into a standardised, browser-consumable format
- Produce three outputs per source per date: JSON array, PNG tile, meta sidecar
- Run idempotently — re-running the pipeline on the same date produces the same outputs and does not re-process
- Keep processed outputs within manageable size for browser loading

## Non-Goals

- Per-recipe processing — the processing step is per-source, not per-recipe. Recipe-specific cropping happens in Task 04 (Build Payload)
- Storing full-resolution global grids in the browser format — processing region limits output size

## User Stories

- *As the dashboard, I can load a pre-colourised PNG tile for the active source and date instantly without any JavaScript computation.*
- *As the dashboard hover interaction, I can look up the exact value at a lat/lon coordinate by indexing into the flat JSON array.*
- *As the render payload builder (Task 04), I can read pre-processed data for any source without re-opening raw NetCDF files.*

## Functional Requirements

### FR1: Output files

- **FR1.1**: Three files written to `data/processed/{source_id}/{YYYY-MM-DD}/` for each source and date:
  - `{YYYY-MM-DD}.json` — flat float32 array with shape, min, max, lat/lon ranges
  - `{YYYY-MM-DD}.png` — colourised PNG tile using the source's default colormap
  - `{YYYY-MM-DD}.meta.json` — statistics sidecar
- **FR1.2**: The JSON array is a flat 1D array of float32 values in row-major order (lat × lon), with shape `[lat_count, lon_count]` stored alongside
- **FR1.3**: The PNG tile is colourised using matplotlib colormaps applied server-side — no browser computation needed to display the heatmap

### FR2: Processing region

- **FR2.1**: Each source has a configured processing region (lat/lon bounding box) wider than any individual recipe region but not global
- **FR2.2**: OISST North Atlantic: 20°N–75°N, 90°W–10°E (~280×360 cells at 0.25° = ~100,800 values, ~400KB as JSON)
- **FR2.3**: Any recipe region must fit within its source's processing region
- **FR2.4**: Processing region is configured in `pipeline/config.py`, not in the recipe YAML

### FR3: Meta sidecar

- **FR3.1**: `{YYYY-MM-DD}.meta.json` contains: date, source_id, shape [lat_count, lon_count], min, max, nan_pct, processing_region {lat_min, lat_max, lon_min, lon_max}, processing_timestamp
- **FR3.2**: The dashboard stats panel loads the meta sidecar first (small, fast) before the full JSON array (larger, async)

### FR4: Idempotency and caching

- **FR4.1**: If all three output files for a source/date already exist, the processing task is a cache hit and is skipped
- **FR4.2**: Running the pipeline twice on the same day does not re-process — the cache hit prevents duplication
- **FR4.3**: A partially failed run (e.g. JSON written but PNG not) re-runs the full processing for that source/date

### FR5: NaN handling

- **FR5.1**: Land cells and missing data are stored as `null` in the JSON array (JSON null, not NaN which is invalid JSON)
- **FR5.2**: nan_pct in the meta sidecar records the fraction of null cells — useful for diagnosing data quality issues

## Success Metrics

- Dashboard heatmap loads in under 1 second using the PNG tile fast path
- JSON array hover lookup returns the correct value for any lat/lon within the processing region
- Processing step completes for all 3 Phase 1 sources in under 60 seconds on development hardware

## Dependencies

- PRD-001: Data ingestion pipeline (this is Task 03 within that pipeline)
- RFC-003: Processed JSON format (formal specification of the JSON array format)

## Release Checklist

- [ ] Three output files produced correctly for OISST, Open-Meteo, and GEBCO
- [ ] JSON array indexable by lat/lon with correct values
- [ ] PNG tile renders correctly as a deck.gl BitmapLayer
- [ ] Meta sidecar loads and displays correctly in the dashboard stats panel
- [ ] Idempotency verified: running pipeline twice on same date produces no changes
