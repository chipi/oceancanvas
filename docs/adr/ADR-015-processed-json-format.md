# ADR-015 — Processed JSON format with multi-band handling

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §contracts/processed-data · §components/data-store

## Context

Task 03 (Process) converts raw NetCDF or JSON source files into a browser-friendly format in `data/processed/{source}/{date}.*`. OC-04 specifies three files per source per date: a flat float32 JSON array, a colourised PNG tile, and a meta sidecar. Most sources are single-band (one variable per date — SST, sea level, salinity). Some are multi-band (e.g., a source providing both temperature and uncertainty per pixel).

This was originally framed as RFC-003 (Processed JSON format) but the answer is largely settled. The remaining open question — multi-band handling — is small enough to lock as an ADR with one alternative noted.

## Decision

Each processed file set follows this naming convention:

- **Single-band sources** — `data/processed/{source}/{date}.json`, `.png`, `.meta.json`. Three files.
- **Multi-band sources** — separate file sets per band: `data/processed/{source}/{date}.{band}.json` etc. Six files for two bands.

The `.json` schema is fixed regardless of band count: `{ data: [float32 array], shape: [h, w], min, max, lat_range, lon_range, source_id, band, date }`.

## Rationale

- Separate files per band keeps each file simple and small. Browser code requesting "the SST data for date X" gets exactly that, not an envelope object containing four bands.
- The dashboard typically renders one band at a time. Loading separate files matches the access pattern.
- The `.meta.json` sidecar always exists per band and contains the band-specific statistics.

## Alternatives considered

- **Single multi-band file with all bands inside** — efficient if the consumer always reads all bands. But the dashboard reads one band at a time, so this would over-fetch. Rejected.
- **Multi-band as additional dimensions inside one array** — possible, but conflates two different concepts (spatial dimensions and variable identity). Rejected.

## Consequences

**Positive:**
- Same loader code works for single-band and multi-band sources.
- Simple naming convention. `data/processed/sst-cci/2026-04-25.analysed_sst.json` is self-explanatory.
- Storage cost scales linearly with band count (no overhead).

**Negative:**
- More files in the directory for multi-band sources. At v1 scale this is fine.

## Implementation notes

- Process step in `pipeline/process.py`.
- Naming convention: `{source}/{date}.json` for single-band, `{source}/{date}.{band}.json` for multi-band.
- The render-payload builder (Task 04) addresses bands explicitly: a recipe specifies `source: sst-cci` and `band: analysed_sst`.
- For sources without explicit bands, omit the band suffix.
