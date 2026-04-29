# ADR-018 — Recipe YAML schema

> **Status** · Accepted
> **Date** · 2026-04-30
> **TA anchor** · §contracts/recipe-yaml · §components/pipeline · §components/render-system
> **Related RFC** · RFC-001 (closes)
> **Related PRDs** · PRD-001 Recipe · PRD-003 Recipe Editor

## Context

The recipe YAML is the durable artefact of authorship. Its shape determines whether recipes feel like authored works or configurations, and whether the Recipe Editor's creative-control surface can round-trip cleanly. RFC-001 explored nested vs. flat schemas and marker vs. no-marker approaches across two draft revisions.

## Decision

Flat YAML with a comment-marker delimiter (`# ⊓ creative controls ⊓`). Structural fields (name, region, sources, schedule) live above the marker. Creative state (mood, energy_x, energy_y, colour_character, temporal_weight) and derived render/audio parameters live below. The marker is the contract between human readability and editor state management.

## Rationale

Flat structure keeps recipes readable for power users who edit YAML directly. The comment-marker provides a clear boundary for the editor's two-zone colouring (teal structural, amber creative) without introducing nested blocks that obscure the recipe's intent. The schema has been exercised by 8 authored recipes and validated through the full pipeline + editor round-trip.

## Alternatives considered

- **Nested blocks** (`creative:` / `technical:` sections) — adds indentation depth, obscures the flat simplicity that makes recipes feel like authored works rather than configurations.
- **No marker** — editor has no reliable boundary for zone detection; YAML mode colouring becomes fragile.

## Consequences

**Positive:**
- Recipes read naturally as a flat document
- Editor can reliably detect and colour two zones
- Power users edit YAML without fighting nesting
- Pipeline validation is straightforward (flat key checks)

**Negative:**
- Comment-based markers are unconventional; tools that strip comments break the contract
- Adding new structural fields requires deciding which side of the marker they belong on

## Implementation notes

- Schema: `pipeline/src/oceancanvas/schemas/recipe-schema.json`
- Parser: `gallery/src/lib/yamlParser.ts` (parseRecipeYaml, reconstructYaml)
- Validation: `pipeline/src/oceancanvas/tasks/discover.py` (Task 01)
- Recipes: `recipes/*.yaml`
- Creative marker constant: `CREATIVE_MARKER` in yamlParser.ts
