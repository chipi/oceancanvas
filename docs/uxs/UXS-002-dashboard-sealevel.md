# UXS-002 — Dashboard, Sea Level editorial spread

> **Status** · Draft v0.1 · April 2026 · drafted from prototype mockup (OC-02 Fig 3)
> **IA anchor** · §surfaces/dashboard · §topbar-patterns/dashboard-editorial-spread · §shared-tokens
> **Related PRD** · [PRD-002 Dashboard](../prd/PRD-002-dashboard.md)
> **Related ADRs** · [ADR-009 deck.gl + MapLibre](../adr/ADR-009-deck-gl-maplibre.md) · [ADR-010 Observable Plot](../adr/ADR-010-observable-plot.md) · [ADR-017 One editorial layout per source](../adr/ADR-017-one-layout-per-source.md)
> **Related UXS** · [UXS-001](UXS-001-dashboard-sst.md) — established the per-source-spread pattern this one adapts
> **Related RFC** · *None yet — Dashboard interaction rules will live in a single Dashboard-interaction RFC.*

---

## Why this UXS exists

Sea level rise is the data set that most resists template-thinking. Where SST wants a thermal field and a 41-year mean line, sea level wants a *rise curve* — a single continuous arc from 1993 to today, with annotated events plotted along it. ADR-017 lives or dies on this difference: the layout for sea level is genuinely structurally different from the layout for SST. This UXS captures that difference without compromise.

## Principles

- **The curve is the argument.** A 33-year rising curve is the editorial subject. Annotations on the curve (El Niño '97, La Niña '10, El Niño '15, Record '22, Acceleration 2020–2026) make the story concrete.
- **Acceleration is named.** The rate is not constant, and the spread says so explicitly — both in the headline rate stats and in the bar chart "ACCELERATION ⊓ RATE IS NOT CONSTANT".
- **Composition matters.** The "Sources of rise" composition (Thermal expansion · Greenland · Antarctic · Glaciers) is what turns "the sea is rising" into "this is why."
- **Teal is the identity.** Where SST is amber, sea level is teal. The accent colour permeates: curve line, eyebrow, hero rate, base bars in the acceleration chart.

## Scope

**In scope** · Dashboard topbar in editorial-spread pattern with Sea Level active; full-width rise curve hero with event annotations and rate callouts; 5-column events strip; acceleration bar chart; sources-of-rise composition; sea level domain tokens; citation footer.

**Non-goals** · the Dashboard main view with sea level active (a future UXS, or a small extension to UXS-001 covering the cross-source main view); other source spreads; behavioural rules.

**Boundary note** · Curve hover behaviour, event-marker tooltip animation, source-switcher chip dropdown timing, and any scrolling/parallax effects belong in a Dashboard-interaction RFC. This UXS specifies static appearance only.

## Theme

Dark only.

## Tokens

### Inherited from IA

- **Surface** · `canvas`, `surface`, `elevated`, `overlay`, `border`, `border-strong`
- **Text** · `text`, `text-secondary`, `text-muted`, `text-disabled`
- **Intent** · `intent-alert`, `intent-info`
- **Typography** · `type-hero`, `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here — `domain-sealevel-*`

The sea level palette is teal-led with a graduating warm tier for acceleration. Where SST graduates *thermally* (cool → hot), sea level graduates *temporally* (early-period teal → recent-period coral). The core identity remains teal.

| Token | Value | Usage |
|---|---|---|
| `domain-sealevel-accent` | `#5DCAA5` | Primary identity — eyebrow, curve line, hero rate, "long-term rate" callout, early-period bars |
| `domain-sealevel-cool` | `#1D9E75` | Cool variant — early period acceleration bars (1993–2010 range) |
| `domain-sealevel-warm` | `#BA7517` | Mid variant — transitional period bars (2010–2018) |
| `domain-sealevel-hot` | `#D85A30` | Recent-period bars (2018–onward), "+5.1 mm/yr Accel." callout |
| `domain-sealevel-fill-soft` | `rgba(93,202,165,0.07)` | Curve area-fill below the rise line |

The composition bars (Sources of rise) reuse `domain-sealevel-cool / -warm / -hot` to encode contribution scale, not chronology — Thermal expansion (the largest contributor) in cool, Glaciers (smallest) in hot.

## Layout — editorial spread (Fig 3)

The spread is full-width-curve dominant. The curve occupies roughly the upper-third; strips and bar charts fill the body.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS  /SEA LEVEL                          [ESA Sea Level CCI] ▾   │  ← topbar (42px)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ GLOBAL MEAN SEA LEVEL · 1993→2026          3.7 mm/yr long-term rate       │  ← eyebrow (left, accent)
│                                            +5.1 mm/yr Accel.              │     rate callouts (right)
│                                            2020→2026 (accelerating)       │
│   +4 ┤                                                            ●Accel │
│   +2 ┤                                  ●El Niño'15      ●Record'22     │
│      │                            ●La Niña'10     curve continues       │
│   0  ┤───────────────────────────────────────────────────────────────── │  ← rise curve, full width
│      │   ●El Niño '97                                                    │     domain-sealevel-accent
│   -2 ┤   above 1993 baseline · satellite altimetry  (subtitle, type-body)│     line + soft fill
│      │                                                                   │
│   1993                                                            today  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ 1997-98     │ 2010-11        │ 2015-16          │ 2022          │ 2023-24│  ← events strip (5 col)
│ El Niño     │ La Niña        │ Super El Niño    │ Record high   │ Unprec │
│ brief       │ temporary      │ largest          │ acceleration  │ rate    │
│ acceleration│ dip            │ single-year      │ confirmed     │ hits    │
│             │                │                  │               │ 5mm/yr  │
│ +20.4cm     │ 3.7 mm/yr      │ 5.1 mm/yr        │ ×1.4          │ 2050    │
│ total rise  │ 30yr mean rate │ current rate     │ acceleration  │ +40cm   │
│ since 1993  │                │                  │ factor        │ projected│
│                                                                          │
│ values in domain-sealevel-accent (type-display); descriptions in type-data │
├──────────────────────────────────────────────────────────────────────────┤
│ ACCELERATION ⊓ RATE IS NOT CONSTANT       │  SOURCES OF RISE              │
│                                            │                               │
│ 1993–2000  ▏▏▏▏▏          2.8 mm/yr (cool)│  Thermal expansion ▆▆▆ 42%   │  ← composition strip
│ 2000–2010  ▏▏▏▏▏▏▏        3.6 mm/yr (cool)│       (cool)                  │     right column
│ 2010–2018  ▏▏▏▏▏▏▏▏▏      4.1 mm/yr (warm)│  Greenland ice  ▅▅ 24%        │     bars graduating
│ 2018–2022  ▏▏▏▏▏▏▏▏▏▏▏    4.7 mm/yr (hot) │       (warm)                  │     by contribution
│ 2022–2026  ▏▏▏▏▏▏▏▏▏▏▏▏   5.1 mm/yr (hot) │  Antarctic ice  ▌ 21%         │     not chronology
│                                            │       (hot)                   │
│ horizontal bars, type-axis labels         │  Glaciers       ▎ 13%         │
│                                            │       (hot)                   │
│ (left column ~70% of body width)          │  (right ~30%)                 │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ESA SEA LEVEL CCI · 0.25° · MONTHLY · TOPEX · JASON-1/2/3 · SENTINEL-6   │  ← citation footer
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Position | Tokens | Notes |
|---|---|---|---|
| **Topbar** | Full width, 42px | `surface` background, wordmark in `text`, `/SEA LEVEL` label in `text-secondary`, source-switcher chip on right | Per IA §topbar-patterns/dashboard-editorial-spread |
| **Eyebrow** | Top-left of body | `domain-sealevel-accent`, `type-label` spaced caps | "GLOBAL MEAN SEA LEVEL · 1993→2026" |
| **Rate callouts** | Top-right of body, stacked | `domain-sealevel-accent` for "long-term rate"; `domain-sealevel-hot` for "Accel."; `text-secondary` for sub-line | "3.7 mm/yr long-term rate" / "+5.1 mm/yr Accel." / "2020→2026 (accelerating)" |
| **Rise curve** | Full width, ~280px tall | `domain-sealevel-accent` line at 1.5px, `domain-sealevel-fill-soft` area, dashed `border-strong` baseline at 0, `text-muted` `type-axis` for vertical scale labels | The editorial subject. Continuous from 1993 to today. |
| **Curve subtitle** | Below curve, left aligned | `text-secondary`, `type-body` | "above 1993 baseline · satellite altimetry" |
| **Event markers** | Plotted along the curve at their dates | filled circles ~5px diameter; colour by event type — `domain-sealevel-accent` for warming events (El Niño), `intent-info` for cooling events (La Niña), `intent-alert` for record/concerning events | Each marker has a label in `type-axis` |
| **Events strip (5 col)** | Below curve, full width | `type-display` value in `domain-sealevel-accent`, descriptors in `type-data` `text-secondary`, dates in `type-label` `text-muted` | Five columns separated by `border` 0.5px verticals |
| **Acceleration chart title** | Body left, above bars | `type-label` `text-muted` spaced caps | "ACCELERATION ⊓ RATE IS NOT CONSTANT" |
| **Acceleration bars** | Body left, ~70% of body width, 5 horizontal bars | bar fills graduate `domain-sealevel-cool → domain-sealevel-warm → domain-sealevel-hot` by chronological position; `type-axis` labels for period and rate | Each row: period label left, bar in middle, rate value at right end of bar |
| **Sources of rise title** | Body right, above composition | `type-label` `text-muted` spaced caps | "SOURCES OF RISE" |
| **Composition bars** | Body right, ~30% of body width | bars graduate `domain-sealevel-cool → -warm → -hot` by contribution share (largest = cool, smallest = hot) | One row per source: name, bar, percentage |
| **Citation footer** | Bottom | `text-muted` `type-axis` | "ESA SEA LEVEL CCI · 0.25° · MONTHLY · TOPEX · JASON-1/2/3 · SENTINEL-6 MERGED" |

## Component states

| Component | Default | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| **Source-switcher chip** | `elevated` background, `text-secondary` label | `border-strong` border | dropdown open with `elevated` panel | `border-strong` ring | n/a | shimmer | n/a | n/a |
| **Rise curve** | `domain-sealevel-accent` line + soft fill + baseline | crosshair appears at cursor x; vertical reference line at `border-strong`; tooltip in `overlay` | n/a | n/a | n/a | shimmer over the curve area | "data unavailable for this date range" centred at `text-muted` | "data unavailable" at `intent-alert` |
| **Event marker** | filled circle at event-type colour | tooltip with event details in `overlay` | n/a | `border-strong` ring | n/a | n/a | n/a | hidden if event data missing |
| **Acceleration bar** | bar at chronology-graduated colour, `text-muted` `type-axis` labels | tooltip on hover | n/a | n/a | n/a | shimmer | n/a | bar outlined `intent-alert` |
| **Composition bar** | bar at contribution-graduated colour | tooltip with absolute contribution value | n/a | n/a | n/a | shimmer | n/a | bar outlined `intent-alert` |

## Accessibility

- **Contrast** · `domain-sealevel-accent` (`#5DCAA5`) over `canvas` is verified at 9:1+ — exceeds WCAG AA. The cool-warm-hot bar graduation maintains contrast at every step.
- **Focus** · all interactive elements (source-switcher chip, event markers, bars with tooltips) show a `border-strong` focus ring.
- **Keyboard** · event markers reachable via tab order in their date sequence; pressing Enter opens the tooltip in a persistent way (until dismissed). Keyboard mechanics for the curve hover are RFC territory.
- **Reduced motion** · curve crosshair and tooltip animations respect `prefers-reduced-motion`. Per-RFC implementation.
- **Screen readers** · curve has an `aria-label` describing the dataset and date range. Event markers have `role="button"` with `aria-label` containing the event name and date. Bars have `aria-label` containing the period and value.

## Acceptance criteria

- [ ] Topbar matches editorial-spread pattern (`/SEA LEVEL` path + source-switcher chip)
- [ ] Rise curve uses `domain-sealevel-accent` line and `domain-sealevel-fill-soft` area
- [ ] Event markers are colour-coded by event type (warming / cooling / record)
- [ ] Events strip renders five columns with dividers in `border` 0.5px
- [ ] Acceleration bars graduate `domain-sealevel-cool → -warm → -hot` by chronological period
- [ ] Composition bars graduate by contribution share — largest contributor in `cool`, smallest in `hot`
- [ ] All values in events strip render in `domain-sealevel-accent`
- [ ] No chart borders, no boxed numbers
- [ ] Citation footer present with full source attribution including satellite mission list
- [ ] Focus visible on all interactive elements
- [ ] Screen-reader labels in place on curve, event markers, and bars

---

## Notes for future per-source UXSes

This UXS pairs with UXS-001 to establish that **per-source spreads share the topbar pattern but otherwise have full design freedom.** UXS-001 is two-column hero + data strip + side-by-side trend/anomaly. UXS-002 is full-width curve + events + bar pairs. Future UXSes for salinity, sea ice, chlorophyll, ocean colour, etc. can pick whichever structure fits the data. ADR-017 is the principle; UXS-001 and UXS-002 together are the proof.
