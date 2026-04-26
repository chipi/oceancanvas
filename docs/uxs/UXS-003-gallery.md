# UXS-003: Gallery

- **Status**: Draft
- **Related PRD**: `docs/prd/PRD-007-gallery.md`
- **Related RFC**: none
- **Related IA**: `docs/uxs/OC_IA.md`
- **Related UXS**: `docs/uxs/UXS-004-video-editor.md`

## Summary

This UXS defines the static visual contract for the gallery front page — the hero full-bleed render, the 14-day strip, the all-recipes grid, and the source type filter navigation. The gallery is the public face: art leads, data is revealed on hover.

## Principles

- **Art first**: renders fill their containers edge to edge — no thumbnail borders by default
- **Source identity through colour**: the six source palettes make the grid visually rich without labels
- **Minimal chrome**: nav is a wordmark and filter pills — nothing else competes with the art
- **Living quality**: "Updated daily" badge confirms the gallery is alive; the art itself is the proof

## Scope

**In scope:** nav bar, hero layout, 14-day strip, all-recipes grid, source type filter, full-screen render view

**Non-goals:** recipe editor, video editor (covered in their own UXS)

**Boundary note:** animation of the hero transition on new render, infinite scroll behaviour for large grids — belong in an RFC.

## Theme Support

- **Dark only**
- No single source palette — the grid shows all source palettes simultaneously

## Layout

```
┌───────────────────────────────────────────────┐ 42px nav
├───────────────────────────────────────────────┤
│                                               │
│         HERO — featured recipe render         │ 340px
│         (full-bleed, full width)              │
│                                               │
├───────────────────────────────────────────────┤
│  14-day strip (14 thumbnails, scrollable)     │ 70px
├───────────────────────────────────────────────┤
│  ALL RECIPES — TODAY                     6    │ 32px header
├───────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ render │ │ render │ │ render │            │ grid rows
│  └────────┘ └────────┘ └────────┘            │ 100px cells
│  ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ render │ │ render │ │ render │            │
│  └────────┘ └────────┘ └────────┘            │
└───────────────────────────────────────────────┘
```

## Nav bar

| Element | Token | Notes |
|---|---|---|
| Bar background | `surface` | Full-width, 42px |
| Wordmark "OCEANCANVAS" | `text-secondary` at `sm`, spaced caps | Left-aligned |
| Source filter pills | see below | Right-aligned group |
| "Updated daily" badge | `intent-info` border + text, `canvas` fill | Rightmost |
| Bottom border | `border` | 0.5px |

### Source filter pills

```
[ all ] [ SST ] [ salinity ] [ sea level ] [ ice ] [ chlorophyll ]
```

- Pill group: shared border — left pill rounded left, right pill rounded right, middle pills flat
- Active: `surface` fill, `text-primary`, `border` at 0.45 opacity
- Inactive: transparent, `text-muted`, `border` at 0.18 opacity
- All filters share a single border ring (connected pill group, not individual pills)

## Hero

| Element | Token | Notes |
|---|---|---|
| Render image | fills 100% width × 340px | object-fit: cover |
| Overlay gradient | `canvas` at 0–40% opacity | Bottom of image only — lets art breathe |
| Recipe slug | `text-tertiary` at `label` scale | Top of overlay — "gulf_stream_thermal · OISST SST · field" |
| Recipe title | `text-primary` at `xl` scale | Main title — "North Atlantic Sea Surface Temperature" |
| Date | `text-secondary` at `hero` scale (28px) | Right-aligned |
| Year | `text-tertiary` at `sm` | Below date, right-aligned |
| "timelapse ↗" | `text-tertiary` at `sm` | Top-right, link style |
| "recipe ↗" | `text-tertiary` at `sm` | Top-right, next to timelapse |
| "download" | `intent-info` at `sm` | Top-right, tinted |

## 14-day strip

| Element | Token | Notes |
|---|---|---|
| Strip background | `surface` | Full-width, 70px tall |
| Section label | `label` scale, `text-muted` | "THIS RECIPE  gulf_stream_thermal — last 14 days" |
| Thumbnails | 56×36px, 4px border-radius | Renders as images |
| Thumbnail border (default) | none | Art bleeds to edge |
| Thumbnail border (most recent) | `text-secondary` at 0.8 opacity, 0.5px | Most recent is highlighted |
| Date label | `mono` at 8px, `text-muted` | Below each thumbnail |
| Strip top border | `border` | 0.5px separator |

## All-recipes grid

| Element | Token | Notes |
|---|---|---|
| Grid header | `label` scale, `text-muted` | "ALL RECIPES — TODAY" left, count right |
| Grid | 3-column, 5px gaps | |
| Grid cell | render fills cell, 4px border-radius | No border by default |
| Cell overlay (hover) | `canvas` at 85% fill | Slides up on hover |
| Overlay recipe type | `text-secondary` at `mono` scale | e.g. "SST · field" |
| Overlay recipe name | `text-primary` at `sm` | Recipe name |
| Cell border (hover) | `text-tertiary` at 0.18 opacity | 0.5px, appears on hover |

Grid cells: `domain-sst` renders show warm amber tones; `domain-seaice` show violet; `domain-salinity` show teal/green; `domain-sealevel` show teal; `domain-chlorophyll` show green. The six palettes make the grid visually rich without any labels. Labels appear only on hover.

## Full-screen render view

Opens when clicking any render. Overlay on top of the gallery.

| Element | Token | Notes |
|---|---|---|
| Background | `canvas` at 95% | Near-opaque overlay |
| Render image | Max 90vw × 80vh, centred | Actual render quality |
| Metadata panel | `surface` fill, right side | Recipe name, date, region, sources, parameters |
| "timelapse ↗" | `intent-info` | Action button |
| "recipe ↗" | `border` outline, `text-secondary` | Secondary action |
| Close | `text-muted` × icon | Top-right corner |

## Key States

| Component | Hover | Active | Focus |
|---|---|---|---|
| Hero | — | — | — |
| Strip thumbnail | Brighten slightly, cursor pointer | — | Outline `intent-info` |
| Grid cell | Overlay appears, border appears | — | Outline `intent-info` |
| Filter pill | `text-secondary` | `surface` fill, `text-primary` | Outline |
| Nav link | `text-secondary` | `text-primary` | Outline |

## Acceptance Criteria

- [ ] Hero render fills 100% width with no horizontal padding or border
- [ ] Source filter pills are a connected group (not individual buttons)
- [ ] Active filter pill has `surface` fill — not a solid accent colour
- [ ] Grid cells show no border or overlay by default — art is unobstructed
- [ ] Grid cell overlay appears on hover — recipe type in `mono` scale, name in `sm` scale
- [ ] Most recent strip thumbnail has a subtle border — all others do not
- [ ] "Updated daily" badge uses `intent-info` colours
- [ ] Full-screen overlay background is `canvas` at 95% — not pure black
