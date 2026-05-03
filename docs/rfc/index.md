# RFC Index

Requests for Comments — open technical questions for OceanCanvas. Each RFC explores a single question with alternatives and trade-offs, then closes into one or more ADRs.

The reference document for the technical plane is [`OC_TA.md`](../adr/OC_TA.md), which lives with the ADRs (the settled tier). RFCs anchor to TA's §components, §contracts, and §constraints sections. Once an RFC closes, it produces ADRs that update TA.

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
| [RFC-001](RFC-001-recipe-yaml-schema.md) | Recipe YAML schema | Decided | [ADR-018](../adr/ADR-018-recipe-yaml-schema.md) | §contracts/recipe-yaml |
| [RFC-002](RFC-002-render-payload-format.md) | Render payload format | Decided | ADR-008 + [ADR-019](../adr/ADR-019-render-payload-schema.md) | §contracts/render-payload |
| [RFC-003](RFC-003-recipe-lifecycle.md) | Recipe lifecycle on source unavailability | Decided | [ADR-025](../adr/ADR-025-recipe-lifecycle.md) | §components/pipeline · §constraints |
| [RFC-004](RFC-004-live-preview-architecture.md) | Live preview architecture | Decided | [ADR-020](../adr/ADR-020-live-preview-architecture.md) | §components/render-system · §components/web-frontend |
| [RFC-005](RFC-005-yaml-round-tripping.md) | YAML round-tripping | Decided | [ADR-021](../adr/ADR-021-yaml-round-tripping.md) | §contracts/recipe-yaml |
| [RFC-006](RFC-006-audio-system.md) | Audio system design | Decided | [ADR-026](../adr/ADR-026-audio-stem-system.md) | §components/render-system |
| [RFC-007](RFC-007-key-moment-detection.md) | Key moment detection | Decided | [ADR-024](../adr/ADR-024-key-moment-detection.md) | §components/render-system |
| [RFC-008](RFC-008-v2.md) | Pipeline parallelisation strategy | Decided | [ADR-023](../adr/ADR-023-pipeline-parallelisation.md) | §components/pipeline |
| [RFC-009](RFC-009.md) | Pipeline CLI interface | Decided | [ADR-022](../adr/ADR-022-cli-entry-point.md) | §components/pipeline |

## State map

The live state of all RFCs and ADRs lives in [`OC_TA.md §map`](../adr/OC_TA.md#map). This index mirrors the RFC portion. ADRs (settled decisions) are tracked in [`../adr/index.md`](../adr/index.md).

When an RFC closes:

1. Its status here flips from *Draft v0.1* (or whatever revision) to *Decided*.
2. One or more ADR files appear in `../adr/`.
3. TA §map's RFC row gets *Decided* and links to the closing ADR(s); §stack picks up new entries if the RFC unlocked stack-level decisions.

## A note on numbering

RFCs and ADRs are independently numbered. The current RFC list (1–7) replaces an earlier 7-RFC draft — three were demoted to ADRs once the deliberation turned out to be smaller than expected:

- *Processed JSON format* (was RFC-003) → [ADR-015](../adr/ADR-015-processed-json-format.md).
- *Docker Compose stack* (was RFC-004) → [ADR-011](../adr/ADR-011-docker-compose.md) + the `docker-compose.yml` config file itself.
- *GitHub Actions CI* (was RFC-007) → [ADR-013](../adr/ADR-013-github-actions-code-only.md) + [ADR-014](../adr/ADR-014-synthetic-e2e-gate.md).

The current list adds three RFCs surfaced from PRD open threads: *Recipe lifecycle* (RFC-003), *Live preview architecture* (RFC-004), *YAML round-tripping* (RFC-005).
