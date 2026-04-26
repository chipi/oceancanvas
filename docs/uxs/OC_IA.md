# OceanCanvas — Information Architecture

- **Status**: Draft
- **Related PRDs**: All surface PRDs (PRD-005 through PRD-010)
- **Derived from**: OC-02 Project Concept

## Overview

OceanCanvas has four primary surfaces accessible from the topbar navigation. All surfaces share the same dark canvas editorial design system (ADR-015). The gallery is the default landing surface — the public face of the product.

## Primary Surfaces

| Surface | Path | Purpose | Entry points |
|---|---|---|---|
| **Gallery** | `/` | Public face — living art gallery updated daily | Default landing, direct URL |
| **Dashboard** | `/dashboard` | Explore live ocean data by source | Nav, gallery recipe link |
| **Recipe editor** | `/recipes/[name]` | Create and edit recipes | Dashboard region selector, gallery recipe ↗ |
| **Video editor** | `/timelapse/[name]` | Assemble frames into timelapse film | Gallery timelapse ↗ |

## Navigation Structure

### Topbar (persistent across all surfaces)

| Element | Type | Behaviour |
|---|---|---|
| Wordmark "OCEANCANVAS" | Link | → Gallery (/) |
| Dashboard | Nav link | → /dashboard |
| Gallery | Nav link | → / |
| Active recipe name | Contextual | Shown when in recipe editor or video editor |
| "Updated daily" badge | Status indicator | Confirms pipeline is running |

### Surface-level navigation

- **Gallery**: source type filter strip (all · SST · salinity · sea level · ice · chlorophyll)
- **Dashboard**: source rail (switches active dataset — SST, sea level, salinity, ice, chlorophyll, Argo)
- **Recipe editor**: flip bar (creative ↔ yaml) + sketch editor ↗ link
- **Video editor**: no secondary nav — single-surface tool

## Surface Hierarchy

```
/ (Gallery) ← default landing
├── /dashboard
│   └── [region select] → /recipes/new (recipe editor, new recipe)
├── /recipes/[name] (recipe editor)
│   └── sketch-editor ↗ (opens in new tab/overlay — not a route)
└── /timelapse/[name] (video editor)
```

## URL Structure

| Pattern | Surface | Notes |
|---|---|---|
| `/` | Gallery front page | Hero + strip + all-recipes grid |
| `/gallery/[recipe]` | Recipe gallery page | Full archive for one recipe |
| `/gallery/[recipe]/[date]` | Single render | Full-screen render with metadata |
| `/dashboard` | Dashboard main view | Default source: SST |
| `/dashboard/[source]` | Dashboard — specific source | e.g. `/dashboard/sealevel` |
| `/recipes/new` | Recipe editor — new | Opened from dashboard region select |
| `/recipes/[name]` | Recipe editor — existing | Edit or view existing recipe |
| `/timelapse/[name]` | Video editor | Pre-loaded with named recipe |
| `/renders/[recipe]/[date].png` | Static render file | Served by Caddy — stable, cacheable |

## State That Persists Across Surfaces

| State | From | To | How |
|---|---|---|---|
| Region bounds (lat/lon) | Dashboard map selection | Recipe editor | URL params or session state |
| Active source | Dashboard source rail | Recipe editor source default | URL param |
| Recipe context | Gallery render | Recipe editor | Recipe name in URL |
| Recipe context | Gallery render | Video editor | Recipe name in URL |

## Shell Regions

All surfaces share these shell regions, defined here and referenced by individual UXS documents.

| Region | Height | Background | Contents |
|---|---|---|---|
| Topbar | 42px | `surface` (#050E1A) | Wordmark, nav links, contextual elements |
| Bottom bar | 44px | `surface` (#050E1A) | Surface-specific actions (save, export) |
| Main canvas | Fills remaining height | `canvas` (#030B10) | Surface content — full bleed |

**No sidebar.** Navigation is topbar-only. Source switching (dashboard) and mode switching (recipe editor) are surface-level controls, not global navigation.

## Key Design Decisions

**Gallery as default landing.** The gallery is the most compelling entry point for new visitors — a full-bleed render with context. The dashboard is for creators who already understand what they're doing.

**Sketch editor is not a route.** It opens from within the recipe editor as a link out (↗) — a separate mode accessible from the flip bar. It does not have its own URL because it is not a standalone surface.

**Recipe editor and video editor are recipe-scoped.** They always operate on a named recipe. `/recipes/new` creates a new recipe; `/recipes/[name]` edits an existing one. The video editor is always pre-loaded with a recipe name from the gallery.

**Stable render URLs.** `/renders/[recipe]/[date].png` are permanent, cacheable, shareable. These are the URLs that appear in social media shares and citations. They must never change for a given recipe/date combination.

## Source Slugs

Used in dashboard URLs and source type filters.

| Source | Slug | Domain token |
|---|---|---|
| NOAA OISST / ESA SST-CCI | `sst` | `domain-sst` |
| ESA Sea Level CCI | `sealevel` | `domain-sealevel` |
| ESA SSS-CCI | `salinity` | `domain-salinity` |
| NSIDC Sea Ice | `seaice` | `domain-seaice` |
| ESA OC-CCI | `chlorophyll` | `domain-chlorophyll` |
| Argo floats | `argo` | `domain-argo` |
