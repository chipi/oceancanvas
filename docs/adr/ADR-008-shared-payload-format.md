# ADR-008 — Shared payload format for preview and pipeline

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §contracts/render-payload · §constraints

## Context

The Recipe Editor's live preview runs a sketch in the browser. The pipeline's Task 05 runs the same sketch in headless Chromium via Puppeteer. Both need the same data — the sketch must work in either context.

If the editor and pipeline used different payload shapes, sketches would have to branch on context. Two code paths in every sketch. Drift becomes inevitable. The promise that "what you see in the editor is what the pipeline renders" collapses.

## Decision

The render payload format is the same in both contexts. Both the editor live preview and the Puppeteer pipeline render inject the payload as `window.OCEAN_PAYLOAD` with identical schema. Sketches read the payload identically in both contexts; no context-detection branching is permitted in sketch code.

## Rationale

This is the non-negotiable principle that makes the editor preview *trustworthy*. An artist who tweaks a recipe in the editor needs to know that the pipeline render will look the same. Without this guarantee, the editor preview is decorative.

The schema details — what specific fields the payload contains — are deliberated in RFC-002. This ADR locks only the principle: one schema, two contexts.

## Alternatives considered

- **Two payload schemas, one per context** — explicitly rejected. Sketches would branch on context, creating two code paths. Drift between editor and pipeline becomes inevitable.
- **Editor-only sketch mode flag** — a global flag the sketch reads to choose behaviour. Same problem as two payloads. Rejected.

## Consequences

**Positive:**
- Sketches are simple — read payload, draw. No context-awareness.
- A sketch override developed in the editor will work in the pipeline without modification.
- The "Preview full" button in the editor produces output identical to a pipeline render of the same date.

**Negative:**
- Both contexts pay the cost of any payload feature. If the editor needs something the pipeline doesn't, it goes in the payload anyway. Mitigated by keeping the payload focused.
- The downsampling approach in the editor preview (RFC-004) means the payload values differ between contexts — but the *schema* is the same. The shape constraint holds.

## Implementation notes

- Schema details defined in RFC-002 → ADR (pending, separate from this one).
- Editor payload builder in `gallery/src/preview/` (to be created).
- Pipeline payload builder in `pipeline/src/oceancanvas/tasks/build_payload.py`.
- Both produce identical schemas; only the data values differ (downsampling in editor, full resolution in pipeline).
- Sketches access via `window.OCEAN_PAYLOAD` exclusively. No fallback paths.
