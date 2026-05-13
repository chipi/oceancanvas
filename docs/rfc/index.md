# RFC Index

Requests for Comments — open technical questions for OceanCanvas. Each RFC explores a single question with alternatives and trade-offs, then closes into one or more ADRs.

The reference document for the technical plane is [`OC_TA.md`](../adr/OC_TA.md), which lives with the ADRs (the settled tier). RFCs anchor to the **Components**, **Contracts**, and **Constraints** sections of `OC_TA.md`. Once an RFC closes, it produces ADRs that update `OC_TA.md`.

For settled architectural decisions, see [`../adr/`](../adr/index.md).

## What gets an RFC

An open technical question with plausible alternatives and trade-offs that require deliberation. RFCs explore. They do not specify implementation. They close into one or more ADRs once a decision is made.

If the answer is mostly known going in, skip the RFC and write an [ADR](../adr/index.md). If the work is "set up the thing", neither — it's a config file and a commit. The "Why this is an RFC" sentence in the RFC header is the test: if it's hard to write, the file should not be an RFC.

## Reference

| Doc | Purpose |
|---|---|
| [OC_TA.md](../adr/OC_TA.md) | Components, contracts, constraints, stack, RFC/ADR state map. Lives with ADRs (the settled tier). RFCs anchor to its sections. |
| [RFC_TEMPLATE.md](RFC_TEMPLATE.md) | RFC template. Read the "Notes on writing RFCs" section before starting. |

## RFCs

| RFC | Title | Status | Closes into | TA anchor |
|---|---|---|---|---|
| [RFC-001](RFC-001-recipe-yaml-schema.md) | Recipe YAML schema | Decided | [ADR-018](../adr/ADR-018-recipe-yaml-schema.md) | contracts/recipe-yaml |
| [RFC-002](RFC-002-render-payload-format.md) | Render payload format | Decided | ADR-008 + [ADR-019](../adr/ADR-019-render-payload-schema.md) | contracts/render-payload |
| [RFC-003](RFC-003-recipe-lifecycle.md) | Recipe lifecycle on source unavailability | Decided | [ADR-025](../adr/ADR-025-recipe-lifecycle.md) | components/pipeline · constraints |
| [RFC-004](RFC-004-live-preview-architecture.md) | Live preview architecture | Decided | [ADR-020](../adr/ADR-020-live-preview-architecture.md) | components/render-system · components/web-frontend |
| [RFC-005](RFC-005-yaml-round-tripping.md) | YAML round-tripping | Decided | [ADR-021](../adr/ADR-021-yaml-round-tripping.md) | contracts/recipe-yaml |
| [RFC-006](RFC-006-audio-system.md) | Audio system design | Decided | [ADR-026](../adr/ADR-026-audio-stem-system.md) | components/render-system |
| [RFC-007](RFC-007-key-moment-detection.md) | Key moment detection | Decided | [ADR-024](../adr/ADR-024-key-moment-detection.md) | components/render-system |
| [RFC-008](RFC-008-v2.md) | Pipeline parallelisation strategy | Decided | [ADR-023](../adr/ADR-023-pipeline-parallelisation.md) | components/pipeline |
| [RFC-009](RFC-009.md) | Pipeline CLI interface | Decided | [ADR-022](../adr/ADR-022-cli-entry-point.md) | components/pipeline |
| [RFC-010](RFC-010-generative-audio-composition.md) | Generative audio composition | Decided | [ADR-027](../adr/ADR-027-generative-audio-composition.md) (supersedes ADR-026) | components/render-system |
| [RFC-011](RFC-011-tension-arc.md) | Tension arc as shared primitive | Decided | [ADR-028](../adr/ADR-028-tension-arc-shared-curve.md) | components/render-system · contracts/recipe-yaml · contracts/render-payload |
| [RFC-012](RFC-012-atmospheric-audio.md) | Atmospheric audio: from data-sonification to ambient backdrop | Draft v0.1 | ADR-029 + ADR-030 (pending) | components/render-system · contracts/recipe-yaml · contracts/render-payload · constraints |
| [RFC-013](RFC-013-editor-knobs.md) | Editor controls: circular knobs + envelope-aware indicators | Draft v0.1 | ADR-031 (pending) | components/web-frontend · contracts/recipe-yaml |
| [RFC-014](RFC-014-modulation-graph.md) | Modulation graph: per-parameter breakpoint envelopes + embedded LFOs | Draft v0.1 | ADR-032 + ADR-033 (pending); supersedes ADR-028 | components/render-system · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints |
| [RFC-015](RFC-015-bloom.md) | Bloom: generative recipe + audio variant generator | Draft v0.1 | ADR-034 + ADR-035 (pending) | components/pipeline · components/web-frontend · contracts/recipe-yaml · constraints |
| [RFC-016](RFC-016-motion-clocks.md) | Per-layer motion clocks: data-derived modulation sources | Draft v0.1 | ADR-036 + ADR-037 (pending) | components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints |
| [RFC-017](RFC-017-recipe-macros.md) | Recipe-level macros: one knob, many parameters | Draft v0.1 | ADR-038 (pending) | components/render-system · components/web-frontend · contracts/recipe-yaml · constraints |
| [RFC-018](RFC-018-recipe-morphing.md) | Recipe morphing: continuous interpolation between recipes | Draft v0.1 | ADR-039 + ADR-040 (pending) | components/render-system · components/pipeline · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints |

## State map

The live state of all RFCs and ADRs lives in [`OC_TA.md` (Map)](../adr/OC_TA.md#map). This index mirrors the RFC portion. ADRs (settled decisions) are tracked in [`../adr/index.md`](../adr/index.md).

When an RFC closes:

1. Its status here flips from *Draft v0.1* (or whatever revision) to *Decided*.
2. One or more ADR files appear in `../adr/`.
3. The RFC row in `OC_TA.md` (Map) flips to *Decided* and links to the closing ADR(s); the **Stack** table picks up new entries if the RFC unlocked stack-level decisions.

## A note on numbering

RFCs and ADRs are independently numbered. The canonical list is **RFC-001 through RFC-011** in the table above. An earlier draft used a different 7-RFC numbering — three topics were demoted to ADRs once the deliberation turned out to be smaller than expected:

- *Processed JSON format* (was RFC-003) → [ADR-015](../adr/ADR-015-processed-json-format.md).
- *Docker Compose stack* (was RFC-004) → [ADR-011](../adr/ADR-011-docker-compose.md) + the `compose/docker-compose.yml` config file itself.
- *GitHub Actions CI* (was RFC-007) → [ADR-013](../adr/ADR-013-github-actions-code-only.md) + [ADR-014](../adr/ADR-014-synthetic-e2e-gate.md).

The current list adds three RFCs surfaced from PRD open threads: *Recipe lifecycle* (RFC-003), *Live preview architecture* (RFC-004), *YAML round-tripping* (RFC-005).
