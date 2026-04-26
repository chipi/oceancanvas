# ADR-007: GitHub Actions for CI Only — Never Runs the Data Pipeline

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*

## Context & Problem Statement

The project needs automated testing on push and pull request. The question is whether GitHub Actions also runs the production data pipeline or whether that runs only on self-hosted infrastructure.

## Decision

GitHub Actions runs CI only: lint, unit tests, Docker image build, and an e2e test against a 10×10 synthetic dataset. It never fetches real data from NOAA, ESA, or any external source. The production data pipeline runs on self-hosted Docker Compose infrastructure only.

## Rationale

Running the data pipeline in GitHub Actions would create external API dependencies in CI (rate limits, availability, latency), produce test artifacts that mix with production renders, and require secrets management for future auth-required sources. The e2e test against synthetic data validates all pipeline logic without any of these problems.

## Alternatives Considered

1. **Run the full pipeline in GitHub Actions against real APIs**
   - **Why Rejected**: External API dependencies in CI, rate limit exposure, slow test runs, and mixing test renders with production gallery.

## Consequences

**Positive:**
- CI never depends on external API availability
- E2e test runs in seconds against synthetic 10×10 grid
- Clean separation: GitHub = code validation, self-hosted = data production

**Negative:**
- Real data quality issues (NaN coverage, upstream format changes) are not caught by CI — only discovered on the daily pipeline run

## Implementation Notes

CI jobs in `.github/workflows/`. E2e test uses a fixture loader that replaces the ERDDAP fetcher with a 10×10 synthetic float32 grid. Validates: `data/processed/` populated, render PNG produced, `manifest.json` updated, Prefect flow completes without errors.
