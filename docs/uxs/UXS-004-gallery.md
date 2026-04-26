# UXS-004 — Gallery

> **Status** · Draft v0.1 · April 2026 · drafted from prototype mockup (OC-02 Fig 6)
> **IA anchor** · §surfaces/gallery · §topbar-patterns/gallery · §shared-tokens
> **Related PRD** · [PRD-004 Gallery](../prd/PRD-004-gallery.md)
> **Related ADRs** · [ADR-004 Three-layer data store](../adr/ADR-004-three-layer-data-store.md) · [ADR-012 Caddy as static file server](../adr/ADR-012-caddy-static-server.md)
> **Related RFC** · *None yet — Gallery interaction rules (filter behaviour, hero rotation, infinite scroll on grid) need an RFC when implemented.*

---

## Why this UXS exists

The Gallery is the public face — the surface anyone visiting OceanCanvas sees first when they open the project URL. Per IA, `/` is the Gallery. It accumulates daily without curation: today's hero is today's featured render; the 14-day strip is the same recipe's recent history; the grid is everything that rendered today. The visual contract here is the lowest-chrome surface in the product — the renders are the entire point, and the chrome that holds them must be correspondingly invisible.

## Principles

- **The renders own the screen.** Hero is full-bleed. Cards are render-first. No widget chrome on the renders themselves.
- **Self-curating, not silent.** The gallery shows what is, not what an editor decided. Yesterday's hero is no longer the hero today; that is the system working correctly.
- **Filtering, not searching.** Filtering by source type (all · SST · salinity · sea level · ice) is the only way to narrow the view in v1. There is no search box, no tag system, no faceting.
- **Actions are quiet.** `timelapse ↗`, `recipe ↗`, `download` appear in the upper-right of the hero in a subtle row — present when needed, never insistent.

## Scope

**In scope** · Gallery topbar with source-filter pills; full-bleed hero with metadata overlay and three actions (timelapse / recipe / download); 14-day strip showing today's hero recipe's recent history; 3-column recipe grid with cards; gallery citation footer.

**Non-goals** · Recipe page (`/gallery/{recipe}`) and single-render page (`/gallery/{recipe}/{date}`) — both deferred to their own UXSes; sketch editor; behavioural rules (filter transitions, hero rotation logic, grid infinite scroll).

**Boundary note** · How the hero is selected daily, how filter state changes the view, how the 14-day strip animates between dates, hover-state timing on grid cards — all RFC territory. This UXS specifies what each piece looks like, not how it changes.

## Theme

Dark only.

## Tokens

### Inherited from IA

- **Surface** · `canvas`, `surface`, `elevated`, `overlay`, `border`, `border-strong`
- **Text** · `text`, `text-secondary`, `text-muted`, `text-disabled`
- **Intent** · `intent-info` (primary action: download)
- **Typography** · `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here — `gallery-*`

The Gallery introduces minimal surface-specific tokens because the surface is mostly an arrangement of rendered images.

| Token | Value | Usage |
|---|---|---|
| `gallery-overlay-gradient` | `linear-gradient(to top, rgba(3,11,16,0.85), transparent 40%)` | Subtle dark gradient at the bottom of hero/cards to make text readable over varying render colours |
| `gallery-card-overlay` | `rgba(3,11,16,0.65)` | Translucent dark for the card label area |
| `gallery-card-icon` | `rgba(255,255,255,0.5)` | The small "play" indicator at top-right of each card |
| `gallery-filter-active` | `text` over `elevated` | Active filter pill (e.g. "all" highlighted) |
| `gallery-filter-inactive` | `text-muted` over transparent | Inactive filter pills |

The filter-active and -inactive tokens are functionally equivalent to inherited tokens, but called out here because the pill component is gallery-specific and the visual contract should be obvious.

## Layout (Fig 6)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS                              [all*] [SST] [salinity] [sea level] [ice]│  ← topbar (42px)
│                                          ^ filter pills (right)            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                                                  timelapse ↗  recipe ↗  download │  ← actions row
│                                                  (text-secondary, intent-info on download)│
│                                                                            │
│                                                                            │
│              FULL-BLEED HERO                                               │
│              (today's featured render)                                     │
│                                                                            │
│                                                                            │
│                                                                            │  ← gradient fade at bottom
│  gulf_stream_thermal · OISST SST · field                            25 Apr │     for label readability
│  North Atlantic Sea Surface Temperature                              2026  │
│  25°N–65°N · 80°W–0° · +1.4° above climatology                             │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ THIS RECIPE gulf_stream_thermal ⊓ last 14 days                             │  ← strip header
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐                  │
│ │  ││  ││  ││  ││  ││  ││  ││  ││  ││  ││  ││  ││  ││*│                  │  ← 14 thumbnails
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                  │     today (25 Apr)
│ 12 Apr 13 14 15 16 17 18 19 20 21 22 23 24 25 Apr                          │     marked active
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ ALL RECIPES ⊓ TODAY                                            6 renders   │  ← grid header
│                                                                            │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐             │
│ │     [render]    ▷│ │     [render]    ▷│ │     [render]    ▷│             │  ← row 1
│ │ SST · field      │ │ Ice · pulse      │ │ Salinity · field │             │
│ │ gulfstream therm │ │ arctic ice pulse │ │ north atl salin  │             │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘             │
│                                                                            │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐             │
│ │     [render]    ▷│ │     [render]    ▷│ │     [render]    ▷│             │  ← row 2
│ │ Sea level · field│ │ Chlorophyll·field│ │ Argo · scatter   │             │
│ │ sea level anom   │ │ spring bloom chl │ │ argoscatter      │             │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘             │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ OceanCanvas · Gallery front page · Daily render accumulation · Hero +       │  ← page-composition
│ 14-day strip + all recipes grid · Timelapse and recipe access              │     footer
└────────────────────────────────────────────────────────────────────────────┘
```

| Region | Position / size | Tokens | Notes |
|---|---|---|---|
| **Topbar** | Full width, 42px | `surface` background, wordmark in `text` (clickable, returns to `/`), filter pills on right | Per IA §topbar-patterns/gallery |
| **Filter pills** | Right side of topbar, ~24px tall pills with 8px gaps | `gallery-filter-active` (active) / `gallery-filter-inactive` (inactive); active pill has `elevated` background | "all" / "SST" / "salinity" / "sea level" / "ice" |
| **Hero canvas** | Full width, ~50–55% of viewport height | the render image fills the whole canvas, no border, no rounded corners | Today's featured render — the recipe with most accumulation, or a manual editorial pick |
| **Hero actions row** | Upper-right of hero, padded ~24px from edges | `text-secondary` for "timelapse ↗" and "recipe ↗"; `intent-info` for "download"; small `text-axis` separator dots | Three actions with subtle `·` separators |
| **Hero metadata (lower-left)** | Lower-left of hero, with `gallery-overlay-gradient` behind it | recipe-id + source + render-type in `text` `type-data`; description in `text-secondary` `type-body`; region + anomaly in `text-muted` `type-axis` | Three lines stacked |
| **Hero date (lower-right)** | Lower-right of hero | day in `text` `type-display`; year in `text-secondary` `type-data` below | "25 Apr" / "2026" |
| **14-day strip header** | Below hero, full width, ~24px | `text-muted` `type-label` spaced caps | "THIS RECIPE gulf_stream_thermal ⊓ last 14 days" |
| **Strip thumbnails** | Below header, 14 tiles in a row, each ~70px wide × ~52px tall | `canvas` background, render image fills tile; today's tile has `border-strong` 1px ring | Each tile has a small date label below in `text-muted` `type-axis` |
| **Grid header** | Below strip, full width | `text-muted` `type-label` spaced caps for "ALL RECIPES ⊓ TODAY"; `text-muted` `type-axis` for count on right | Count format: "{N} renders" |
| **Grid card** | 3 columns, ~33% width each, gap 8px, ~3:1 width:height ratio | render image fills the card; `gallery-card-overlay` darkens the lower-left area where the label sits | Each card has rounded corners 0px (no rounding); subtle `border` 1px on hover |
| **Grid card label** | Lower-left of each card | source + render-type in `text` `type-data`; recipe-name in `text-secondary` `type-body` | Two-line label |
| **Grid card icon** | Upper-right of each card, ~16px square | `gallery-card-icon` triangle "play" glyph at low opacity | Indicates the recipe has a timelapse |
| **Page-composition footer** | Bottom, full width | `text-muted` `type-axis` | The descriptive footer documenting what the page is — different from the per-source citation footer used in Dashboard. The Gallery's footer is descriptive of *the page*, not of a single source's data |

## Component states

| Component | Default | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| **Filter pill** | `gallery-filter-inactive` | `text-secondary` | `gallery-filter-active` (one at a time across the row) | `border-strong` ring | n/a | shimmer | n/a | n/a |
| **Hero action — timelapse / recipe** | `text-secondary` text + ↗ glyph | `text` colour | n/a (navigates) | `border-strong` ring | `text-disabled` | n/a | n/a | n/a |
| **Hero action — download** | `intent-info` text | brighter `intent-info` | n/a (initiates download) | `border-strong` ring | `text-disabled` | spinner replaces label | n/a | label flips to `intent-alert` "download failed" |
| **Strip thumbnail (past day)** | render image at full opacity | brightens slightly with `border-strong` ring | n/a | `border-strong` ring | n/a | shimmer if missing | "—" placeholder if no render that day | empty box at `text-disabled` opacity |
| **Strip thumbnail (today)** | `border-strong` 1px ring + render image at full opacity | n/a (already today) | n/a | `border-strong` ring | n/a | shimmer | n/a | n/a |
| **Grid card** | render image fills, label in lower-left | `border` 1px outline appears around card | n/a (clicking goes to recipe page) | `border-strong` ring | `text-disabled` overlay | shimmer over the image area | "no render today" centred in `text-muted` | `intent-alert` outline + "render failed" label |

## Accessibility

- **Contrast** · `gallery-filter-active` (`text` over `elevated`) is well above WCAG AA. The hero metadata text over the gradient backdrop is verified against multiple render colours — the gradient ensures readability over thermal warm, ice pale, salinity teal alike.
- **Focus** · all interactive elements (filter pills, hero actions, strip thumbnails, grid cards) show a `border-strong` focus ring.
- **Keyboard** · filter pills navigable by arrow keys + Enter; strip thumbnails navigable by left/right arrow keys (enters the recipe's date page); grid cards in tab order, Enter opens the recipe page. Hero actions tab-reachable in order timelapse → recipe → download.
- **Reduced motion** · hero rotation, filter transitions, hover effects respect `prefers-reduced-motion`. Per-RFC implementation.
- **Screen readers** · hero is `<article>` with `aria-label` containing the recipe id and date; metadata is `<dl>` with proper `<dt>`/`<dd>` pairs; strip is `<nav>` with each thumbnail as a link; grid is `<ul>` of cards. Each card has `aria-label` containing the recipe id and source.

## Acceptance criteria

- [ ] Topbar shows wordmark on left and 5 filter pills on right ("all" active by default)
- [ ] Filter pill active state uses `gallery-filter-active` (white over `elevated`)
- [ ] Hero canvas is full-bleed, no borders or padding around the render image
- [ ] Hero actions appear upper-right with separators; "download" in `intent-info`, others in `text-secondary`
- [ ] Hero metadata appears lower-left over a `gallery-overlay-gradient` for readability
- [ ] Hero date appears lower-right as day (`type-display`) + year (`type-data`)
- [ ] 14-day strip shows exactly 14 tiles with date labels below; today's tile has a `border-strong` ring
- [ ] Grid is 3 columns with 8px gaps, cards are roughly 3:1 ratio
- [ ] Grid cards have small `gallery-card-icon` glyph in upper-right indicating timelapse availability
- [ ] Page-composition footer at bottom in `text-muted` `type-axis` — distinct from Dashboard's per-source citation footer
- [ ] All semantic tokens used; no one-off hex outside `gallery-*` definitions
- [ ] Focus visible on all interactive elements
- [ ] Keyboard reachability confirmed for filter pills, hero actions, strip, grid
- [ ] Screen-reader labels in place on hero, strip thumbnails, grid cards
