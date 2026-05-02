# ADR-023 — Pipeline parallelisation and render concurrency

> **Status** · Accepted
> **Date** · 2026-05-02
> **TA anchor** · §components/pipeline · §components/render-system
> **Related RFC** · RFC-008 (closes)

## Context

The pipeline ran all six tasks sequentially. For the daily run with a small recipe count this was acceptable (~45s). For historical backfill — 540 monthly frames — sequential execution made the job multi-hour. RFC-008 explored concurrency models, worker lifecycle strategies, and safe upper bounds for Chromium instances.

## Decision

`ConcurrentTaskRunner` at the flow level with per-recipe subtasks dispatched via `.submit()`. Render concurrency bounded by a `threading.Semaphore` initialized from `RENDER_CONCURRENCY` (env-configurable, default 6). Persistent Chromium workers via NDJSON protocol: each concurrency slot owns one long-lived browser instance, reused across all renders on that thread. Workers are cleaned up after all render futures resolve.

## Rationale

Per-recipe subtasks give Prefect task-level observability, caching, and retry granularity. `threading.Semaphore` is process-local and works in both direct invocation and server-dispatch modes without requiring a running Prefect server. Persistent Chromium workers eliminate ~3–5s browser startup per frame — the dominant cost at scale. The NDJSON protocol (JSON per line on stdin, length-prefixed PNG on stdout) is simple and debuggable.

## Alternatives considered

- **ProcessPoolExecutor outside Prefect** — bypasses Prefect's caching and observability.
- **Uncapped concurrency** — risks RAM exhaustion (300MB × N instances).
- **Docker child container workers** — adds networking complexity for equivalent throughput.
- **Async Puppeteer (Node worker threads)** — introduces Node concurrency inside Python; revisit if profiling shows need.

## Consequences

**Positive:**
- Backfill scales linearly with concurrency (6× speedup at RENDER_CONCURRENCY=6)
- Per-recipe task runs visible in Prefect UI with timing and retry info
- Deterministic rendering preserved (same seeds, same payloads)

**Negative:**
- Persistent workers add lifecycle complexity (crash recovery, cleanup)
- RENDER_CONCURRENCY must be tuned per host (default 6 is conservative)
- Threading model means Python GIL applies to coordination code (acceptable since CPU work is in Chromium subprocesses)

## Implementation notes

- Flow: `pipeline/src/oceancanvas/flow.py` (ConcurrentTaskRunner, .submit() fan-out)
- Render subtask: `pipeline/src/oceancanvas/tasks/render.py` (render_one, ChromiumWorker)
- Payload subtask: `pipeline/src/oceancanvas/tasks/build_payload.py` (build_one_payload)
- Concurrency constant: `pipeline/src/oceancanvas/constants.py` (RENDER_CONCURRENCY)
- Renderer worker mode: `pipeline/src/oceancanvas/renderer/render.mjs` (--worker flag)
- Backfill flow: `pipeline/src/oceancanvas/backfill.py`
