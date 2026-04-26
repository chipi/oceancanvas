# ADR-001: Prefect as Pipeline Orchestration

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`

## Context & Problem Statement

The OceanCanvas pipeline is a 6-task daily flow: discover → fetch → process → build payload → render → index. It needs retry policies on network failure, result caching, structured logging, task state history, and a monitoring UI. As the pipeline grows from 3 sources to 15, observability becomes essential. A bare cron job provides none of this.

## Decision

Use Prefect for all pipeline orchestration. All pipeline steps are Prefect `@task` functions. The daily run is a Prefect `@flow`. Prefect Server runs in Docker Compose as a self-hosted service.

## Rationale

Prefect is substantially lighter than Airflow and maps directly onto our Python fetchers without a rewrite. The `@task/@flow` decorator model is minimal — existing functions become pipeline tasks with one decorator. Provides retry policies, result caching, structured logging, task state history, and a UI at `localhost:4200`.

## Alternatives Considered

1. **Apache Airflow** — Pros: mature, large ecosystem. Cons: designed for enterprise-scale DAGs with hundreds of tasks; OceanCanvas v1 has 6. Why Rejected: over-engineered for the problem.

2. **Bare cron + shell scripts** — Pros: zero dependencies. Cons: no retry policies, no caching, no logging, no UI. Why Rejected: insufficient observability for unattended daily runs.

3. **Prefect Cloud (managed)** — Pros: no infrastructure. Cons: external dependency. Why Rejected: self-hosted uses the same API, keeps data local, same upgrade path.

## Consequences

**Positive:** Retry policies on all network calls · Result caching skips already-processed sources · Prefect UI at `localhost:4200` · Natural scaling path as sources grow.

**Negative:** One additional container (Prefect Server + Postgres) · Team must learn `@task/@flow` model.

**Neutral:** Prefect Server runs Postgres internally — not the project database (file-based per ADR-004).

## Implementation Notes

`pipeline/run.py` (the `@flow`), `pipeline/{fetch,process,payload,render,index}.py` (the `@task`s). Prefect Server in `docker-compose.yml` as `prefect-server` service.
