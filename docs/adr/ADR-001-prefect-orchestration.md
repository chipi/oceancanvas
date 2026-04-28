# ADR-001 — Prefect as orchestration

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/pipeline · §stack
> **Related PRDs** — PRD-001 Recipe (the pipeline executes recipes daily)

## Context

The pipeline is a six-task daily flow: discover → fetch → process → build payload → render → index. Each task can fail, retry, and produce intermediate artifacts. The system needs scheduling, retry policies, result caching, structured logging, and a UI for inspecting flow runs.

OceanCanvas v1 has six tasks, not hundreds. The orchestrator must be light enough not to dominate the deployment but rich enough to give observability.

## Decision

Use Prefect for orchestration. All pipeline tasks are `@task` functions; the daily run is a `@flow`. Prefect Server runs as a Docker Compose container with its own Postgres for state.

## Rationale

Prefect's `@task` / `@flow` decorator model maps cleanly onto Python fetcher functions without rewriting them. Retry policies, result caching, and a UI at `localhost:4200` come built-in. Self-hosted Prefect Server keeps everything local — no external dependency.

## Alternatives considered

- **Airflow** — designed for hundreds of tasks across enterprise pipelines. Too heavy for six tasks; the operational overhead of an Airflow deployment exceeds the value.
- **Bare cron** — gives no retry, no caching, no logs, no UI. Acceptable at 1 task; insufficient at 6 and brittle as the project grows.
- **Prefect Cloud (managed)** — adds an external dependency that breaks the self-hostable constraint (TA §constraints).

## Consequences

**Positive:**
- Retry, caching, observability come for free.
- The `@task` decorator is non-invasive — fetcher functions remain testable in isolation.
- Same compose.yml works locally and on the VPS.

**Negative:**
- One more container in the stack (prefect-server + Postgres).
- Engineers unfamiliar with Prefect need a brief on-ramp.

## Implementation notes

- Pipeline source code in `pipeline/`.
- Prefect Server container in `docker-compose.yml`.
- Daily schedule defined in `pipeline/src/oceancanvas/deploy.py` (uses `flow.serve()` with cron).
