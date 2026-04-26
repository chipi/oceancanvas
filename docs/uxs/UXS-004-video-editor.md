# UXS-004: Video Editor

- **Status**: Draft
- **Related PRD**: `docs/prd/PRD-008-video-editor.md`, `docs/prd/PRD-009-audio-enrichment.md`, `docs/prd/PRD-010-overlay-enrichment.md`
- **Related RFC**: `docs/rfc/RFC-005-audio-system-technical-design.md`, `docs/rfc/RFC-006-key-moment-detection-algorithm.md`
- **Related IA**: `docs/uxs/OC_IA.md`

## Summary

This UXS defines the static visual contract for the video editor — the preview canvas with overlay annotations visible, the right panel (sequence, audio, overlays sections), the timeline strip, and the scrub bar. The video editor is assembly focused: the art is already made; the editor is for sequencing, enriching, and exporting.

## Principles

- **Assembly, not creation**: the editor is functional and minimal — the art lives in the preview, the controls in the right panel
- **Shared event language**: audio and overlay key moments are marked at the same frame numbers — the timeline makes this visible
- **Editorial overlays**: overlay annotations follow the same design language as the gallery (numbers at display scale, source palette colours, no chart borders)
- **Export is the goal**: the primary action is always visible — "export MP4" in the topbar

## Scope

**In scope:** preview canvas with data overlays, transport controls, right panel (sequence/audio/overlays), timeline strip, scrub bar

**Non-goals:** overlay rendering quality within the preview (previews at reduced quality; full quality is the export)

**Boundary note:** transport play animation timing, scrub drag behaviour, audio waveform rendering algorithm — belong in an RFC.

## Theme Support

- **Dark only**
- Source palette adapts to the active recipe's primary source

## Layout

```
┌────────────────────────────────────────────────┐ 42px topbar
├────────────────────────────────────────────────┤
│                              │                 │
│  PREVIEW CANVAS              │  RIGHT PANEL    │
│  (with overlay annotations   │  SEQUENCE       │
│   visible)                   │  AUDIO          │
│                              │  OVERLAYS       │ 320px preview
│  [« play »]  transport       │                 │
│                              │  [export MP4]   │
│  14 Mar 2026  +1.8°  ────●──│  [export GIF]   │
├────────────────────────────────────────────────┤
│  TIMELINE · Apr 2025 → Apr 2026  365 frames   │ 68px timeline
│  [thumbnail strip with key moment dots]        │
├────────────────────────────────────────────────┤
│  scrub ────────────●──────────── 14 Mar 2026  │ 36px scrub
└────────────────────────────────────────────────┘
```

Layout columns: preview 68% width, right panel 32% width, `border` separator.

## Preview canvas — data overlays

Overlays composited over the preview at reduced quality (final quality only in the export).

| Overlay element | Token | Notes |
|---|---|---|
| Primary variable counter | `domain-{source}-accent`, `hero` scale (28px) | "14 Mar 2026" below at `sm` |
| Anomaly indicator | `intent-alert` (positive) / `intent-info` (negative) | "+1.8° above baseline" |
| Timeline ribbon | `intent-info` fill, 10px tall, bottom of canvas | Progress indicator |
| Event dots on ribbon | `domain-sst-accent` (records), `intent-alert` (peaks) | At key moment frames |
| Current position marker | white, 2px | Moves along ribbon |
| Sparkline | `domain-{source}-accent`, 2px line | Top-left corner, 200×50px |
| Sparkline cursor | `domain-{source}-accent`, 4px dot | Current frame position |
| Source attribution | `text-muted` at `mono` scale | Bottom-left, persistent |
| "★ NEW RECORD ★" flash | `intent-alert`, `surface` fill, `intent-alert` border | Appears at record frames |

## Transport controls

| Element | Token | Notes |
|---|---|---|
| Play/pause button | `surface` fill, `border` border, `text-secondary` icon | 32px circle |
| Play/pause (playing) | `intent-info` border, `intent-info` icon | Tinted when playing |
| Skip buttons | `surface` fill at 50%, `border` border, `text-tertiary` icon | 24px circle, «10 »10 |

## Right panel

| Element | Token | Notes |
|---|---|---|
| Panel background | `canvas` | Same as page |
| Section separator | `border` | 0.5px horizontal rule |
| Section label | `label` scale, `text-muted` | "SEQUENCE", "AUDIO", "OVERLAYS" |
| Section label (audio) | `intent-info` text | Slightly tinted — audio is enrichment |
| Section label (overlays) | `#AFA9EC` text (purple) | Slightly tinted — overlays are enrichment |

### Sequence section

- Stat rows: key left (`text-muted` at `sm`), value right (source accent or `text-secondary`)
- Frame rate pills: 3-pill connected group, same pattern as gallery filter pills
- Duration line: `text-muted` at `sm` — "output: 30s MP4"

### Audio section

- Theme selector: same pill pattern as mood presets in recipe editor
- Setting rows: key left, value right (teal for audio-related values)
- Key moments list: amber dot · event name · frame number in `mono` at `sm`

### Overlay section

- Toggle list: green dot (on) or square outline (off) · name · description
- Essential overlays: checked by default (green dot)
- Optional overlays: unchecked by default (outline)
- Green: `#63991A` (darker green for small dot readability)

### Export buttons

- "export as MP4": `intent-info` fill at 12%, `intent-info` border, `intent-info` text — primary
- "export as GIF": `border` outline, `text-muted` — secondary

## Timeline strip

| Element | Token | Notes |
|---|---|---|
| Strip background | `elevated` | Slightly raised from canvas |
| Header | `label` scale, `text-muted` | "TIMELINE · Apr 2025 → Apr 2026" |
| Frame count | `text-muted` at `sm`, right-aligned | "365 frames selected" |
| Thumbnails | 30×36px renders, 3px border-radius | Tiny renders showing seasonal change |
| Current frame border | `intent-info` border, 2px | Active frame highlighted |
| Key moment dots — record | `domain-sst-accent` | Amber dots on thumbnail strip |
| Key moment dots — peak | `intent-alert` | Coral dots |
| Key moment dots — inflection | `intent-info` | Teal dots |

## Scrub bar

| Element | Token | Notes |
|---|---|---|
| Track | `border` fill, 3px tall | Full width |
| Progress | `text-tertiary` fill | 0–current position |
| Thumb | white circle, 12px | Draggable |
| Date label | `text-secondary` at `sm`, right-aligned | Current frame date |

## Key States

| Component | Hover | Active/Dragging | Disabled |
|---|---|---|---|
| Transport play | `text-secondary` | `intent-info` tint | `text-disabled` |
| Skip buttons | `text-secondary` | — | `text-disabled` |
| Timeline thumbnail | Brighten, cursor pointer | `intent-info` border | — |
| Scrub thumb | Grab cursor | Dragging | — |
| Export MP4 | Slightly brighter | — | `text-disabled` (no frames) |
| Overlay toggle (on) | — | — | `text-disabled` |

## Acceptance Criteria

- [ ] Preview canvas fills its column (68%) with no padding
- [ ] Data overlays use source palette tokens — not generic white or grey
- [ ] Primary counter at `hero` scale (28px) — not `base` or `sm`
- [ ] Record flash uses `intent-alert` — not domain accent (record is always an alert)
- [ ] Audio section label in `intent-info` tint — not plain `text-muted`
- [ ] Overlays section label in purple (`#AFA9EC`) — not plain `text-muted`
- [ ] Essential overlays have green dot (on); optional overlays have outline (off) by default
- [ ] Timeline key moment dots use the correct colour per type (amber/coral/teal)
- [ ] Export MP4 button uses `intent-info` palette — primary action is always visible
