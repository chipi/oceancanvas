# RFC-007: GitHub Actions CI Design

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`
- **Related ADRs**: `docs/adr/ADR-007-github-actions-ci-only.md`

## Abstract

This RFC specifies the GitHub Actions CI configuration for OceanCanvas — lint, unit tests, Docker image build, and an end-to-end test against a synthetic 10×10 dataset. The CI validates code correctness without hitting any external APIs.

**Architecture Alignment:** CI runs code validation only — never the data pipeline (ADR-007).

## Design & Implementation

### 1. Workflow file — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install ruff
      - run: ruff check pipeline/ gallery/

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest pipeline/tests/unit/ -v

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and start stack
        run: docker compose -f docker-compose.test.yml up -d
      - name: Wait for Prefect server
        run: sleep 15
      - name: Run e2e pipeline with synthetic data
        run: docker compose -f docker-compose.test.yml exec pipeline python -m pytest pipeline/tests/e2e/ -v
      - name: Verify outputs
        run: |
          test -f data/processed/oisst/$(date +%Y-%m-%d).json
          test -f renders/test_recipe/$(date +%Y-%m-%d).png
          python -c "import json; m=json.load(open('renders/manifest.json')); assert len(m) > 0"
      - name: Teardown
        run: docker compose -f docker-compose.test.yml down
        if: always()

  build-image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -f Dockerfile.pipeline -t oceancanvas-pipeline .
      - run: docker build -f Dockerfile.gallery -t oceancanvas-gallery .
```

### 2. Synthetic data fixture

The e2e test replaces the ERDDAP fetcher with a fixture that generates a 10×10 float32 grid:

```python
# pipeline/tests/fixtures/synthetic_oisst.py
def synthetic_oisst_grid(date: str, region: dict) -> xr.Dataset:
    """Returns a 10×10 synthetic SST grid for testing."""
    lats = np.linspace(region['lat_min'], region['lat_max'], 10)
    lons = np.linspace(region['lon_min'], region['lon_max'], 10)
    data = np.random.uniform(10, 25, (10, 10)).astype(np.float32)
    return xr.Dataset(
        {"sst": (["lat", "lon"], data)},
        coords={"lat": lats, "lon": lons}
    )
```

### 3. What the e2e validates

- Task 01 (Discover) runs without error
- Task 02 (Fetch) produces files in `data/sources/` using the synthetic fixture
- Task 03 (Process) produces all three output files in `data/processed/`
- Task 04 (Build Payload) assembles a valid `render_payload.json`
- Task 05 (Render) produces a valid PNG in `renders/`
- Task 06 (Index) rebuilds `manifest.json` with the correct entry
- Prefect flow completes with status `COMPLETED`

## Key Decisions

1. **Synthetic data, not real API calls**
   - **Decision**: The e2e test fixture replaces the ERDDAP fetcher with synthetic data
   - **Rationale**: Real API calls in CI create external dependencies, are slow, and may fail due to source availability. The synthetic fixture tests all pipeline logic without any external dependency.

## Open Questions

1. Should the e2e test also validate the gallery React build and that manifest.json is correctly parsed?
2. Should there be a separate nightly run that tests against real data to catch upstream format changes?

## References

- ADR-007: GitHub Actions for CI only
- PRD-001: Data ingestion pipeline
