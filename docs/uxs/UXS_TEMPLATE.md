# UXS-NNN: [Surface Name]

- **Status**: Draft | Active | Superseded by [UXS-NNN](UXS-NNN-slug.md)
- **Related PRD**: `docs/prd/PRD-NNN-slug.md`
- **Related RFC**: `docs/rfc/RFC-NNN-slug.md` *(for behavioural rules — those live in RFC, not here)*
- **Related IA**: `docs/uxs/OC_IA.md`
- **Related UXS**: `docs/uxs/UXS-NNN-slug.md`

## Summary

[2–4 sentences: what surface this covers and what problem the visual contract solves.]

## Principles

[3–5 design convictions for this surface. The 'why' behind the token choices.]

- **[Principle 1]**: [description]
- **[Principle 2]**: [description]

## Scope

**In scope:**
- [Specific panels, components, or states this UXS covers]

**Non-goals:**
- [Explicitly excluded]

**Boundary note:** Behavioural rules (animation timing, debounce, keyboard shortcuts, resize logic) belong in the related RFC, not here.

## Theme Support

- **Dark only** / Light only / Both
- Primary palette: [palette name from OC_IA.md]

## Semantic Colour Tokens

### Surface tokens

| Token | Value | Usage |
|---|---|---|
| `canvas` | `#030B10` | Base background — all surfaces |
| `surface` | `#050E1A` | Raised panels, cards |
| `elevated` | `#091525` | Modals, dropdowns |
| `overlay` | `rgba(3,11,16,0.85)` | Stats overlays on maps |
| `border` | `rgba(255,255,255,0.07)` | All dividers |
| `border-subtle` | `rgba(255,255,255,0.04)` | Internal component dividers |

### Text tokens

| Token | Value | Usage |
|---|---|---|
| `text-primary` | `rgba(255,255,255,1.0)` | Hero numbers, active labels |
| `text-secondary` | `rgba(255,255,255,0.7)` | Body text, values |
| `text-tertiary` | `rgba(255,255,255,0.4)` | Labels, metadata |
| `text-muted` | `rgba(255,255,255,0.25)` | Section labels (spaced caps) |
| `text-disabled` | `rgba(255,255,255,0.15)` | Inactive elements |

### Domain tokens *(source identity — not generic UI feedback)*

| Token | Accent | Usage |
|---|---|---|
| `domain-sst` | `#EF9F27` | SST source identity |
| `domain-seaice` | `#AFA9EC` | Sea ice source identity |
| `domain-salinity` | `#5DCAA5` | Salinity source identity |
| `domain-sealevel` | `#5DCAA5` | Sea level source identity |
| `domain-chlorophyll` | `#97C459` | Chlorophyll source identity |
| `domain-argo` | `#AFA9EC` | Argo float source identity |

### Intent tokens

| Token | Value | Usage |
|---|---|---|
| `intent-alert` | `#F09595` | Anomaly positive, warming, acceleration |
| `intent-success` | `#5DCAA5` | Confirmed, active, complete |
| `intent-warning` | `#EF9F27` | Caution, pending |

## Typography

| Scale | Size | Weight | Usage |
|---|---|---|---|
| `display` | 72–80px | 500 | Hero data points (14.2°C, +20.4cm) |
| `hero` | 48–56px | 500 | Large stats, section leaders |
| `xl` | 28–32px | 500 | Sub-hero numbers |
| `lg` | 18–22px | 500 | Secondary stats |
| `base` | 14–16px | 400 | Body, descriptions |
| `sm` | 11–12px | 400 | Supporting text |
| `label` | 9–10px | 500 | Section labels — SPACED CAPS, `letter-spacing: 0.14em` |
| `mono` | 10px | 400 | Coordinate displays, YAML, code |

## Layout and Spacing

- **Base unit**: 4px
- **Max content width**: [surface-specific]
- **Major regions**: [describe the layout zones for this surface]

## Key States

| Component | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|
| [Component] | [description] | [description] | [description] | [description] | [description] | [description] | [description] |

## Acceptance Criteria

- [ ] All colours use semantic tokens — no one-off hex values
- [ ] All foreground/background pairings use matching token pairs from this spec
- [ ] Key states (hover, active, focus, disabled) match spec for all interactive elements
- [ ] No chart borders anywhere on this surface
- [ ] No white or light-mode backgrounds
- [ ] Domain token used for source identity elements — intent tokens not used for source identity
- [ ] Numbers at correct scale per typography table
- [ ] Section labels in SPACED CAPS at `text-muted` colour
