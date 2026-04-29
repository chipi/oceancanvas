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
