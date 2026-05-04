# ADR-019 — Render payload JSON schema

> **Status** · Accepted
> **Date** · 2026-04-30
> **TA anchor** · §contracts/render-payload · §components/render-system
> **Related RFC** · RFC-002 (closes)
> **Related PRDs** · PRD-001 Recipe

## Context

ADR-008 locks the principle that the editor preview and pipeline render use the same payload format. RFC-002 deliberated the actual schema: what fields, what serialisation, how NaN values are represented. The format has been stable across two sources (OISST grid data, Argo point data) and three sketch types (field, particles, scatter).

## Decision

Single JSON file per render with a fixed top-level schema. Fields: `recipe` (block with id, name, render params), `region` (lat/lon bounds), `output` (width/height/dpi), `data` (array of band objects with shape, min, max, and flat float arrays), `metadata` (source, date, attribution). NaN represented as `-999.0`. Point data uses `{lat, lon, value}` array format. Payload filename pattern: `{recipe}__{date}.json` (double underscore separator).

## Rationale

Plain JSON is verbose but debuggable — any render issue can be diagnosed by inspecting the payload file. The fixed schema supports both grid and point data without branching. NaN as `-999.0` avoids JSON's lack of NaN support while remaining detectable in sketch code. The format has been validated across 101 pipeline tests and 3 sketch types.

## Alternatives considered

- **Binary format (MessagePack, CBOR)** — faster parse, smaller files, but not human-debuggable. Premature optimisation for v1 regional payloads.
- **Separate metadata file** — adds file management complexity for no gain when payloads are already per-render.

## Consequences

**Positive:**
- Hand-debuggable payloads accelerate sketch development
- Same format for preview and pipeline (ADR-008 constraint satisfied)
- Point and grid data coexist in one schema

**Negative:**
- JSON parse time grows with payload size; may need binary format for global-scale or historical renders
- `-999.0` sentinel requires awareness in every sketch (shared.js `NAN_VALUE` constant mitigates)

## Implementation notes

- Pipeline builder: `pipeline/src/oceancanvas/tasks/build_payload.py`
- Browser builder: `gallery/src/lib/payloadBuilder.ts`
- NaN constant: `pipeline/src/oceancanvas/constants.py` (`NAN_VALUE = -999.0`) and `sketches/shared.js`
- Payload files: `data/payloads/{recipe}__{date}.json`

## Schema additions since acceptance

The payload's `recipe` block is open-ended — additional fields may be carried alongside `render` without breaking the contract. Additions to date:

- **`recipe.audio`** (v0.4.0, [ADR-027](ADR-027-generative-audio-composition.md)) — generative audio character. Optional. The recipe's `audio:` YAML block round-trips here; consumers (browser audio engine, pipeline `audio.py`) read it at use time.
- **`recipe.tension_arc`** (v0.5.0, [ADR-028](ADR-028-tension-arc-shared-curve.md)) — tension-arc spec (preset + 3 shaping params + `pin_key_moment`). Optional. The **spec** travels through the payload, **not** the expanded per-frame array — each consumer expands via the cross-validated `tensionArc.ts` / `arc.py` with its own `totalFrames` and dominant-moment-frame context. This keeps per-frame payloads small (~150 bytes for the spec vs ~5 KB for an expanded 534-float array).

Payload version bumped to **2** at v0.5.0 to mark the `tension_arc` field's appearance. v1 payloads remain readable by v2 consumers (missing field → constant 1.0).
