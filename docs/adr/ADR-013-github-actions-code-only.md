# ADR-013 — GitHub Actions for code CI only

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/ci · §stack

## Context

The codebase needs continuous integration: lint, unit tests, build verification, and an end-to-end check that the pipeline can produce a render. The question is what role GitHub Actions plays, and what role it does *not* play.

A common temptation is to run the actual data pipeline from CI — fetch real data, render real recipes, push to production. This couples CI to upstream data sources, makes CI runs slow and flaky, and conflates code validation with production data flow.

## Decision

GitHub Actions runs code validation only: lint, unit tests, build the Docker image, run a synthetic-data e2e test (ADR-014). It never runs the production data pipeline. Production runs on the deployed Docker Compose stack, on its own schedule.

## Rationale

- CI's job is to validate code changes. Production's job is to run the pipeline. Mixing them creates a flakier, slower CI and a harder-to-trust production environment.
- Real source endpoints (NOAA, ESA) have rate limits and occasional outages. Running them on every PR is a bad idea.
- The pipeline runs in a Docker container; the same container runs in CI (for the e2e test) and in production. Image parity is the integrity guarantee.

## Alternatives considered

- **Run the production pipeline from CI on every push** — couples PR feedback to upstream data availability. Rejected.
- **Run a lightweight pipeline check (one source, one recipe) on CI** — better than full production but still introduces upstream dependencies. ADR-014's synthetic-data approach is cleaner.
- **No CI at all, rely on local testing** — fragile; doesn't catch problems before merge.

## Consequences

**Positive:**
- CI is fast and stable; doesn't depend on third-party services being up.
- Production pipeline runs are independent — a CI outage doesn't affect daily renders.
- Image parity between CI and production gives a strong correctness signal.

**Negative:**
- CI doesn't catch real-world data oddities (e.g., an ESA endpoint changing format). Mitigated by occasional manual testing against real sources before deploying.

## Implementation notes

- Workflow file at `.github/workflows/ci.yml`.
- Triggers: push to main, pull request.
- Steps: lint (ruff for Python, eslint for JS), unit tests (pytest, vitest), build Docker image, run synthetic-data e2e (ADR-014).
- No deploy step — production deployment is manual or triggered separately.
