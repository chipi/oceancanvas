# ADR-021 — YAML round-tripping

> **Status** · Accepted
> **Date** · 2026-04-30
> **TA anchor** · §contracts/recipe-yaml · §components/web-frontend
> **Related RFC** · RFC-005 (closes)
> **Related PRDs** · PRD-003 Recipe Editor

## Context

The Recipe Editor flips between Creative mode (mood presets, sliders) and YAML mode (direct text editing). Creative mode generates YAML; YAML mode allows direct edits. When a power user changes a render parameter in YAML and flips back to Creative, the editor must handle the divergence between what creative controls would produce and what the YAML actually contains. RFC-005 explored hash-based detection, inverse mapping, and explicit state comparison.

## Decision

Three-state detection without stored hashes. The editor compares actual render/audio parameters in YAML against `creativeToTechnical(state)` output to determine the recipe state: `matched` (YAML matches creative output exactly), `partially-custom` (small divergences highlighted), or `custom` (major divergence, creative controls informational only). A reverse mapping (`technicalToCreative`) provides best-effort initial values when loading existing recipes. A "Saved" mood pill allows resetting to the original recipe state.

## Rationale

Explicit state detection is more reliable than hash-based approaches (hashes break on whitespace/comment changes). The reverse mapping is intentionally lossy — the creative-to-technical mapping is many-to-one, so perfect inversion is impossible. The three-state model gives power users freedom to edit YAML while keeping the creative surface useful as a reference point.

## Alternatives considered

- **Hash stored in YAML** — fragile; any YAML reformatting or comment change invalidates the hash. Adds non-semantic data to authored files.
- **Lock creative controls after YAML edit** — overly restrictive. Users should be able to return to creative mode even after manual edits.
- **Perfect inverse mapping** — mathematically impossible for many-to-one functions. Best-effort reverse is the pragmatic choice.

## Consequences

**Positive:**
- Power users edit YAML freely without losing the creative surface
- State indicator communicates divergence clearly
- No non-semantic data stored in recipe files
- "Saved" pill provides safe reset path

**Negative:**
- State detection adds complexity to mode switching
- Reverse mapping is approximate — creative controls show estimated values after YAML edits
- Three states need clear visual language (implemented via state indicator in flip bar)

## Implementation notes

- State detection: `gallery/src/lib/yamlParser.ts` (detectState, extractRenderParams)
- Creative mapping: `gallery/src/lib/creativeMapping.ts` (creativeToTechnical, technicalToCreative)
- Creative controls: `gallery/src/components/CreativeControls.tsx` (mood pills including "Saved", reset)
- Editor integration: `gallery/src/pages/RecipeEditor.tsx` (loadedParams, userEdited, originalCreative)
