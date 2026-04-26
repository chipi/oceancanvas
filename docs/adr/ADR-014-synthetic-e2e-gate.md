# ADR-014 — Synthetic-data e2e test as CI gate

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/ci

## Context

ADR-013 establishes that GitHub Actions runs code validation only, not the production pipeline. But unit tests alone don't catch integration problems — task ordering issues, payload-format mismatches, render failures. We need an end-to-end check that the pipeline can produce a render, but it must run without depending on real source endpoints.

## Decision

A synthetic-data e2e test runs as part of the CI workflow. It uses a fixture: a 10×10 float32 grid in the OISST format, a stubbed Open-Meteo response, and a fixture for GEBCO. The pipeline runs end-to-end against these fixtures, producing a real PNG render. The test asserts: `data/processed/` is populated correctly, a render PNG exists, `manifest.json` contains the expected entry.

## Rationale

- *Fast* — fixtures are tiny; the full pipeline runs in seconds.
- *Stable* — no external services touched.
- *Real* — the actual production code runs against the fixtures. Process step, payload builder, Puppeteer renderer, manifest indexer — all execute. Only the *fetcher* is stubbed.
- *High signal* — most pipeline integration bugs surface here. If this passes, the pipeline is structurally healthy.

## Alternatives considered

- **Mock everything (no real Puppeteer render)** — faster but loses the rendering integration check. Rejected.
- **Run against a single real source for one date** — couples CI to source availability. Rejected (per ADR-013).
- **Skip e2e in CI, run only nightly against real sources** — slower feedback on PRs. Rejected; the synthetic e2e is fast enough to run on every push.

## Consequences

**Positive:**
- Pipeline integration is verified on every change.
- CI runs in ~3-5 minutes total.
- Catches almost all "it broke" bugs before merge.

**Negative:**
- Doesn't catch real-source format changes (handled by occasional manual integration tests).
- Fixture data must be maintained alongside the production fetchers — if the source format changes legitimately, the fixture must change too. Acceptable maintenance cost.

## Implementation notes

- Fixtures in `tests/fixtures/`.
- Test harness in `tests/e2e/test_pipeline_synthetic.py`.
- Replaces the `Task 02 fetch` step with a fixture loader; everything downstream runs unchanged.
- Asserts on outputs: `data/processed/oisst/2026-01-01.json` exists with valid shape, `renders/test-recipe/2026-01-01.png` exists and is a valid PNG, `manifest.json` includes the new render entry.
