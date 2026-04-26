# UXS Index

UX Specifications for OceanCanvas. One UXS per surface (or per source spread, where ADR-017 applies). Each UXS defines the static visual contract — tokens, layout, component states, accessibility — for one surface.

The reference document for this folder is [`OC_IA.md`](OC_IA.md) — Information Architecture. Every UXS anchors to IA's `§surfaces`, `§topbar-patterns`, and `§shared-tokens` sections. UXS documents inherit shared tokens from IA; they define per-surface and per-source tokens themselves.

## What gets a UXS

The static visual contract for one surface — tokens, layout, component appearance, accessibility targets. UXS documents are the implementation contract for frontend work.

If the work is *behavioural* (animation timing, debounce, keyboard transitions, scroll behaviour, focus management sequences), it belongs in an [RFC](../rfc/index.md), not a UXS. The UXS specifies static appearance; the RFC specifies how the surface moves.

If the work is *structural* (a new surface, a new navigation path, a new URL), update [`OC_IA.md`](OC_IA.md) first. The UXS comes after IA reflects the structural change.

## Reference

| Doc | Purpose |
|---|---|
| [OC_IA.md](OC_IA.md) | Surfaces, navigation, URL structure, shell regions, shared tokens. The reference doc this folder anchors to. |
| [UXS_TEMPLATE.md](UXS_TEMPLATE.md) | UXS template. Read the "Notes on writing UXS" section before starting. |

## UXS documents

| UXS | Surface | Status | IA anchor |
|---|---|---|---|
| [UXS-001](UXS-001-dashboard-sst.md) | Dashboard, SST main view + editorial spread | Draft v0.2 | §surfaces/dashboard · §topbar-patterns/dashboard-main-view · §topbar-patterns/dashboard-editorial-spread |
| [UXS-002](UXS-002-dashboard-sealevel.md) | Dashboard, Sea Level editorial spread | Draft v0.1 | §surfaces/dashboard · §topbar-patterns/dashboard-editorial-spread |
| [UXS-003](UXS-003-recipe-editor.md) | Recipe Editor (creative + YAML modes) | Draft v0.1 | §surfaces/recipe-editor · §topbar-patterns/recipe-editor |
| [UXS-004](UXS-004-gallery.md) | Gallery (front page) | Draft v0.1 | §surfaces/gallery · §topbar-patterns/gallery |
| [UXS-005](UXS-005-video-editor.md) | Video Editor | Draft v0.1 | §surfaces/video-editor · §topbar-patterns/video-editor |

### Deferred (not yet drafted)

| UXS | Surface | Why deferred |
|---|---|---|
| UXS-NNN | Dashboard, Salinity editorial spread | Phase 2 source coverage |
| UXS-NNN | Dashboard, Sea Ice editorial spread | Phase 2 source coverage |
| UXS-NNN | Dashboard, Chlorophyll editorial spread | Phase 2 source coverage |
| UXS-NNN | Dashboard, main view (cross-source shell)  | The shared dashboard shell — currently embedded in UXS-001. May be extracted as its own UXS once the second source main view is being implemented. |
| UXS-NNN | Recipe page (Gallery `/gallery/{recipe}`) | Implementation pending |
| UXS-NNN | Single-render page (Gallery `/gallery/{recipe}/{date}`) | Implementation pending |
| UXS-NNN | Sketch Editor (mode within Recipe Editor) | Visual conventions need to firm up first |

## How UXS documents number

UXS numbering is by *order written*, not by surface or by source. UXS-001 was the first UXS drafted (Dashboard SST). UXS-002 is the second (Dashboard Sea Level — confirming ADR-017 with a genuinely different layout). The numbering is independent of any taxonomy — it reflects work history.

## How UXS documents evolve

A UXS document is versioned alongside the surface it describes. Status moves Draft → Active → Superseded. When a surface's design changes meaningfully, either the existing UXS is revised (small changes) or a new UXS supersedes it (large changes). Superseded UXSes are kept in the folder marked Superseded; the active version is linked from this index.

UXS-001 advanced from v0.1 to v0.2 after prototype-image verification surfaced layout details that the original draft (written from OC-05's textual figure descriptions) had got wrong. Subsequent UXSes (UXS-002 through UXS-005) were drafted directly from the prototypes, so they start at v0.1 with no equivalent v0.0-from-text predecessor.

## Cross-doc impact notes

Drafting these UXSes from the prototypes surfaced changes that other docs need:

| Doc | Change needed |
|---|---|
| **RFC-001 Recipe YAML schema** | Revise from two-tier (`creative:` / `technical:`) schema to flat schema with comment-marker sections (`# ⊓ creative controls ⊓ ...`). The prototype's YAML mode shows the flat-with-comments approach, which is cleaner. UXS-003 documents the visual contract; RFC-001 v0.2 should match. |
| **PRD-005 Video Editor** | Enumerate the overlays explicitly. UXS-005 lists the 10 concrete overlays (8 default-enabled, 2 deferred). PRD-005 currently references "audio + overlay enrichment" without listing the surface controls; v0.2 should reference UXS-005's overlay list. |
| **OC_IA §topbar-patterns** | New section in IA v0.2 capturing the per-surface topbar variation seen across all five prototypes. (Already done.) |
