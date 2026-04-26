# OC_IA — Information Architecture

- **Status** · v0.2 · April 2026 · revised against prototype mockups (OC-02 Figs 1–7)
- **Type** · Reference document — structured for linking-into, not reading end-to-end
- **Lives at** · `docs/uxs/OC_IA.md`
- **Parallel to** · `docs/prd/OC_PA.md` · `docs/adr/OC_TA.md`
- **Derived from** · OC-02 Project Concept · OC-05 Design System · prototype mockups (OC-02 Figs 1–7)

This document holds the structural map of OceanCanvas — the surfaces the product is composed of, how they connect, what URLs address them, what chrome persists across them, and what design tokens they share. Individual UXS documents link into specific sections rather than restating navigation or shared tokens per surface.

IA holds *what is true across the UX*. Per-surface visual contracts live in UXS documents. Behavioural rules (animation timing, debounce intervals, keyboard shortcuts) belong in RFCs in the tech plane, not here.

The §surface-map at the bottom is the visual reference for how surfaces relate. The §url-structure section is the canonical address space for the product.

---

## §overview

OceanCanvas has **four primary surfaces** plus one **mode** that opens within a primary surface. All surfaces share a dark canvas, editorial typography, and a common state model (region selection, active recipe, active source) that persists across navigation.

Surface navigation in OceanCanvas is **not via a persistent global nav bar.** Each surface has its own topbar pattern (see §topbar-patterns) tailored to its context. People reach surfaces via direct URLs and via in-context links: Dashboard's "select region" mode passes lat/lon to the Recipe Editor; Gallery cards have `recipe ↗` and `timelapse ↗` actions that jump to the editor or the video editor for that specific recipe.

The product's information architecture reflects its central activity: the creative loop. Dashboard exploration leads to recipe authoring; recipe rendering leads to gallery accumulation; gallery viewing leads to video assembly; video patterns prompt new recipes. The four surfaces are the four points on this loop.

---

## §surfaces

The four primary surfaces and one mode. Each is a destination with its own URL, its own purpose, its own UXS document(s).

### Dashboard

The data exploration surface. Two views: a **main view** with full-bleed source heatmap (today's data over the world map) and per-source **editorial spreads** that read like magazine pages. Per [ADR-017](../adr/ADR-017-one-layout-per-source.md), each source has its own editorial layout — SST has its thermal heatmap and 41-year trend, sea level has its full-width rise curve. The dashboard is *the entry point to the recipe editor* — drawing a region on a source's map passes the bounds directly to the editor.

- **PRD** · [PRD-002 Dashboard](../prd/PRD-002-dashboard.md)
- **UXS** · UXS-001 (SST main view + spread); one additional UXS per source spread
- **URL** · `/dashboard`, `/dashboard/{source}`, `/dashboard/{source}/explorer` (editorial spread mode)

### Recipe Editor

The creative surface where data becomes art. A single preview canvas above a flip toggle; below the toggle, the controls flip between Creative mode (mood preset, energy×presence, colour character, temporal weight) and YAML mode (the recipe file with creative-driven lines highlighted in amber). A "sketch editor ↗" link opens the raw p5.js sketch.

- **PRD** · [PRD-003 Recipe Editor](../prd/PRD-003-recipe-editor.md)
- **UXS** · UXS-NNN (deferred)
- **URL** · `/recipes/{id}` for an existing recipe; `/recipes/new` for authoring

### Gallery

The public face. A living archive of accumulated daily renders. Hero (today's featured recipe at full bleed with `timelapse ↗` · `recipe ↗` · `download` actions) + 14-day strip (the same recipe's recent history) + grid (every active recipe rendered today). Updates automatically when the pipeline runs — no manual curation. The default landing surface.

- **PRD** · [PRD-004 Gallery](../prd/PRD-004-gallery.md)
- **UXS** · UXS-NNN (deferred)
- **URL** · `/` (default landing), `/gallery/{recipe}` for a specific recipe page, `/gallery/{recipe}/{date}` for a specific render

### Video Editor

The timelapse studio. Assembles a recipe's accumulated PNG renders into an MP4 with optional audio (RFC-006) and overlay annotations. Frames already exist as stored renders; the editor is assembly and enrichment, not creation. Right-side panel has Sequence · Audio · Overlays sections.

- **PRD** · [PRD-005 Video Editor](../prd/PRD-005-video-editor.md)
- **UXS** · UXS-NNN (deferred)
- **URL** · `/timelapse/{recipe}`

### Sketch Editor (mode, not a surface)

A full-screen mode that opens from within the Recipe Editor for power users writing custom p5.js sketches. Not a primary navigation destination; not addressable by a top-level URL.

- Opens via "sketch editor ↗" in the Recipe Editor's flip bar.
- Returns to the Recipe Editor with the modified sketch on save.

---

## §topbar-patterns

The topbar varies per surface — it is contextual chrome (breadcrumb + actions), not persistent global navigation. Each surface defines its topbar in its UXS, but the patterns rhyme. All topbars are 42px tall, against `surface` background, with the wordmark on the left.

### Dashboard — main view

```
[OCEANCANVAS]    /sea surface temperature ⊓ NOAA OISST                  25 APR 2026 / 06:00 UTC
```

- Wordmark · path showing source name + provider · UTC timestamp on right
- The path uses `text-secondary`; the timestamp `text-muted`

### Dashboard — editorial spread

```
[OCEANCANVAS]    /DATA EXPLORER                                  [all sources ⊓ SST ⊓ NOAA OISST] ▾
```

- Wordmark · `/DATA EXPLORER` page label · source-switcher chip on right (a dropdown styled as a chip)

### Recipe Editor

```
[OCEANCANVAS]    /north_atlantic_sst                       live · OISST    25 Apr 2026    field
```

- Wordmark · recipe id as path · status badges on right showing data source freshness, date, and active render type
- The status badges use `text-secondary` and `text-muted` for definition

### Gallery

```
[OCEANCANVAS]                                              [all] [SST] [salinity] [sea level] [ice]
```

- Wordmark · source-type filter pills on the right
- Active filter is highlighted (white text on `elevated` background); others in `text-muted` on transparent

### Video Editor

```
[OCEANCANVAS]    /timelapse editor / gulf_stream_thermal                                  export MP4
```

- Wordmark · two-segment path (surface + recipe) · primary action on right (`export MP4` in `intent-info` teal)

### Patterns across topbars

- **Wordmark** is always the leftmost element, clickable, returns to Gallery (`/`).
- **Path or filter** in the centre-left or right depends on surface logic.
- **Right-side region** is either context (date/time, status badges) or action (export, source switcher).
- **No persistent four-surface nav menu.** Surface switching is via direct URLs (which users bookmark or share) and via in-context links from one surface to another.

---

## §navigation

How surfaces connect. Without a global nav, navigation is *contextual* — each surface offers paths to other surfaces relevant to its own work.

### Cross-surface transitions (state-passing)

| From | To | Trigger | State passed |
|---|---|---|---|
| Dashboard (main view) | Recipe Editor | "Select region" mode → draw bounding box | Lat/lon bounds, active source |
| Gallery hero | Recipe Editor | `recipe ↗` action on hero | Recipe id |
| Gallery hero | Video Editor | `timelapse ↗` action on hero | Recipe id |
| Gallery card | Recipe Editor | Click recipe card → `recipe ↗` | Recipe id |
| Gallery card | Video Editor | Click recipe card → `timelapse ↗` | Recipe id |
| Recipe Editor | Sketch Editor (mode) | `sketch editor ↗` in flip bar | Current recipe state, payload |
| Recipe Editor | Gallery | `save recipe` after authoring | Recipe id (newly created or saved) |
| Dashboard (main view) | Dashboard (editorial spread) | Click source rail entry or "go deeper" | Active source |

State transitions are explicit — no surface silently inherits state from another. The receiving surface either gets state passed via URL query param or starts with its own default.

### How users return to Gallery

- Click the wordmark in the topbar (any surface).
- Direct URL `/`.

### How users reach the Dashboard

- Direct URL `/dashboard` or `/dashboard/{source}`.
- *No link from Gallery to Dashboard exists in v1.* This is intentional — the Gallery is for browsing renders; the Dashboard is for exploring data. They are different activities. Users who want to author a recipe go from Gallery → existing recipe → editor, or from Dashboard via region selection.

---

## §url-structure

The canonical address space. Every surface is addressable by URL. Every meaningful sub-state has its own URL when it makes sense to share or bookmark.

| Pattern | Surface | Notes |
|---|---|---|
| `/` | Gallery (default) | Opening the project URL goes here. |
| `/gallery` | Gallery | Explicit alias. |
| `/gallery/{recipe}` | Gallery — recipe page | The recipe's full archive view. |
| `/gallery/{recipe}/{date}` | Gallery — specific render | Single render full-screen. Shareable. |
| `/dashboard` | Dashboard main view | Defaults to the SST source. |
| `/dashboard/{source}` | Dashboard main view | E.g., `/dashboard/sea-level`. |
| `/dashboard/{source}/explorer` | Dashboard editorial spread | The "data explorer" deep view per source. |
| `/recipes` | Recipe list | Index of all recipes. |
| `/recipes/new` | Recipe Editor — new recipe | Empty editor with optional `?region=...&source=...` query params. |
| `/recipes/{id}` | Recipe Editor — existing recipe | Loads the recipe; flip mode defaults to Creative. |
| `/timelapse/{recipe}` | Video Editor | Loads the recipe's accumulated renders. |

URL design conventions:

- **Stable IDs.** Recipe ids are filesystem-safe slugs (per [RFC-001](../rfc/RFC-001-recipe-yaml-schema.md)). They never change after creation.
- **Date format.** `YYYY-MM-DD` everywhere. ISO 8601, no other formats.
- **Source slugs.** Match the source-id in the OC-03 catalog: `sst`, `sea-level`, `salinity`, `sea-ice`, `chlorophyll`, etc.

---

## §shell-regions

The persistent chrome. UXS documents inherit these.

### Topbar (42px)

See §topbar-patterns above for the per-surface variations.

### Source rail (Dashboard main view only, ~96px wide)

The Dashboard's main view has a left-side rail listing available data sources. Active source has its label rendered in the source's accent token (e.g., `domain-sst-accent` for SST); other sources in `text-muted`. *No left border, no background fill — purely text-colour treatment.* The rail does not appear in editorial spreads or in any other surface.

### Citation footer (Dashboard, Recipe Editor, Video Editor)

A whisper-thin attribution strip at the bottom of editorial views. Lists source(s) used and the project name. Required by the *attribution-baked-in* constraint (TA §constraints, PA §promises/citation-travels). Format: `[source] · [resolution] · [cadence] · [date range] · OceanCanvas`. Gallery uses a different footer style (descriptive label of the page composition), not the attribution footer.

---

## §shared-tokens

Design tokens that genuinely apply across all surfaces. Per-surface and per-source tokens live in the relevant UXS.

### Surface tokens

| Token | Value | Usage |
|---|---|---|
| `canvas` | `#030B10` | Page background, map background — the deep ocean dark |
| `surface` | `#050E1A` | Topbar, panel backgrounds, stats card backdrops |
| `elevated` | `#0A1828` | Stats overlay cards, dropdown chips, modal overlays |
| `overlay` | `rgba(3,11,16,0.85)` | Translucent overlays floating over maps |
| `border` | `rgba(255,255,255,0.07)` | Hairline dividers, source-rail separators |
| `border-strong` | `rgba(255,255,255,0.15)` | Active borders, focus rings |

### Text tokens

| Token | Value | Usage |
|---|---|---|
| `text` | `rgba(255,255,255,0.92)` | Primary body text, main numerals (where not source-coloured) |
| `text-secondary` | `rgba(255,255,255,0.65)` | Secondary content, descriptions |
| `text-muted` | `rgba(255,255,255,0.35)` | Section labels (SPACED CAPS), axis labels |
| `text-disabled` | `rgba(255,255,255,0.20)` | Disabled controls, deferred features |

### Intent tokens

| Token | Value | Usage |
|---|---|---|
| `intent-alert` | `#F09595` | Positive anomalies, warming, accelerating trends |
| `intent-info` | `#5DCAA5` | Negative anomalies, cooling, primary actions (e.g. `export MP4`, `save recipe`) |

Intent tokens are *physical-meaning* indicators (warming vs. cooling) and primary-action indicators. UI-state feedback (success/error/warning) is rare in OceanCanvas — most surfaces are exploratory, not transactional.

### Typography scale

| Token | Approximate range | Usage |
|---|---|---|
| `type-hero` | 48–72px | Hero numbers (the editorial headline statistic) |
| `type-display` | 22–32px | Sub-hero values, large stat cards |
| `type-data` | 14–18px | Secondary data values, side panel values |
| `type-body` | 11–13px | Prose, descriptions |
| `type-axis` | 8–9px monospace | Axis labels, coordinates, fine annotations |
| `type-label` | 9–10px spaced caps | Section labels — never bold |

### Spacing scale

Base unit: 4px. All spacing in surfaces uses multiples: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.

---

## §state-persistence

What carries across surface transitions. State that doesn't appear here resets at each surface load.

| State | Persists across | Mechanism |
|---|---|---|
| **Region selection** | Dashboard → Recipe Editor | URL query param (`?region=...`) |
| **Active source** | Dashboard tabs, Recipe Editor pre-fill | URL path segment |
| **Active recipe** | Gallery → Editor → Video Editor | URL path segment |
| **Date selection** | Dashboard timeline scrubber | URL query param (`?date=...`) — bookmarkable |
| **Editor flip mode** | Within Recipe Editor session only | Local state, not persisted |
| **Gallery source filter** | Within Gallery only | URL query param (`?filter=sst`) |

Phase 1 has no auth, no user accounts, no per-user state. State persistence is via URLs and URL query parameters — never via localStorage or cookies (per the artifact constraints in TA).

---

## §entry-points

How a person first reaches each surface.

| Surface | Direct URL | From another surface | External link |
|---|---|---|---|
| Gallery | ✓ (default `/`) | Editor "save recipe"; topbar wordmark from anywhere | ✓ (shareable render URLs) |
| Dashboard | ✓ (`/dashboard`) | None in v1 (deliberate — see §navigation) | ✓ (shareable spread URLs) |
| Recipe Editor | ✓ (`/recipes/{id}`) | Dashboard "select region"; Gallery `recipe ↗` | — |
| Video Editor | ✓ (`/timelapse/{recipe}`) | Gallery `timelapse ↗` | ✓ (shareable timelapse URLs once exported) |
| Sketch Editor (mode) | — | Recipe Editor only | — |

---

## §surface-map

```
                     ┌──────────────────────────┐
                     │    Wordmark (clickable)  │  ← always returns to Gallery
                     │     OCEANCANVAS          │
                     └──────────────────────────┘

     each surface has its own topbar pattern (see §topbar-patterns)

   ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────────┐
   │ Dashboard│    │Recipe Editor │    │ Gallery  │    │ Video Editor │
   │          │    │              │    │          │    │              │
   │ main +   │    │ ┌──────────┐ │    │ Hero     │    │ Frame strip  │
   │ editorial│    │ │ Preview  │ │    │ +        │    │ + audio      │
   │ spread   │    │ └──────────┘ │    │ 14-day   │    │ + overlays   │
   │          │    │ ┌──────────┐ │    │ +        │    │              │
   │          │    │ │ Creative │ │    │ Grid     │    │              │
   │          │    │ │ ↔ YAML   │ │    │          │    │              │
   │          │    │ └──────────┘ │    │          │    │              │
   └─────┬────┘    └──────┬───────┘    └────┬─────┘    └──────────────┘
         │                │                 │
         │                │ "sketch ↗"      │
         │                ▼                 │
         │          (Sketch mode)           │
         │          full-screen             │
         │                                  │
         │                                  │  recipe ↗ / timelapse ↗
         │                                  │  ────────────────────►
         │                                  │
         └─────────  region select  ────────┘
                          │
                          ▼  passes lat/lon to editor

         The creative loop:
         Dashboard → Editor → Pipeline → Gallery → Video Editor
                                              │
                                              └─► (insight prompts new recipes)
```

---

## How UXS documents reference this doc

UXS documents anchor to IA sections. The conventions:

```
IA anchor · §surfaces/dashboard · §topbar-patterns/dashboard-main-view · §shared-tokens
Tokens inherited · §shared-tokens (canvas, surface, text, intent)
Domain tokens defined here · domain-sst-* (per-source palette)
Behaviour reference · RFC-NNN (animation, debounce — not in UXS)
```

A UXS document that doesn't reference IA is a smell. UXS documents *define* per-surface and per-source design tokens. IA does not — IA holds only what is genuinely shared.

---

## What this doc is not

| Doc | Mode | Holds |
|---|---|---|
| **OC-02 Project Concept** | Narrative | The product as an idea — what surfaces exist and why, end-to-end. Read once. |
| **OC-05 Design System & Creative Direction** | Narrative | The design philosophy and visual character. Read once. |
| **OC_IA** (this doc) | Reference, structural | Surfaces, navigation, URLs, shell, shared tokens. Linked to. |
| **UXS** | Per-surface visual contract | Tokens, layout, component states for one surface. |

IA does not hold per-surface visual contracts, behaviour rules, or implementation specs. If a section here drifts toward any of those, it belongs in the corresponding doc, not here.

---

## Open threads

- **UXS coverage.** Phase 1 ships UXS-001 (Dashboard SST main view + spread). Other surfaces (Recipe Editor, Gallery, Video Editor) and other source spreads (Sea Level, Salinity, etc.) are deferred until needed for implementation. With prototypes now available, drafting them is straightforward.
- **Sketch editor mode contract.** Currently no UXS — full-screen code editor with payload pre-loaded. Warrants a UXS once visual conventions are firmed up.
- **Mobile / narrow-viewport.** All prototypes are desktop-first. Mobile behaviour deferred — when revisited, may be a new RFC (responsive strategy) rather than IA changes.
- **Source switcher chip in Dashboard editorial spread.** Behaviour (whether it triggers a hard navigation or an in-place transition) belongs in an RFC for Dashboard interactions; how it looks belongs in UXS-001.

---

## Changelog

- **v0.2 · April 2026** — Revised against prototype mockups (OC-02 Figs 1–7). Major changes: removed the persistent four-surface nav assumption; added §topbar-patterns showing the per-surface variation; changed source rail's active state from "2px coloured left border" to "text colour only"; clarified that surface navigation is contextual (URL + in-context links), not via a global menu. Updated §url-structure to add `/dashboard/{source}/explorer` for editorial spread mode. Added Gallery filter pills as a recognised topbar pattern.
- **v0.1 · April 2026** — Initial draft, written before prototype access. Superseded by v0.2.
