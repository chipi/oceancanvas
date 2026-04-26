# UXS-001: Dashboard Data Explorer

- **Status**: Draft
- **Related PRD**: `docs/prd/PRD-005-dashboard-data-explorer.md`
- **Related RFC**: none (dashboard has no complex behaviour requiring RFC)
- **Related IA**: `docs/uxs/OC_IA.md`
- **Related UXS**: `docs/uxs/UXS-002-recipe-editor.md`

## Summary

This UXS defines the static visual contract for the dashboard data explorer — the full-bleed heatmap view, the source rail, the floating stats overlay, the timeline scrubber, and the editorial spread layouts for SST and sea level.

## Principles

- **Data is the hero**: the ocean heatmap occupies the full canvas — no chrome competes with it
- **Numbers at display scale**: key statistics appear at 48–72px, not in KPI cards
- **Colour encodes physics**: the source palette is the legend — no separate legend element
- **Editorial voice**: spreads read like magazine pages, not dashboard panels
- **Dark always**: `canvas` background everywhere; data glows against the dark

## Scope

**In scope:** main heatmap view, source rail, stats overlay, timeline scrubber, mini time series, SST editorial spread, sea level editorial spread, region selector mode

**Non-goals:** individual source UXS details beyond SST and sea level (other sources deferred to Phase 2)

**Boundary note:** timeline scrubber animation timing and hover debounce behaviour belong in an RFC, not here.

## Theme Support

- **Dark only**
- Primary palette: `domain-sst` (amber/thermal) for the default SST view

## Semantic Colour Tokens

### Surface tokens (inherited from OC_IA.md)

| Token | Value | Usage |
|---|---|---|
| `canvas` | `#030B10` | Map background, page background |
| `surface` | `#050E1A` | Topbar, stats card backdrops |
| `overlay` | `rgba(3,11,16,0.85)` | Stats overlay cards on the map |
| `border` | `rgba(255,255,255,0.07)` | Timeline divider, source rail separator |

### Domain tokens — SST

| Token | Stops | Usage |
|---|---|---|
| `domain-sst-cold` | `#042C53` | Coldest SST values |
| `domain-sst-mid` | `#0F6E56` → `#639922` → `#BA7517` | Mid-range SST |
| `domain-sst-warm` | `#D85A30` | Warm SST |
| `domain-sst-hot` | `#791F1F` | Hottest SST |
| `domain-sst-accent` | `#EF9F27` | UI accent for SST surface (stats, labels) |

### Domain tokens — Sea level

| Token | Value | Usage |
|---|---|---|
| `domain-sealevel-accent` | `#5DCAA5` | UI accent for sea level surface |
| `domain-sealevel-fill` | `#04342C` → `#1D9E75` | Rise curve fill gradient |

### Intent tokens (on the dashboard)

| Token | Value | Usage |
|---|---|---|
| `intent-alert` | `#F09595` | Positive anomaly values, warming |
| `intent-info` | `#5DCAA5` | Negative anomaly, cooling |

## Layout — Main view

```
┌──────────────────────────────────────────────┐ 42px  topbar
├──────────────────────────────────────────────┤
│                                              │
│  FULL-BLEED MAP CANVAS (deck.gl BitmapLayer) │ flex 1
│                                              │
│  ┌──────────────┐          ┌───────────────┐│
│  │ stats overlay│          │ legend strip  ││ floating
│  └──────────────┘          └───────────────┘│
├──────────────────────────────────────────────┤
│  timeline scrubber (full width)              │ 52px
├──────────────────────────────────────────────┤
│  mini time series (full width)               │ 64px
└──────────────────────────────────────────────┘
```

### Stats overlay (floating bottom-left of map)

- 3 cards, translucent dark backdrop (`overlay` token)
- Each card: value at `lg` scale (18px), label at `label` scale (9px spaced caps)
- Cards: region mean (SST amber), region max (text-secondary), anomaly (intent-alert or intent-info)
- No borders on cards — translucent backdrop only

### Legend strip (floating top-right of map)

- 10px wide colour bar, 120px tall
- 4 value labels at `mono` scale (8px), right-aligned
- No border, no box — sits directly on the map

### Source rail (topbar)

- Tab-style navigation: source name in `label` style (9px spaced caps)
- Active source: 2px left border in source accent colour
- Inactive sources: `text-muted` colour

## Layout — SST editorial spread

```
┌───────────────────────────────────┬───────────────┐
│ 14.2°C                [display]   │               │
│ +1.4° above climatology [hero]    │  SST heatmap  │
│                                   │  (full-bleed  │
│ ────────────────────────────────  │   right half) │
│ max | min | mean | record  [data] │               │
├───────────────────────────────────┴───────────────┤
│ 41-year trend chart (left) │ anomaly bars (right) │
└─────────────────────────────────────────────────────┘
```

- Hero number: `display` scale (72px), font-weight 500, `domain-sst-accent`
- Anomaly: `hero` scale (48px), `intent-alert` colour
- Data strip: 4 columns, 0.5px dividers, values at `lg`, labels at `label`
- Charts: no borders, no backgrounds, data on dark canvas

## Layout — Sea level editorial spread

- Full-width rise curve as hero (280px tall, spans page width)
- Numbers float over the curve: +20.4cm (`display` scale), 3.7mm/yr (`xl` scale)
- Acceleration rate in `intent-alert` colour: +5.1mm/yr current
- Events strip below: 5 columns, date in `domain-sealevel-accent`, description in `text-secondary`
- Acceleration bar chart: bars graduating from `domain-sealevel-accent` → `intent-alert`

## Key States

| Component | Hover | Active | Focus | Loading |
|---|---|---|---|---|
| Map | Crosshair cursor, coordinate tooltip | — | — | Spinner over previous tile |
| Source tab | `text-secondary` | Source accent border, `text-primary` | Outline | — |
| Timeline scrubber | Cursor + date tooltip | — | Outline | — |
| Region selector | Crosshair, draw box | Box visible with handles | — | — |
| Stats card | Expanded tooltip | — | — | Skeleton at `text-muted` |

## Typography

- Hero stats: `display` (72px) — the number IS the visual
- Sub-hero: `hero` (48px) — anomaly values
- Section labels: `label` (9px, spaced caps, `text-muted`) — no bold
- Chart axes: `mono` (8px, `text-disabled`) — never compete with data
- Body copy (art potential sections): `base` (14px, `text-secondary`, line-height 1.6)

## Acceptance Criteria

- [ ] Map heatmap fills 100% of viewport width with no padding
- [ ] Stats overlay uses `overlay` token — no opaque white backgrounds
- [ ] Hero number at correct `display` scale — 72px minimum
- [ ] Anomaly shown in `intent-alert` (positive) or `intent-info` (negative) — never in amber
- [ ] Source rail shows active source with 2px left border in source accent colour
- [ ] All chart elements have no borders, no background fills
- [ ] Section labels are SPACED CAPS at `label` scale in `text-muted` colour
- [ ] No legend box — colour bar only, no surrounding border
