# ADR-003 — xarray + requests for NetCDF sources

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/pipeline · §stack

## Context

The majority of OceanCanvas sources return NetCDF binary files: NOAA OISST, GEBCO bathymetry, ESA CCI sources (SST, SSS, Sea Level, Ocean Colour), NSIDC Sea Ice, HadSST4. NetCDF is gridded scientific data — multidimensional arrays with named dimensions and metadata. dlt (ADR-002) is the wrong abstraction for this shape.

## Decision

Use plain Python with `xarray` for opening NetCDF and `requests` for HTTP. Wrap each fetcher in a Prefect `@task` for retries, caching, and logging.

## Rationale

xarray is the de-facto standard for NetCDF in Python. It opens files lazily, slices regions efficiently, exposes data as labelled multidimensional arrays. No framework wraps NetCDF better than xarray itself.

The Prefect `@task` wrapper provides the same orchestration benefits we get from dlt — retries, caching, logging, observability — without forcing the binary data through a record-shaped abstraction.

## Alternatives considered

- **dlt for NetCDF** — possible via custom transformers, but dlt's record/table model fights with NetCDF's gridded structure. The custom transformers end up reproducing xarray.
- **netCDF4 library directly** — lower-level than xarray, more code to write per fetcher. xarray sits on top of netCDF4 anyway.
- **iris (UK Met Office)** — high quality but more opinionated; xarray is more general-purpose and widely supported.

## Consequences

**Positive:**
- Each NetCDF fetcher is small — open, slice region, save to `data/sources/`.
- xarray's lazy loading means we only read what we need.
- Standard tooling; new contributors recognise it.

**Negative:**
- Two fetcher styles in the codebase (dlt for REST, xarray+requests for NetCDF). Worth the cost — they're genuinely different data shapes.

## Implementation notes

- NetCDF fetchers in `pipeline/fetchers/`.
- One fetcher per source (`oisst.py`, `gebco.py`, etc.).
- Each wrapped in `@task` with retry policy.
