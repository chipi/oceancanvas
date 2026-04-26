# UXS-001 — Dashboard, SST main view + editorial spread

> **Status** · v0.2 · April 2026 · revised against prototype mockup (OC-02 Figs 1–2)
> **Visual fidelity** · Verified against prototype. Some details (e.g., precise hero number font weight) interpreted from a partially-rendered PDF where some glyphs garbled at export — flagged inline.
> **IA anchor** · §surfaces/dashboard · §topbar-patterns/dashboard-main-view · §topbar-patterns/dashboard-editorial-spread · §shell-regions/source-rail · §shared-tokens
> **Related PRD** · [PRD-002 Dashboard](../prd/PRD-002-dashboard.md)
> **Related ADRs** · [ADR-009 deck.gl + MapLibre](../adr/ADR-009-deck-gl-maplibre.md) · [ADR-010 Observable Plot](../adr/ADR-010-observable-plot.md) · [ADR-017 One editorial layout per source](../adr/ADR-017-one-layout-per-source.md)
> **Related RFC** · *None yet — Dashboard behavioural rules (timeline scrubber animation, source-rail tab transitions, hover debounce, source-switcher chip behaviour) need an RFC when implemented.*

---

## Why this UXS exists

The Dashboard's SST experience is the canonical first surface — the one PRD-002 and ADR-017 most directly pair with, and the one OC-02 Figs 1–2 illustrate. This UXS establishes the visual contract for both Dashboard views with SST active: the **main view** (full-bleed thermal heatmap with stats overlay and timeline) and the **editorial spread** (hero number + heatmap + 41-year trend + anomaly bars). It also establishes patterns subsequent per-source UXSes (UXS-NNN sea level, etc.) will adapt without restating.

## Principles

- **Data is the hero.** The thermal heatmap and the hero number are the editorial subject. Chrome serves the data — never competes with it.
- **Numbers at display scale.** Hero stats are unboxed and unbordered, rendered at `type-hero` over the dark canvas.
- **Colour encodes physics.** The SST palette is the legend. Cold = navy; warm = amber; hot = coral. UI accents in the same palette tie identity together (active source-rail entry, hero number colour, data-strip values).
- **Editorial voice.** The spread reads like a magazine page. No chart frames; whitespace as composition.
- **Dark always.** `canvas` background everywhere.

## Scope

**In scope** · Dashboard topbar (main view + editorial spread variants); source rail with SST active; SST main view (full-bleed heatmap, three-card stats overlay, vertical legend strip on right, timeline scrubber, mini time series below); SST editorial spread (eyebrow, two-column hero with number + heatmap, three-fact metadata row, four-column data strip, trend chart + anomaly bars side-by-side); SST domain tokens; citation footer.

**Non-goals** · per-source editorial spreads for sources other than SST (each gets its own UXS); the Recipe Editor, Gallery, Video Editor (separate UXSes); Dashboard's "select region" mode UI (will live in a future Dashboard-interaction RFC + an extension to this UXS or a sibling UXS); behavioural rules.

**Boundary note** · Timeline scrubber animation, source-rail tab transitions, hover debounce, source-switcher chip dropdown timing, and date-change reflow behaviour belong in an RFC. The first time these need to be implemented, write that RFC. This UXS specifies static appearance only.

## Theme

Dark only. Per `OC_IA.md §shared-tokens`, all OceanCanvas surfaces are dark-only.

## Tokens

### Inherited from IA

All surface, text, intent, typography, and spacing tokens are inherited from `OC_IA.md §shared-tokens`. This UXS uses them by name without restating values.

- **Surface** · `canvas`, `surface`, `elevated`, `overlay`, `border`, `border-strong`
- **Text** · `text`, `text-secondary`, `text-muted`, `text-disabled`
- **Intent** · `intent-alert` (positive anomaly, warming), `intent-info` (negative anomaly, cooling, primary actions)
- **Typography** · `type-hero`, `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here — `domain-sst-*`

The SST palette is a thermal gradient. Both the heatmap rendering and the UI accents (active source-rail label, hero number, data-strip values, eyebrow date in editorial spread) draw from this palette.

| Token | Value | Usage |
|---|---|---|
| `domain-sst-cold` | `#042C53` | Coldest SST values; deep-ocean reference |
| `domain-sst-mid-low` | `#0F6E56` | Lower mid-range (cool subtropical) |
| `domain-sst-mid` | `#639922` | Mid-range (temperate) |
| `domain-sst-mid-high` | `#BA7517` | Upper mid-range (warm subtropical) |
| `domain-sst-warm` | `#D85A30` | Warm SST (tropical) |
| `domain-sst-hot` | `#791F1F` | Hottest SST (extreme tropical) |
| `domain-sst-accent` | `#EF9F27` | UI accent — active source-rail label, hero number, data-strip values, eyebrow date, trend line |
| `domain-sst-fill-soft` | `rgba(239,159,39,0.07)` | Trend chart area-fill |

The heatmap colormap interpolates continuously across `domain-sst-cold → domain-sst-hot`. The discrete tokens are reference stops, not a discrete palette.

## Layout — main view (Fig 1)

The main view is the Dashboard's primary entry. Today's global SST as a full-bleed thermal heatmap with shell chrome and contextual stats floating on the map.

```
┌──────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS  /sea surface temperature ⊓ NOAA OISST   25 APR 2026 / 06:00 UTC  │  ← topbar (42px)
├──────┬──────────────────────────────────────────────────────────────────┤
│      │ 50.2°N  28.7°W                                       ┌─┐ 28°C   │  ← hover coords (top-left)
│ SST  │                                                      │ │ 18°C   │     legend strip (right)
│surface│                                                     │ │ 8°C    │     vertical, ~24px wide
│ temp │      FULL-BLEED MAP                                  │ │ -2°C   │
│      │      deck.gl BitmapLayer                             └─┘        │
│Salin.│      `domain-sst-*` thermal gradient                            │
│ESA SSS-CCI│                                                            │
│      │                                                                  │
│Sea L.│                                                                  │
│ESA SL-CCI │                                                             │
│      │                                                                  │
│Sea i.│                                                                  │
│NSIDC v4│                                                                │
│      │  ┌──────────────┐                                                │
│Chlor.│  │ 14.2°        │   ← stat card 1                                │
│ESA OC-CCI│ region mean  │     value at type-display, domain-sst-accent  │
│      │  │ +1.4° vs ... │     anomaly note in intent-alert below         │
│      │  └──────────────┘                                                │
│      │  ┌──────────────┐                                                │
│      │  │ 22.8°        │   ← stat card 2                                │
│      │  │ region max   │                                                │
│      │  └──────────────┘                                                │
│      │  ┌──────────────┐                                                │
│      │  │ +0.8°        │   ← stat card 3                                │
│      │  └──────────────┘                                                │
├──────┴──────────────────────────────────────────────────────────────────┤
│ 1981 ●═══════════════════════════════════════════════════════ → 2026   │  ← timeline scrubber (52px)
├──────────────────────────────────────────────────────────────────────────┤
│ north atlantic mean SST ⊓ monthly 1981→2026                             │  ← mini sparkline (56px)
│              14.2 °C                                                    │     full width, below
│ ╱╲╱╲╱──╱╲──╱╲──╱╲╱╲──╱╲──╱╲──╱╲╱╲──╱╲──╱╲──╱╲╱╲──╱╲──╱╲──╱╲──           │     scrubber, not above
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Position / size | Tokens | Notes |
|---|---|---|---|
| **Topbar** | Full width, 42px | `surface` background, wordmark in `text`, path in `text-secondary`, timestamp in `text-muted` | Per IA §topbar-patterns/dashboard-main-view |
| **Source rail** | Left, ~96px wide, full height | `canvas` background; active source label in `domain-sst-accent`; inactive labels in `text-muted`; no border, no fill | Active state is text-colour only — not a left border or background |
| **Map canvas** | Full bleed of remaining area | `canvas` map background, optional grid lines at `border` opacity | deck.gl BitmapLayer rendering SST data |
| **Hover coords** | Top-left of map area, ~120px from rail edge | `text-secondary`, `type-axis` monospace | Updates with cursor position over map |
| **Legend strip** | Top-right, ~24px wide × ~280px tall | `domain-sst-cold → domain-sst-hot` gradient bar; 4 stop labels in `text-muted` `type-axis` | Vertical orientation, more compact than a horizontal strip |
| **Stats overlay** | Bottom-left of map area, three cards stacked vertically with ~8px gaps | Each card: `elevated` backdrop, value at `type-display` `domain-sst-accent`, label below at `type-label` spaced caps `text-muted` | Three separate cards, not one card with three stats. The first card's value has a sub-line in `intent-alert` for the anomaly note |
| **Timeline scrubber** | Full width, 52px | `surface` background, `border` divider above, draggable handle at `domain-sst-accent`, year labels at `text-muted` `type-label` | 1981 → 2026 historical exploration |
| **Mini sparkline** | Full width, ~56px | `canvas` background, `domain-sst-accent` line at 1px, `domain-sst-fill-soft` area-fill, current-value indicator (`14.2 °C` text) at scrubber position in `domain-sst-accent` | *Below* the timeline scrubber, not above. Title in `text-muted` `type-label`. |
| **Citation footer** | Full width, ~32px (when present in main view) | `canvas` background, `text-muted` `type-axis` | Appears at very bottom in the SST main view per OC-02 Fig 1's full layout |

## Layout — editorial spread (Fig 2)

The editorial spread is the Dashboard going deeper on SST. Two-column hero (number left, heatmap right), three-fact metadata row, four-column data strip, then trend chart and anomaly bars side-by-side.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS  /DATA EXPLORER                  [all sources ⊓ SST ⊓ NOAA OISST] ▾  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  North Atlantic · April 25 2026                                          │  ← eyebrow, domain-sst-accent
│  14.2°                          ┌─────────────────────────────────────┐  │
│  type-hero                      │                                     │  │
│                                 │   THERMAL HEATMAP                   │  │
│  Mean SST across the            │   domain-sst-* gradient             │  │
│  North Atlantic basin,          │   no border, no rounded corners     │  │
│  30°N–65°N         (type-body)  │                                     │  │
│                                 │                                     │  │
│  +1.4°                          │                                     │  │
│  above 1981→2010 climatology    │                                     │  │
│  (intent-alert)                 │                                     │  │
│                                 │                                     │  │
│  41yr      0.05°      2d        │                                     │  │
│  record    resolution  latency  │                                     │  │
│  (3-fact metadata row,          │                                     │  │
│   small, type-data)             └─────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│  22.8°    │  3.1°         │  19.7°            │  2022                    │
│  region   │  region min   │  1981–2010 mean   │  hottest year             │
│  max      │  Labrador Sea │  baseline         │  +2.1° above baseline     │
│  Gulf     │               │                   │                          │
│  Stream   │               │                   │                          │
│  core     │               │                   │                          │
│                                                                          │  ← 4-col data strip
│  values in domain-sst-accent (type-display); labels below in text-muted │
├──────────────────────────────────────────────────────────────────────────┤
│  ANNUAL MEAN SST ⊓ NORTH ATLANTIC 1981→2026     ┌──────────────────┐     │
│                                                  │ ANOMALY ⊓ LAST   │     │
│   ╱╲    ╱╲╱╲    ╱╲                              │ 10 YEARS         │     │
│ ╱   ╲ ╱       ╲╱  ╲ ╱╲╱  ───────► (mean line)   │ 2016 ▏ +0.8°    │     │
│   domain-sst-accent line, 1px                   │ 2017 ▎ +0.6°    │     │
│   domain-sst-fill-soft area                     │ 2018 ▍ +1.0°    │     │
│   border-strong dashed baseline                 │ 2019 ▌ +1.1°    │     │
│                                                  │ 2020 ▋ +1.3°    │     │
│                                                  │ 2021 ▌ +0.9°    │     │
│                                                  │ 2022 ▉ +1.7°    │     │
│                                                  │ 2023 ▋ +1.4°    │     │
│                                                  │ 2024 ▋ +1.3°    │     │
│                                                  │ 2025 ▊ +1.6°    │     │
│                                                  │  bars: domain-  │     │
│                                                  │  sst-mid-high → │     │
│                                                  │  intent-alert   │     │
│                                                  │  as anomaly grows│    │
│                                                  └──────────────────┘    │
├──────────────────────────────────────────────────────────────────────────┤
│  NOAA OISST · 0.25° · DAILY · 1981→2026                                  │  ← citation footer
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Position | Tokens | Notes |
|---|---|---|---|
| **Topbar** | Full width, 42px | `surface` background, wordmark in `text`, `/DATA EXPLORER` label in `text-secondary`, source-switcher chip on right with `elevated` background | Per IA §topbar-patterns/dashboard-editorial-spread |
| **Eyebrow** | Top-left, body content area | `domain-sst-accent`, `type-data` | "North Atlantic · April 25 2026" — region + date in source colour, not muted spaced caps. **This is the surface's eyebrow, not a section label.** |
| **Hero number** | Below eyebrow, left column | `type-hero`, `domain-sst-accent` (per prototype — verified against Fig 2 even where rendering is partial) | "14.2°" |
| **Hero subtitle** | Below hero number | `type-body`, `text-secondary` | "Mean SST across the North Atlantic basin, 30°N–65°N" |
| **Anomaly statistic** | Below subtitle | `type-display`, `intent-alert` (positive) or `intent-info` (negative) | "+1.4° above 1981→2010 climatology" |
| **3-fact metadata row** | Below anomaly | `type-data` values + `type-label` labels in `text-muted` | "41yr record · 0.05° resolution · 2d latency" — these are *data provenance facts*, not statistics |
| **Hero heatmap** | Right column, ~half page width | `domain-sst-*` palette, no border, no rounded corners | Same colormap as main view but a smaller framed view |
| **Data strip (4 cols)** | Mid section, full width | `type-display` values in `domain-sst-accent`, `type-label` labels in `text-muted`, sub-labels in `type-axis`, `border` 0.5px column dividers | Region max (Gulf Stream core) · Region min (Labrador Sea) · 1981–2010 mean (baseline) · Hottest year (with anomaly note below) |
| **Trend chart** | Body left, ~70% of body width | `domain-sst-accent` line, `domain-sst-fill-soft` area, dashed `border-strong` baseline, `text-muted` axis labels | 41-year annual mean SST. Title `ANNUAL MEAN SST ⊓ NORTH ATLANTIC 1981→2026` in `type-label` `text-muted` |
| **Anomaly bars** | Body right, ~30% of body width | bars graduating `domain-sst-mid-high` → `intent-alert` as anomaly grows; `type-axis` for year labels and value labels | Last 10 years (2016–2025), one row per year. Title `ANOMALY ⊓ LAST 10 YEARS` in `type-label` `text-muted`. **To the right of the trend chart, not below.** |
| **Citation footer** | Bottom | `text-muted` `type-axis` | "NOAA OISST · 0.25° · DAILY · 1981→2026" |

*Note: an "art potential" block is described in OC-05's prose for editorial spreads but **does not appear in the prototype mockup (Fig 2)**. Treating it as deferred until clarified — not included in this UXS.*

## Component states

Static visual states only. Behaviour (timing, transitions) is RFC territory.

| Component | Default | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| **Source rail entry** | `text-muted` label, no decoration | `text-secondary` label | label in source's accent (e.g. `domain-sst-accent`); no border, no fill | `border-strong` ring | `text-disabled`, no interaction | shimmer at `text-muted` | n/a | strikethrough at `intent-alert`, tooltip on hover |
| **Map (deck.gl)** | SST heatmap | hover coordinate display in upper-left of map area at `text-secondary` | n/a | n/a | n/a | `canvas` with centred spinner at `text-muted` | "no data for this date" message at `text-muted`, centred | "data unavailable" at `intent-alert`, centred |
| **Stat card** | `elevated` backdrop, value at `type-display` `domain-sst-accent`, label at `type-label` `text-muted` | slight `border-strong` glow on the card | n/a | n/a | value at `text-disabled` | shimmer at `text-muted` | `—` placeholder at `text-muted` | value replaced with `intent-alert` indicator |
| **Timeline scrubber handle** | `domain-sst-accent` filled circle | handle widens slightly | handle at `border-strong` | `border-strong` ring on handle | `text-disabled` | shimmer track | n/a | n/a |
| **Source-switcher chip** | `elevated` background, `text-secondary` label, dropdown caret in `text-muted` | `border-strong` border | `border-strong` border + dropdown open state | `border-strong` ring | `text-disabled` | shimmer | n/a | n/a |
| **Trend chart** | `domain-sst-accent` line + `domain-sst-fill-soft` area + dashed baseline | hover crosshair at `border-strong`, value tooltip in `overlay` | n/a | n/a | n/a | shimmer | "insufficient data" at `text-muted` | "data unavailable" at `intent-alert` |
| **Anomaly bar (per row)** | bar colour graduates by anomaly value (`domain-sst-mid-high` → `intent-alert`); year label and value label at `type-axis` | tooltip on hover | n/a | n/a | n/a | shimmer | n/a | bar outlined in `intent-alert` |

## Accessibility

- **Contrast** · all foreground/background pairings meet WCAG AA. Hero number at `domain-sst-accent` over `canvas` is verified at 6.5:1+. The `intent-alert` anomaly value at `#F09595` over `canvas` is 7:1+. The `text-muted` token is used only for `type-label` and `type-axis` (small text where the lower contrast is acceptable for visual hierarchy).
- **Focus** · all interactive elements (source-rail entries, timeline scrubber handle, source-switcher chip, stat cards if interactive) show a `border-strong` focus ring. Never `outline: none` without an alternative.
- **Keyboard** · source-rail entries reachable via arrow-key navigation; timeline scrubber accepts arrow-key date stepping; source-switcher chip opens with Enter / Space and navigates with arrow keys. Tab order: topbar (wordmark → path → switcher chip if present) → source rail → map (skip) → stats overlay → timeline → mini sparkline. Tab-order rules are RFC territory; this UXS only confirms reachability.
- **Reduced motion** · timeline scrubber animation, hover transitions, and source-tab cross-fades respect `prefers-reduced-motion`. Per-RFC implementation; this UXS specifies static appearance only.
- **Screen readers** · the hero number has an aria-label including units ("14.2 degrees Celsius"). Source-rail is a `<nav>` with `aria-current="page"` on the active source. The map has `aria-label` describing the source and date.

## Acceptance criteria

- [ ] Topbar matches the per-view pattern in IA §topbar-patterns (main view → path + UTC time; editorial spread → `/DATA EXPLORER` + source-switcher chip)
- [ ] Source rail's active state is text colour only — no left border, no background fill
- [ ] Stats overlay renders as three separate cards stacked vertically, not a single card with three values
- [ ] Mini sparkline appears *below* the timeline scrubber, not above
- [ ] Hover coordinates display in upper-left of map area, in `type-axis` monospace
- [ ] Editorial spread eyebrow renders in `domain-sst-accent`, not muted spaced caps
- [ ] Editorial spread anomaly bars positioned to the right of the trend chart, not below
- [ ] Data-strip values render in `domain-sst-accent`, not white
- [ ] All colours use semantic tokens — no one-off hex outside the `domain-sst-*` definitions in this doc
- [ ] All foreground/background pairings use matching token pairs from this UXS or `OC_IA.md §shared-tokens`
- [ ] No chart borders, no boxed numbers, no light-mode backgrounds
- [ ] Map renders via deck.gl BitmapLayer (per ADR-009); time-series via Observable Plot (per ADR-010)
- [ ] Citation footer present on every view; format `[source] · [resolution] · [cadence] · [date range]`
- [ ] Focus visible on all interactive elements
- [ ] Keyboard reachability confirmed for all interactive elements
- [ ] Screen-reader labels in place on hero number, source-rail entries, map, and stat cards

---

## Changelog

- **v0.2 · April 2026** — Revised against prototype mockup (OC-02 Figs 1–2). Major changes: topbar split into main-view and editorial-spread variants per IA §topbar-patterns; source-rail active state changed from "2px coloured left border" to "text colour only"; stats overlay redrawn as three stacked cards; mini sparkline moved below the timeline scrubber; hover coordinates added to upper-left of map area; legend strip narrowed and moved to top-right vertical; editorial spread eyebrow changed to `domain-sst-accent` colour; anomaly bars moved to right of trend chart; "art potential" block removed (not in prototype). Added source-switcher chip component to editorial-spread state table.
- **v0.1 · April 2026** — Initial draft, written from OC-05 figure descriptions before prototype access. Superseded by v0.2.
