# ADR-003: xarray + requests for NetCDF Binary Sources

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-002-data-processing-step.md`

## Context & Problem Statement

Ten OceanCanvas sources (NOAA ERDDAP OISST, GEBCO, ESA SST-CCI, SSS-CCI, Sea Level CCI, OC-CCI, NSIDC Sea Ice, HadSST4, WOA23, NOAA CRW) provide data as NetCDF binary files — gridded multi-dimensional arrays with CF conventions, metadata headers, and coordinate systems. The dlt record/table abstraction is the wrong level for this data shape.

## Decision

Use xarray + requests directly for all NetCDF binary sources, wrapped in Prefect `@task` functions for retries and logging.

## Rationale

xarray is purpose-built for CF-convention NetCDF — it reads coordinate systems, handles missing values, supports lazy loading, and exports to numpy arrays cleanly. The ERDDAP griddap URL pattern provides direct NetCDF subset downloads via requests without authentication. No framework layer adds value here; the data shape is arrays, not records.

## Alternatives Considered

1. **dlt for NetCDF sources**
   - **Cons**: dlt's record/table abstraction is wrong for gridded array data. Fitting a 1440×720 float32 grid into that model requires awkward serialisation and loses coordinate metadata.
   - **Why Rejected**: Wrong abstraction for the data shape.

2. **netCDF4 library directly**
   - **Cons**: More verbose than xarray for the operations needed. xarray wraps netCDF4 and adds the coordinate-aware API with no loss of capability.
   - **Why Rejected**: xarray is strictly higher-level for this use case.

## Consequences

**Positive:**
- Coordinate-aware slicing: crop to processing region by lat/lon bounds in two lines
- Handles NaN and fill values correctly per CF conventions
- Direct ERDDAP griddap URL support for subsetting at download time

**Neutral:**
- Two ingestion patterns in the codebase (xarray for NetCDF, dlt for REST). Intentional — they serve genuinely different data shapes.

## Implementation Notes

NetCDF fetchers in `pipeline/fetch_{oisst,gebco,esa_sst,esa_ssl,esa_oc,nsidc}.py`. ERDDAP griddap URL pattern: `https://coastwatch.pfeg.noaa.gov/erddap/griddap/{datasetID}.nc?{variable}[{time}][{lat}][{lon}]`.
