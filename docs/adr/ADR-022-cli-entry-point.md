# ADR-022 — CLI entry point, invocation model, and dependencies

> **Status** · Accepted
> **Date** · 2026-05-02
> **TA anchor** · §components/pipeline · §stack
> **Related RFC** · RFC-009 (closes)

## Context

The pipeline had no CLI — ad-hoc operations required `docker compose exec` with module invocation paths. Backfill, single renders, status inspection, and recipe validation all needed shell-level knowledge of the pipeline internals. RFC-009 explored CLI design, invocation modes (direct vs. server dispatch), and library choice.

## Decision

A `typer`-based CLI installed as the `oceancanvas` console script. Two invocation modes: direct (default, always available, terminal output) and server dispatch (`--via-server`, requires running Prefect server, visible in UI). The command surface: `run`, `backfill`, `render`, `status`, `recipes list`, `recipes validate`, `index`. Dependencies: `typer[all]>=0.12` and `rich>=13`.

## Rationale

`typer` eliminates argument-parsing boilerplate via type annotations, produces good `--help` automatically, and integrates with `rich` for progress bars and coloured output. Direct invocation as default means the CLI works without the full Docker stack running. The `oceancanvas` name avoids collision with OpenShift's `oc` command.

## Alternatives considered

- **Makefile targets** — no argument validation, no progress streaming, awkward in Docker.
- **Prefect's own CLI** — requires server for all invocations, no OceanCanvas-specific concepts.
- **Click** — typer wraps it; the thin wrapper is worth the boilerplate reduction.

## Consequences

**Positive:**
- Single entry point for all pipeline operations
- Works without Prefect server running (direct mode)
- Rich terminal output for long-running operations (backfill progress)

**Negative:**
- Two new dependencies (typer, rich) in the pipeline container
- Two invocation paths (direct/server) must produce identical output

## Implementation notes

- CLI module: `pipeline/src/oceancanvas/cli.py`
- Console script: `pyproject.toml` `[project.scripts] oceancanvas = "oceancanvas.cli:app"`
- Backfill flow: `pipeline/src/oceancanvas/backfill.py`
- Tests: `pipeline/tests/unit/test_cli.py`
