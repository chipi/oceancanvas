# ADR-005 — No database in v1

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §constraints

## Context

OceanCanvas could plausibly use a database to store recipes, manifest entries, render metadata, and pipeline state. Most modern projects of this scope reach for SQLite or Postgres reflexively.

But OceanCanvas is intentionally file-shaped. Recipes are YAML. Renders are PNGs. The manifest is JSON. Pipeline state is JSON. Self-hostability and regenerability are core constraints.

## Decision

No database in v1. All persistent state lives in files: YAML for configuration, JSON for state and manifest, PNG for renders. Prefect's own state database (Postgres in the prefect-server container) is the only exception — it's internal to Prefect, not application state.

## Rationale

- *Self-hostable* — `git clone && docker compose up` should work with no service dependencies. Adding Postgres for app data adds another container, another set of credentials, another backup story.
- *Regenerable* — every layer of the data store (ADR-004) can be regenerated. A database makes regeneration harder; you have to recreate schemas, dump/restore.
- *Inspectability* — a recipe file in YAML is grep-able, diff-able, version-controllable. The same in a database is not.
- *Scale* — at OceanCanvas's intended scale (tens to hundreds of recipes, low thousands of daily renders), files are entirely sufficient.

## Alternatives considered

- **SQLite** — file-based, lightweight, no separate process. Closest to "no database." Worth revisiting only if the manifest grows large enough that JSON parsing becomes a real cost (likely thousands of recipes, far beyond v1).
- **Postgres** — over-engineered for this scale. Reasonable later if multi-user / multi-author features arrive.

## Consequences

**Positive:**
- Anyone can clone and run the system without configuring a database.
- Recipes are version-controlled in git as files.
- Data is inspectable with standard text tools.

**Negative:**
- Querying across recipes (e.g., "show me all recipes that use OISST") requires reading manifest.json or scanning the recipes folder. Acceptable at scale.
- Concurrent writes to the manifest need careful handling (Task 06 owns the rebuild; nothing else writes there). Single-author Phase 1 (ADR-016) means no race condition in practice.

## Implementation notes

- Recipes in `recipes/*.yaml`.
- Pipeline state in `data/state.json`.
- Manifest in `manifest.json`.
- Recipe lifecycle state in `recipes/{id}.state.json` (RFC-003).

## Future trigger

Revisit if:
- Manifest size exceeds 10MB or query latency becomes user-visible.
- Multi-author features arrive and concurrent writes become real.
- A new feature genuinely requires relational queries the file model can't serve.

When triggered, write a new ADR adopting SQLite or Postgres and supersede this one.
