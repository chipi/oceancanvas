# UXS-002: Recipe Editor Studio

- **Status**: Draft
- **Related PRD**: `docs/prd/PRD-006-recipe-editor-studio.md`
- **Related RFC**: `docs/rfc/RFC-001-recipe-yaml-schema.md`
- **Related IA**: `docs/uxs/OC_IA.md`
- **Related UXS**: `docs/uxs/UXS-001-dashboard.md`, `docs/uxs/UXS-003-gallery.md`

## Summary

This UXS defines the static visual contract for the recipe editor studio — the live preview canvas, the flip bar, creative mode controls (mood presets, energy×presence space, colour character spectrum, temporal weight), and YAML mode. The preview is always the dominant visual element; everything else serves it.

## Principles

- **Preview is the hero**: the ocean render occupies the full width above the flip — controls exist to serve it
- **Editorial intent, not technical knobs**: control labels are mood vocabulary, never parameter names
- **One thing at a time**: the flip toggle ensures only one control mode is visible — creative or YAML
- **Amber means yours**: in YAML mode, amber lines are the user's creative choices — instantly recognisable
- **Dark always**: preview and controls on `canvas` background; no light sections

## Scope

**In scope:** live preview canvas, flip bar, creative mode controls, YAML mode display, sketch editor link, save/discard actions

**Non-goals:** sketch editor itself (opens in new tab), recipe metadata editing (name, schedule)

**Boundary note:** preview debounce timing, YAML parse-and-sync behaviour, and sketch editor communication protocol belong in an RFC.

## Theme Support

- **Dark only**
- Primary palette adapts to the active recipe's colour character

## Layout

```
┌────────────────────────────────────────────┐ 42px topbar
├────────────────────────────────────────────┤
│                                            │
│       LIVE PREVIEW CANVAS (p5.js)          │ 300px fixed
│                                            │
│  [type badge]              [mood badge]    │ floating overlays
│  [source · date]                           │
│                 [preview full] [render now]│
├────────────────────────────────────────────┤ 38px flip bar
│  [ creative | yaml ]  hint text  sketch↗  │
├────────────────────────────────────────────┤
│                                            │
│  creative mode controls  OR  yaml panel    │ flex 1, scrollable
│                                            │
├────────────────────────────────────────────┤ 44px bottom bar
│        [ save recipe ]    [ discard ]      │
└────────────────────────────────────────────┘
```

## Preview canvas — tokens

| Element | Token | Notes |
|---|---|---|
| Canvas background | `canvas` | Behind the render |
| Type badge | `surface` + `border` | "FIELD RENDER" at `label` scale |
| Mood badge | `surface` + `border` | Active mood name at `sm` scale |
| Source/date | `text-tertiary` at `sm` | "NOAA OISST · 25 Apr 2026" |
| "preview full" | `text-tertiary` at `sm` | Link style — no button border |
| "render now" | `domain-sst-accent` at `sm` | Tinted text — active action |

## Flip bar — tokens

| Element | Token | Notes |
|---|---|---|
| Bar background | `surface` | Full-width separator |
| Toggle pill (active) | `elevated` fill + `text-primary` | Active mode |
| Toggle pill (inactive) | transparent + `text-muted` | Inactive mode |
| Hint text | `text-muted` at `sm` | Changes per mode |
| "sketch editor ↗" | `text-muted` at `sm` | Right-aligned, link style |

## Creative mode — control sections

Each section separated by `border-subtle` dividers. Labels at `label` scale (9px spaced caps, `text-muted`).

### Mood presets

- Pills in a flex-wrap row
- Inactive: `border` outline, `text-muted` label, transparent fill
- Active: `border` at 0.5px white opacity 0.45, `text-primary`, `surface` fill
- 5 presets + 1 "Custom" pill (border-dashed when active)

### Energy × presence 2D space

- `elevated` fill, full-width, 140px tall, 4px border-radius
- Quadrant hairlines: `border-subtle` (barely visible)
- Quadrant labels: `label` scale, `intent-alert` (Storm, Turbulent ghost) and `intent-info` (Becalmed, Dormant)
- Draggable point: 5px radius `intent-info` fill, 14px radius `intent-info` at 18% opacity halo
- Readout below: `text-muted` at `sm` — "calm · present"

### Colour character spectrum

- 16px tall track, full-width, 4px border-radius
- Gradient: `#042C53` → `#EF9F27` → `#534AB7` → `#D4537E`
- Thumb: 13px circle, white fill, no border
- End labels: `label` scale, `text-muted`

### Temporal weight

- Row: label left (`text-muted` at `sm`), range input centre, value right (`text-muted` at `sm`)
- Range input: 3px track in `border`, white thumb 13px

## YAML mode — tokens

| Element | Token | Notes |
|---|---|---|
| Background | `canvas` | Same as creative mode |
| Structure keys | `#5DCAA5` (teal) | `name:`, `region:`, `sources:` etc |
| Values | `#5DCAA5` at 70% | Teal, slightly dimmer |
| Creative choice lines (amber) | `#EF9F27` | The user's parameters |
| Amber line background | `#EF9F27` at 8% | Subtle highlight behind amber lines |
| Comment lines | `text-muted` | `# recipe: north_atlantic_sst` |
| Cursor | `intent-info` vertical bar | Standard editor cursor |

### YAML legend (below the block)

- 3 items: ● teal "structure / source" · ● amber "creative controls" · ● teal dim "values"
- `label` scale, separated by `border-subtle` top edge

## Bottom bar

| Element | Token | Notes |
|---|---|---|
| Bar background | `surface` | Full-width |
| Save recipe | `intent-info` fill at 12%, `intent-info` border, `intent-info` text | Primary action |
| Discard | `border` outline, `text-muted` | Secondary action |

## Key States

| Component | Hover | Active | Focus | Disabled |
|---|---|---|---|---|
| Mood pill | `surface` fill, `text-secondary` | `surface` fill, `text-primary`, white border | Outline `intent-info` | `text-disabled` |
| Energy×presence space | Crosshair cursor | Dragging — no state change | — | — |
| Colour character thumb | Grab cursor | Dragging | Outline | — |
| Temporal weight thumb | — | — | Outline | — |
| Save button | Slightly brighter fill | — | Outline | `text-disabled` |
| Flip button (inactive) | `text-secondary` | — | Outline | — |

## Acceptance Criteria

- [ ] Preview canvas fills full width with no horizontal padding
- [ ] Preview never moves — flip toggle changes only what is below it
- [ ] Mood pills show correct active state (white border + surface fill)
- [ ] Energy×presence space quadrant labels use intent tokens (not generic text)
- [ ] YAML mode amber lines have amber background highlight at 8% opacity
- [ ] YAML legend shows three colour-coded items
- [ ] Save button uses `intent-info` palette — not generic primary
- [ ] No borders on the preview canvas itself
- [ ] Flip bar hint text changes between "mood · energy · colour · time" and "amber lines are your creative choices"
