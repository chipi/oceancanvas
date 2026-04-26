# ADR-001: Prefect as Pipeline Orchestration

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`

## Context & Problem Statement

The OceanCanvas pipeline is a 6-task daily flow: discover → fetch → process → build payload → render → index. It needs retry policies on network failure, result caching (to skip already-processed sources), structured logging, task state history, and a monitoring UI. As the pipeline grows from 3 sources to 15, observability becomes essential. A bare cron job provides none of this.

## Decision

Use Prefect for all pipeline orchestration. All pipeline steps are Prefect `@task` functions. The daily run is a Prefect `@flow`. Prefect Server runs in Docker Compose as a self-hosted service.

## Rationale

Prefect is substantially lighter than Airflow and maps directly onto our Python fetchers without requiring a rewrite. The `@task/@flow` decorator model is minimal — existing functions become pipeline tasks with one decorator. Prefect provides retry policies, result caching, structured logging, task state history, and a UI at `localhost:4200`. Self-hosted Prefect Server keeps all data local and removes the external dependency.

## Alternatives Considered

1. **Apache Airflow**
   - **Pros**: Mature, large ecosystem
   - **Cons**: Designed for enterprise-scale DAGs with hundreds of tasks. OceanCanvas v1 has 6 tasks. Requires significantly more infrastructure and boilerplate.
   - **Why Rejected**: Over-engineered for the problem. Prefect provides all required features at a fraction of the operational complexity.

2. **Bare cron + shell scripts**
   - **Pros**: Zero dependencies, simple to understand
   - **Cons**: No retry policies, no result caching, no structured logging, no task state history, no UI. Debugging failures without observability is difficult as sources scale.
   - **Why Rejected**: Insufficient observability for a pipeline that runs unattended daily.

3. **Prefect Cloud (managed)**
   - **Pros**: No infrastructure to manage, generous free tier
   - **Cons**: External dependency, data leaves local environment
   - **Why Rejected**: Self-hosted Prefect Server uses the same API. Starting self-hosted removes the external dependency while keeping the upgrade path open.

## Consequences

**Positive:**
- Retry policies on all network calls with configurable backoff
- Result caching: if `data/processed/oisst/2026-04-25.json` exists, the task is skipped — double-runs and partial restarts are safe
- Structured logging and task state history visible in Prefect UI at `localhost:4200`
- Natural scaling path as sources grow from 3 to 15

**Negative:**
- One additional container in Docker Compose (Prefect Server + Postgres)
- Team must learn the `@task/@flow` decorator model

**Neutral:**
- Prefect Server requires Postgres internally — this is not the project database (which is file-based per ADR-004)

## Implementation Notes

Pipeline source in `pipeline/run.py` (the `@flow`) and `pipeline/{fetch,process,payload,render,index}.py` (the `@task`s). Prefect Server defined in `docker-compose.yml` as the `prefect-server` service.
