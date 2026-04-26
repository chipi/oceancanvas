# ADR-014: No-Authentication Data Sources Only for v1

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`

## Context & Problem Statement

Ocean data sources vary in accessibility: some require no registration (NOAA ERDDAP, ESA CCI Open Data Portal, GEBCO, Open-Meteo), some require free registration (NASA Earthdata, Copernicus CMEMS), and some require institutional agreements. The pipeline needs to work for self-hosters without any account setup.

## Decision

All v1 data sources require no authentication, no API key, and no registration. Auth-required sources (NASA Earthdata direct, Copernicus CMEMS) are deferred to a later phase.

## Rationale

The self-hosting promise — clone, edit recipes, `docker compose up` — breaks if users must register for accounts before the pipeline can fetch any data. All 15 confirmed v1 sources are freely accessible with no credentials. This is sufficient to demonstrate the full creative loop including SST, sea level, chlorophyll, sea ice, salinity, currents, bathymetry, and wave data.

## Alternatives Considered

1. **Include Copernicus CMEMS (requires free registration)**
   - **Pros**: Access to Copernicus operational products, higher-resolution currents
   - **Cons**: Every self-hoster must register and pass credentials to the pipeline. Breaks the zero-setup promise.
   - **Why Rejected**: The 15 no-auth sources cover all required variables. CMEMS deferred to when auth management is designed.

## Consequences

**Positive:**
- Self-hosters need zero accounts — clone and run
- No secrets management required in v1
- All 15 sources cover the full variable set: SST, salinity, sea level, chlorophyll, ice, currents, bathymetry, waves, CO₂, in-situ profiles

**Negative:**
- Some higher-quality products (CMEMS, NASA Earthdata direct) deferred
- ESA CCI sources have ~2-week latency vs OISST's 1–2 day latency

## Implementation Notes

All fetchers in `pipeline/fetch_*.py` use plain `requests` with no authentication headers. ERDDAP sources use public griddap URLs. ESA CCI sources use the public OPeNDAP endpoint at `climate.esa.int`.
