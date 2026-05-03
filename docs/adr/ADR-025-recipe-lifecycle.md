# ADR-025 — Recipe lifecycle on source unavailability

> **Status** · Accepted
> **Date** · 2026-05-03
> **TA anchor** · §components/pipeline · §constraints
> **Related RFC** · RFC-003 (closes)

## Context

When a data source becomes temporarily or permanently unavailable, the pipeline must handle gaps in the render timeline gracefully. The Video Editor must handle missing frames without misleading forward-fills.

## Decision

Three-state lifecycle: `active` → `paused` → `broken`.

- **active**: normal operation, pipeline fetches and renders daily
- **paused**: single fetch failed; skip render for that date, retry next day; after 3 consecutive paused days, escalate to broken
- **broken**: source permanently unavailable; pipeline stops attempting

No fallback rendering. Missing frames create visible gaps in timelapses, not misleading substitutions. The Video Editor skips missing frames rather than interpolating.

## Rationale

Forward-filling (repeating the last frame) or interpolating between frames disguises data gaps as continuity. For a project about data integrity, visible gaps are honest. The 3-day escalation threshold balances transient outages against permanent failures.

## Implementation notes

- Recipe state tracked in manifest.json (future: add `state` field per recipe)
- Video assembly (`video.py`) already skips missing PNGs in sequence
- Pipeline fetch tasks already have retry logic (3 retries with backoff)
