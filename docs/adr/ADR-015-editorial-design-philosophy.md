# ADR-015: Editorial Design Philosophy — Dark Canvas, Data as Hero

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04 and OC-05)*
- **Related PRDs**: `docs/prd/PRD-005-dashboard-data-explorer.md`, `docs/prd/PRD-006-recipe-editor-studio.md`, `docs/prd/PRD-007-gallery.md`

## Context & Problem Statement

OceanCanvas presents ocean data as both scientific information and generative art. The visual design must serve both purposes: scientific credibility (data is precise, sourced, dated) and artistic quality (data is beautiful, emotionally resonant, worth looking at). Standard SaaS dashboard aesthetics contradict both goals.

## Decision

All OceanCanvas surfaces follow an editorial design philosophy derived from Wired magazine's data visualisation approach: dark canvas always, data is the hero, numbers appear at display scale, colour encodes physical meaning, no chart borders.

## Rationale

The ocean data — thermal colour fields, chlorophyll blooms, sea ice extent — glows against dark backgrounds. Numbers at display scale (14.2°C at 72px) make the data point the visual element, not a label on a chart. Colour encoding physical meaning (thermal palette for SST, teal for sea level, violet for ice) makes the source palette the legend — no separate legend needed.

## Alternatives Considered

1. **Standard SaaS light-mode dashboard**
   - **Pros**: Familiar to users of analytics tools, high readability in bright environments
   - **Cons**: Data does not glow on white. The generative art aesthetic is lost. Contradicts the project's identity as both data tool and art system.
   - **Why Rejected**: Fundamentally inconsistent with OceanCanvas's dual identity.

2. **Source-neutral colour palette**
   - **Pros**: Consistent visual identity across all sources
   - **Cons**: Loses the physical meaning encoded in the palette. SST should look warm. Ice should look cold.
   - **Why Rejected**: Colour encoding physical meaning is core to scientific credibility.

## Consequences

**Positive:**
- Consistent editorial identity across all four surfaces
- Colour palette serves as the data legend — no redundant legend elements
- Generative art renders look coherent within the product context

**Negative:**
- Dark canvas requires careful contrast management for accessibility
- Light-mode users have no alternative — this is a product-level commitment

**Neutral:**
- Per-source colour identities (SST amber, sea level teal, ice violet, chlorophyll green, salinity blue-teal, Argo purple) formalised as semantic tokens in UXS-001 through UXS-004

## Implementation Notes

Base canvas: `#030B10` (near-black with deep ocean blue cast). All surfaces use this background. Source accent colours and full palettes defined in `docs/uxs/OC_IA.md` and individual UXS documents.
