# UXS-004 — Gallery

> **Status** · v0.2 · April 2026 · redesigned from hero+strip+grid to masonry+detail
> **IA anchor** · §surfaces/gallery · §topbar-patterns/gallery · §shared-tokens
> **Related PRD** · [PRD-004 Gallery](../prd/PRD-004-gallery.md)
> **Related ADRs** · [ADR-004 Three-layer data store](../adr/ADR-004-three-layer-data-store.md) · [ADR-012 Caddy as static file server](../adr/ADR-012-caddy-static-server.md)

---

## Why this UXS exists

The Gallery is the public face — the surface anyone visiting OceanCanvas sees first. It accumulates daily without curation. The gallery itself should feel like a composed piece of art, not a file browser.

## Principles

- **The gallery is a composition.** Tiles at varied sizes create visual rhythm. The layout itself is the editorial statement — no separate hero needed.
- **Art leads, data follows.** Renders fill tiles edge-to-edge. Metadata appears on hover only, never competing with the image.
- **Click to focus.** Browsing happens on the grid; focused viewing happens in a full-screen detail view. Two modes, not one scrolling page.
- **Self-curating.** Tile size is algorithmically determined by render count. No manual curation.

## Scope

**In scope** · Gallery topbar with source-filter pills; masonry grid with 3 size tiers; hover metadata; full-screen detail view at `/gallery/{recipe}` with render, strip, and actions; gallery tokens.

**Non-goals** · Recipe page editing; video editor handoff UX; behavioural rules (animation, transitions).

## Theme

Dark only.

## Tokens

### Inherited from IA

- **Surface** · `canvas`, `surface`, `elevated`, `overlay`, `border`, `border-strong`
- **Text** · `text`, `text-secondary`, `text-muted`, `text-disabled`
- **Intent** · `intent-info` (download action)
- **Typography** · `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here — `gallery-*`

| Token | Value | Usage |
|---|---|---|
| `gallery-overlay-gradient` | `linear-gradient(to top, rgba(3,11,16,0.85), transparent 40%)` | Gradient at bottom of tiles and detail view for text readability |
| `gallery-card-overlay` | `rgba(3,11,16,0.65)` | Translucent dark for hover metadata |
| `gallery-filter-active` | `text` over `elevated` | Active filter pill |
| `gallery-filter-inactive` | `text-muted` over transparent | Inactive filter pills |

## Layout — Main view (/)

The gallery is a single-page masonry grid. No hero section, no strip on this page. Tiles vary in size based on recipe activity.

```
┌────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS                         [all*] [SST] [salinity] [ice] │  ← topbar (42px)
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌───────────────────────┐  ┌──────────┐  ┌──────────┐           │
│  │                       │  │          │  │          │           │
│  │      LARGE TILE       │  │  MEDIUM  │  │ STANDARD │           │
│  │  (most-rendered       │  │  TILE    │  │   TILE   │           │
│  │   recipe, spans 2     │  │          │  │          │           │
│  │   columns)            │  │          │  └──────────┘           │
│  │                       │  │          │  ┌──────────┐           │
│  │                       │  └──────────┘  │ STANDARD │           │
│  └───────────────────────┘  ┌──────────┐  │   TILE   │           │
│  ┌──────────┐  ┌──────────┐ │  MEDIUM  │  │          │           │
│  │ STANDARD │  │ STANDARD │ │  TILE    │  └──────────┘           │
│  │   TILE   │  │   TILE   │ │          │                         │
│  │          │  │          │ │          │                         │
│  └──────────┘  └──────────┘ └──────────┘                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Size tiers

| Tier | Criteria | Size | Aspect ratio |
|---|---|---|---|
| **Large** | Most renders (top 1 recipe) | Spans 2 columns, tall | ~16:10 |
| **Medium** | ≥3 renders | 1 column, taller | ~3:4 |
| **Standard** | All others | 1 column | ~4:3 |

### Tile states

| State | Appearance |
|---|---|
| **Default** | Render image fills tile edge-to-edge, no border, no metadata visible |
| **Hover** | `gallery-overlay-gradient` at bottom, recipe name + type + date appear in `text` over gradient |
| **Focus** | `border-strong` ring around tile |
| **Click** | Navigates to `/gallery/{recipe}` (detail view) |

## Layout — Detail view (/gallery/{recipe})

Focused view of a single recipe's latest render. The render sits on the left; the context panel on the right provides editorial context about the data source — attribution, explanation, and educational value. The 14-day strip runs along the bottom.

```
┌────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS                                  timelapse ↗  recipe ↗│  ← topbar (42px)
│                                              download              │
├────────────────────────────────────┬───────────────────────────────┤
│                                    │                               │
│  recipe-name                       │  ABOUT THIS DATA              │
│  render-type · N renders           │                               │
│                                    │  NOAA/NCEI Optimum            │
│                                    │  Interpolation SST (OISST)    │
│     RENDER IMAGE                   │                               │
│     (object-fit: contain)          │  Global sea surface           │
│                                    │  temperature at 0.25°         │
│                                    │  resolution. Daily since      │
│                                    │  September 1981. Derived from │
│                                    │  satellite and in-situ obs.   │
│                                    │                               │
│                                    │  RECIPE                       │
│                                    │  region · render type · date  │
│                                    │                               │
│  oisst · recipe · date · OC       │  noaa.gov/oisst               │
│  (baked into PNG)                  │                               │
├────────────────────────────────────┴───────────────────────────────┤
│ LAST 14 DAYS                                                       │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘        │
└────────────────────────────────────────────────────────────────────┘
```

The context panel serves the *editorial-dignity* promise (PA §promises) and the *citation-travels* promise. The render is the art; the panel is the reading. Together they communicate that the art is grounded in real measurement.

### Detail view elements

| Element | Position | Tokens | Notes |
|---|---|---|---|
| **Topbar** | 42px, `surface` | Wordmark (returns to grid), actions on right | `text-secondary` for timelapse/recipe, `intent-info` for download |
| **Render image** | Left ~65% of body area | Object-fit: contain, no border | Recipe name + type overlay at top-left |
| **Context panel** | Right ~35%, `surface` background | `text` for headings, `text-secondary` for body, `text-muted` for labels | Three sections: About This Data, Recipe, Source Link |
| **About This Data** | Top of context panel | `type-label` for heading, `type-body` for description | Dataset name, what it measures, resolution, coverage, how it's produced |
| **Recipe section** | Middle of context panel | `type-label` heading, `type-data` values | Region, render type, authored date, render count |
| **Source link** | Bottom of context panel | `intent-info` for URL | Links to the data source (e.g., noaa.gov/oisst) |
| **14-day strip** | Bottom, full width, ~80px | `surface` background, render thumbnails, date labels | Today's thumbnail has `border-strong` ring |

### Navigation

- **Esc key** or **wordmark click** → returns to gallery grid
- **Left/Right arrows** → navigate between recipes (optional, v2)
- **Strip thumbnail click** → shows that date's render

## Component states

| Component | Default | Hover | Active | Focus | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|
| **Filter pill** | `gallery-filter-inactive` | `text-secondary` | `gallery-filter-active` | `border-strong` ring | shimmer | n/a | n/a |
| **Grid tile** | Render image, no metadata | Gradient + metadata text | n/a (navigates) | `border-strong` ring | shimmer | "no render" in `text-muted` | `intent-alert` outline |
| **Detail action** | `text-secondary` | `text` | n/a (navigates/downloads) | `border-strong` ring | spinner | n/a | `intent-alert` label |
| **Strip thumbnail** | Render at full opacity | `border-strong` ring | n/a | `border-strong` ring | shimmer | "—" placeholder | empty at `text-disabled` |

## Accessibility

- **Contrast** · text over `gallery-overlay-gradient` verified against multiple render colours.
- **Focus** · all tiles, actions, strip thumbnails show `border-strong` focus ring.
- **Keyboard** · grid tiles in tab order, Enter opens detail view. Esc closes detail view. Filter pills navigable by arrows. Strip by left/right arrows.
- **Reduced motion** · hover transitions respect `prefers-reduced-motion`.
- **Screen readers** · grid is `<ul>`, each tile has `aria-label` with recipe name and date. Detail view render has `aria-label` describing the recipe.

## Acceptance criteria

- [ ] Masonry grid with 3 size tiers (large/medium/standard) based on render count
- [ ] Tiles show render image only by default — no visible metadata
- [ ] Hover shows gradient + recipe name + type + date
- [ ] Click navigates to `/gallery/{recipe}` (detail view)
- [ ] Detail view: render fills viewport, overlay with name + source attribution
- [ ] Detail view: 14-day strip at bottom with date labels
- [ ] Detail view: topbar actions (timelapse ↗, recipe ↗, download)
- [ ] Esc key returns to gallery grid from detail view
- [ ] Source filter pills work (all/SST/etc)
- [ ] Dark canvas, all semantic tokens used
- [ ] Focus visible on all interactive elements
- [ ] Keyboard reachability confirmed

---

## Changelog

- **v0.2 · April 2026** — Redesigned from hero+strip+grid to masonry+detail. Dropped hero section; grid tiles now vary in size. Detail view is a separate route. 14-day strip moves to detail view only. Hover metadata replaces always-visible labels.
- **v0.1 · April 2026** — Initial draft: hero+strip+grid vertical stack.
