# RFC-003: Processed JSON Format

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-002-data-processing-step.md`
- **Related ADRs**: `docs/adr/ADR-003-xarray-netcdf-processing.md`, `docs/adr/ADR-006-static-file-serving.md`

## Abstract

This RFC specifies the format of the three output files produced by Task 03 (Process) for each source and date: the flat JSON array, the colourised PNG tile, and the meta sidecar. These files are the shared data layer consumed by both the dashboard and the render payload builder.

## Design & Implementation

### 1. Main JSON array — `{YYYY-MM-DD}.json`

```json
{
  "source_id": "oisst",
  "date": "2026-04-25",
  "shape": [280, 360],
  "lat_range": [20.0, 90.0],
  "lon_range": [-90.0, 10.0],
  "lat_step": 0.25,
  "lon_step": 0.25,
  "min": -1.8,
  "max": 32.4,
  "units": "°C",
  "values": [14.2, 14.1, null, 13.9, ...]
}
```

- `values` is a flat 1D array in row-major order (lat outer, lon inner)
- `null` represents missing data or land — valid JSON null, not NaN
- `shape[0]` × `shape[1]` === `values.length`

### 2. PNG tile — `{YYYY-MM-DD}.png`

- Colourised using the source's default matplotlib colormap applied server-side
- Resolution matches the JSON array shape (1px per grid cell)
- Used as the deck.gl BitmapLayer fast path — no browser computation to display the heatmap
- Null/land cells rendered as `#0C1117` (near-black, matches canvas background)

### 3. Meta sidecar — `{YYYY-MM-DD}.meta.json`

```json
{
  "source_id": "oisst",
  "date": "2026-04-25",
  "shape": [280, 360],
  "min": -1.8,
  "max": 32.4,
  "mean": 14.2,
  "nan_pct": 0.32,
  "processing_region": {
    "lat_min": 20.0, "lat_max": 90.0,
    "lon_min": -90.0, "lon_max": 10.0
  },
  "processing_timestamp": "2026-04-25T06:14:32Z",
  "colormap": "thermal",
  "units": "°C",
  "label": "Sea Surface Temperature"
}
```

### 4. Time series file — `timeseries.json`

One additional file per source, updated daily:

```json
{
  "source_id": "oisst",
  "region": "north_atlantic",
  "values": [
    {"date": "1981-09-01", "mean": 13.1},
    {"date": "1981-10-01", "mean": 12.4},
    ...
  ]
}
```

Used by the dashboard time series chart (Observable Plot). Monthly cadence for the full historical record.

## Key Decisions

1. **JSON null instead of NaN**
   - **Decision**: Missing values stored as JSON `null`, not `NaN`
   - **Rationale**: `NaN` is not valid JSON. JSON `null` is parseable by any JSON library and can be checked with `=== null`.

2. **Flat 1D array, not nested 2D**
   - **Decision**: `values` is a flat 1D array with a separate `shape` field
   - **Rationale**: Simpler to transfer and parse. Index calculation: `values[lat_idx * shape[1] + lon_idx]`.

## Open Questions

1. Should the JSON array use a typed binary format (e.g. MessagePack or raw binary) for performance? JSON float parsing is slow for 100K+ values.
2. Should the timeseries.json file include anomaly (deviation from climatology) alongside the raw mean?

## References

- PRD-002: Data processing step
- OC-04: Processing step outputs section
