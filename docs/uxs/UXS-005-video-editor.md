# UXS-005 — Video Editor

> **Status** · Draft v0.1 · April 2026 · drafted from prototype mockup (OC-02 Fig 7)
> **IA anchor** · §surfaces/video-editor · §topbar-patterns/video-editor · §shared-tokens
> **Related PRD** · [PRD-005 Video Editor](../prd/PRD-005-video-editor.md) — *the overlay list in this UXS is concrete; PRD-005 should be updated to enumerate the same overlays*
> **Related ADRs** · [ADR-004 Three-layer data store](../adr/ADR-004-three-layer-data-store.md)
> **Related RFCs** · [RFC-006 Audio system](../rfc/RFC-006-audio-system.md) · [RFC-007 Key moment detection](../rfc/RFC-007-key-moment-detection.md)

---

## Why this UXS exists

The Video Editor is the assembly studio — accumulated PNG renders become an MP4 with audio and overlays. PRD-005's sharpest threat (audio reads as decorative) is defeated specifically when the visual and audio events are demonstrably synchronised. This UXS specifies the visual contract that makes that synchronisation visible: the timeline ribbon under the preview shows key-moment markers; the Audio panel's "key moments detected" list shows the same moments by frame number; the Overlays panel's "Record flash" overlay fires at the same moment the audio swells. The UI has to make the connection visible — that's what this document specifies.

## Principles

- **Preview dominates; controls are dense.** The preview takes ~75% of horizontal space. The right panel is dense and information-rich — this is a workshop surface, not a public face.
- **Key moments are first-class.** They appear in the preview (ribbon markers, NEW RECORD banner overlays), in the Audio panel (frame-number list), and in the Overlays panel (which overlays fire on which moment types). One detection algorithm (RFC-007), three points of visibility.
- **Audio and overlays share a vocabulary.** Both consume the per-frame intensity signal. The Overlays panel groups them visually: rendering overlays (counter, anomaly, label, flash) above editorial overlays (date, attribution, pull-quote).
- **Export is the primary action.** `export MP4` lives in the topbar's right region in `intent-info` — present at all times, never buried in a menu.

## Scope

**In scope** · Video Editor topbar with `export MP4` action; preview area with rendered frame, sparkline, key-moment NEW RECORD banner, in-frame metadata overlay, and timeline ribbon; right-side control panel with Sequence, Audio, and Overlays sections; key-moments-detected list; overlay enable/disable list with status dots; citation footer.

**Non-goals** · The export-completion screen / share modal (deferred); the audio API authentication flow (Phase 2); behavioural rules (playback timing, key-moment detection algorithm — those are RFC territory).

**Boundary note** · Frame playback timing, audio crossfading mechanics (RFC-006), key-moment detection algorithm (RFC-007), and timeline ribbon scrubbing behaviour all belong in their respective RFCs. This UXS specifies the static appearance of every panel and overlay marker — not how they animate or compute.

## Theme

Dark only.

## Tokens

### Inherited from IA

- **Surface** · `canvas`, `surface`, `elevated`, `overlay`, `border`, `border-strong`
- **Text** · `text`, `text-secondary`, `text-muted`, `text-disabled`
- **Intent** · `intent-info` (export action, audio section header, "frames" stat); `intent-alert` (record markers, NEW RECORD banner)
- **Typography** · `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here — `videoeditor-*`

The Video Editor introduces tokens for the timeline ribbon's key-moment markers and the overlay status indicators.

| Token | Value | Usage |
|---|---|---|
| `videoeditor-marker-peak` | `intent-alert` | Statistical peaks and record events on the timeline ribbon |
| `videoeditor-marker-cool` | `intent-info` | Cooling / negative-anomaly events on the ribbon |
| `videoeditor-marker-record` | `linear-gradient(135deg, #EF9F27, #F09595)` | Record events — amber-to-coral gradient marker |
| `videoeditor-playhead` | `rgba(255,255,255,0.85)` | Current playback position indicator on the ribbon |
| `videoeditor-overlay-on` | `intent-info` | Filled dot indicating an overlay is enabled |
| `videoeditor-overlay-off` | `border` | Empty circle indicating an overlay is disabled |
| `videoeditor-banner` | `rgba(239,159,39,0.18)` | Background fill for the in-preview "NEW RECORD" banner |

The marker colours intentionally match the source palette so that the timeline ribbon under an SST recipe uses warm tones and an ice recipe would use cool tones — the visual identity carries through.

## Layout (Fig 7)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS  /timelapse editor / gulf_stream_thermal               export MP4│  ← topbar (42px)
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │ SEQUENCE           │  ← right panel
│ ┌─────────────────┐                                     │  recipe   gulf...  │     ~340px wide
│ │ ╱╲╱─╲─╱╲╱╲╱──── │  ← sparkline (top-left, ~150x60)    │  frames    365     │     `surface` bg
│ │       ●         │     trace + current-position dot    │  duration  30s·12fps│
│ └─────────────────┘                                     │                    │
│                                                         │ AUDIO              │  ← intent-info hdr
│         ┌─────────────────────────────┐                 │  via generative API│
│         │  ▢ NEW RECORD ▢            │  ← banner       │                    │
│         │   videoeditor-banner fill   │     (centred,   │  theme   Ocean     │
│         │   intent-alert text         │      key moment)│  energy  builds... │
│         └─────────────────────────────┘                 │  sensitivity react.│
│                                                         │  key mom.  swell   │
│                                                         │                    │
│           PREVIEW CANVAS                                │  key moments       │
│           (rendered frame, e.g. SST thermal field)      │  detected:         │
│           full bleed of left area                       │  ●El Niño peak fr.54│
│                                                         │  ●Record high fr.348│
│ 14 Mar 2026                                             │  ●Acceleration fr.378│
│ +1.8°            (anomaly in domain-sst-accent)         │                    │
│ above baseline   (sublabel in text-muted)               │ OVERLAYS           │
│ NOAA OISST · North Atlantic · OceanCanvas               │                    │
│ (in-frame attribution overlay, lower-left)              │  ● Primary counter │
│                                                         │      SST each frame │
│                                                         │  ● Anomaly indicator│
│ ────●═══════════●══════════●══════════════════════►     │      vs baseline   │
│      peak       cool       record          (timeline ribbon, key moment markers)│  ● Named event labels│
│                                                         │      El Niño etc.  │
│                                                         │  ● Record flash    │
│                                                         │      at peaks      │
│                                                         │  ● Moving sparkline│
│                                                         │      last 30 frames│
│                                                         │  ● Timeline ribbon │
│                                                         │      progress + ev.│
│                                                         │  ● Date stamp      │
│                                                         │      editorial     │
│                                                         │  ● Source attrib.  │
│                                                         │      footer        │
│                                                         │                    │
│                                                         │  ○ Pull quote      │
│                                                         │  ○ Projection ghost│
├─────────────────────────────────────────────────────────┴────────────────────┤
│ OceanCanvas · Video editor · Audio + overlay enrichment · Key moments shared │  ← page footer
│ between tracks · Generative music API                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Region | Position / size | Tokens | Notes |
|---|---|---|---|
| **Topbar** | Full width, 42px | `surface` background, wordmark on left, two-segment path in `text-secondary`, `export MP4` in `intent-info` on right | Per IA §topbar-patterns/video-editor |
| **Preview area** | ~75% of viewport width, full height between topbar and footer | `canvas` background, render frame fills | Updates as playback advances |
| **Sparkline (in-preview, top-left)** | Upper-left of preview, ~150×60px, padded ~24px from edges | `surface` 80% background, line in `domain-sst-accent` 1px, current-frame dot in `text` filled circle 4px | Shows the data trend across the full sequence; current position dot moves with playback |
| **NEW RECORD banner (in-preview)** | Centred horizontally, ~30% of preview width, ~36px tall | `videoeditor-banner` background, `intent-alert` text, `intent-alert` 1px border | Appears when a record key-moment fires; only visible during the moment, otherwise hidden. Animation timing in RFC-007 |
| **Date stamp (in-preview)** | Lower-left of preview area, padded ~24px | `text` `type-data` for date | "14 Mar 2026" |
| **Anomaly overlay (in-preview)** | Below date | `domain-sst-accent` `type-display` for anomaly value, `text-muted` `type-label` for "above baseline" | Source-coloured per the recipe's source — domain-sst-accent for SST recipes, would shift to domain-sealevel-accent for sea level recipes |
| **In-frame attribution (lower-left footer of preview)** | Bottom of preview area | `text-muted` `type-axis` | "NOAA OISST · North Atlantic · OceanCanvas" — appears as part of the rendered frame because `Source attribution` overlay is enabled |
| **Timeline ribbon** | Bottom of preview area, full preview width, ~32px tall | `border` line as the track; key-moment markers as filled circles in marker-type colours; playhead as `videoeditor-playhead` filled circle 8px | Per RFC-007: peak, cool, record, accel markers each have their colour |
| **Right panel** | ~340px wide, full height | `surface` background, `border` 1px left edge | Three sections, `type-label` `text-muted` headers (or `intent-info` for AUDIO active section) |
| **SEQUENCE section** | Top of right panel | each row: label in `text-muted` `type-data` left, value in `text` right; "frames" value in `intent-info` to indicate it's a derived count | recipe / frames / duration |
| **AUDIO section** | Below SEQUENCE | header `intent-info` (active section indicator); subtitle "via generative API" in `text-muted`; rows same pattern as SEQUENCE; values in `intent-info` for theme, `text` for others | theme / energy arc / sensitivity / key moments |
| **Key moments detected list** | Sub-list within AUDIO | each row: status dot in `videoeditor-marker-peak` (or matching colour), event label in `text`, frame label in `text-muted` `type-axis` right-aligned | "El Niño peak fr.54" / "Record high fr.348" / "Acceleration fr.378" |
| **Channel mixer + EQ block** | Below the waveform inside AUDIO | two-column grid: left = 4 channel rows (pad / pulse / accent / texture) with mute toggle + slim volume slider; right = 3 EQ bands (bass / mid / treble) with slim sliders and dB readout; mute strikes through the channel label and dims to `text-disabled` | per ADR-027 mixer + EQ surface |
| **Tension arc editor** | Below the mixer + EQ inside AUDIO | small SVG curve preview (~280×50px) in `surface` 4% tint with `border` 1px, intent-teal curve at 85% opacity, draggable peak handle as `intent-info` filled circle with `canvas` 1.5px stroke; below the curve a row of 5 preset pills (none / classic / plateau / drift / invert) with active in `intent-teal` border + tint, inactive in `text-muted` border; below the pills, optional pin toggle row (`accent-color: intent-teal`) showing "pin peak to record moment (frame N)" in `text-muted` `type-axis` | per ADR-028 — author-facing arc surface |
| **Arc overlay (on waveform)** | Painted over the waveform canvas | thin guide line at ~28% opacity tracing arc[t] across canvas height; live indicator dot at currentFrame in `rgba(180, 220, 255, 0.9)` 2.5px filled circle | per ADR-028 — visualizer reads engine state, not parallel math |
| **OVERLAYS section** | Bottom of right panel | header `text-muted` `type-label`; rows: status dot + label + sublabel; enabled overlays use `videoeditor-overlay-on`; disabled use `videoeditor-overlay-off` | 8 enabled by default + 2 disabled |
| **Citation footer** | Bottom, full width | `text-muted` `type-axis` | "OceanCanvas · Video editor · Audio + overlay enrichment · Key moments shared between tracks · Generative music API" |

## The overlays — concrete list

The prototype defines the overlay set explicitly. PRD-005 should be revised to match this list.

| Overlay | Default | Description (sublabel in panel) |
|---|---|---|
| Primary counter | enabled | "SST each frame" — current-frame value over the render |
| Anomaly indicator | enabled | "vs baseline" — anomaly statistic over the render |
| Named event labels | enabled | "El Niño etc." — text labels for known events |
| Record flash | enabled | "at peaks" — visual flash on record key-moments |
| Moving sparkline | enabled | "last 30 frames" — small trend graphic in upper-left |
| Timeline ribbon | enabled | "progress + events" — the ribbon under the preview, exported with the video |
| Date stamp | enabled | "editorial" — the in-frame date in lower-left |
| Source attribution | enabled | "footer" — the in-frame attribution at very bottom |
| Pull quote | disabled | (Phase 2 — text quote inset on selected frames) |
| Projection ghost | disabled | (Phase 2 — overlay of past frames as ghosting) |

## Component states

| Component | Default | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| **Export MP4 button** | `intent-info` text in topbar | brighter `intent-info` | n/a (initiates export) | `border-strong` ring | `text-disabled` (no frames) | spinner replaces label | n/a | label flips to `intent-alert` "export failed" |
| **Timeline ribbon track** | `border` line | crosshair appears at cursor x; preview frame jumps to that position | n/a | `border-strong` ring | shimmer | n/a | n/a | n/a |
| **Timeline ribbon marker** | filled circle in marker-type colour | tooltip with event details + frame number in `overlay` | n/a | `border-strong` ring | n/a | n/a | n/a | hidden if data missing |
| **Timeline ribbon playhead** | `videoeditor-playhead` filled circle | drags with cursor | n/a (always at current frame) | `border-strong` ring | n/a | n/a | n/a | n/a |
| **Audio section value** | `intent-info` (theme, key moments) or `text` (others) | underline on hover when changeable | tooltip when interactive | `border-strong` ring | `text-disabled` | shimmer | n/a | `intent-alert` |
| **Overlay row** | status dot + label + sublabel | row background `surface` 4% on hover | enabled state: dot in `videoeditor-overlay-on`; disabled: `videoeditor-overlay-off` | `border-strong` ring | `text-disabled` | n/a | n/a | dot flips `intent-alert` if overlay errors |
| **Key-moment list row** | dot + label + frame ref | row background `surface` 4% on hover | clicking jumps preview to that frame | `border-strong` ring | n/a | shimmer if not yet detected | "no key moments detected" centred at `text-muted` | `intent-alert` if detection failed |
| **NEW RECORD banner** | hidden by default; shows during record key-moments only | n/a | `videoeditor-banner` fill + `intent-alert` text | n/a | n/a | n/a | n/a | n/a |

## Accessibility

- **Contrast** · `intent-info` (`#5DCAA5`) over `surface` is 8:1+. `intent-alert` (`#F09595`) over `videoeditor-banner` (low-opacity amber) is verified at 4.8:1 — meets WCAG AA. The status dots in the overlay list are colour-coded but always paired with text labels, so they remain distinguishable for users with colour-vision differences.
- **Focus** · all interactive elements (export button, ribbon markers, ribbon playhead, audio section values, overlay rows, key-moment list rows) show a `border-strong` focus ring.
- **Keyboard** · ribbon playhead accepts arrow keys for stepwise frame change; ribbon markers tab-reachable as a sub-group; overlay rows accept Space to toggle; export button accepts Enter. Tab order: topbar (wordmark → path → export) → preview controls → right panel sections (Sequence → Audio → Overlays) in document order.
- **Reduced motion** · NEW RECORD banner appearance, ribbon playhead movement, overlay enable/disable transitions, export-progress animation all respect `prefers-reduced-motion`.
- **Screen readers** · preview is `<region>` with `aria-label` containing the recipe id and current frame number. Timeline ribbon is a `<slider>` (or `aria-valuenow`-equipped element) with `aria-valuemin`/`-max`/`-now` for frame number. Markers are `role="button"` with descriptions. Overlay rows are checkboxes with `aria-checked`. Key-moment list is `<ul>` with each row as `<li>` containing a button.

## Acceptance criteria

- [ ] Topbar shows two-segment path (`/timelapse editor / {recipe-id}`) and `export MP4` action in `intent-info`
- [ ] Preview area takes ~75% of horizontal space; right panel is ~340px wide
- [ ] In-preview sparkline appears top-left at ~150×60px with current-frame dot
- [ ] NEW RECORD banner appears in `videoeditor-banner` fill with `intent-alert` text — only visible during record moments
- [ ] In-preview metadata (date, anomaly, attribution) appears lower-left in source-appropriate colours
- [ ] Timeline ribbon is full preview width at the bottom of the preview area; markers colour-coded per type
- [ ] Right panel has three sections: SEQUENCE (`text-muted` header), AUDIO (`intent-info` header — active section), OVERLAYS (`text-muted` header)
- [ ] Audio section's "key moments detected" list shows colour-coded dots matching ribbon-marker colours
- [ ] Overlays section lists 10 overlays with status dots — 8 enabled by default (filled `intent-info`), 2 disabled (`border` empty circle)
- [ ] Citation footer at bottom in `text-muted` `type-axis`
- [ ] All semantic tokens used; no one-off hex outside `videoeditor-*` definitions
- [ ] Focus visible on all interactive elements
- [ ] Keyboard reachability confirmed for ribbon, audio values, overlays, key-moment list
- [ ] Screen-reader labels in place on preview, ribbon, overlay rows, and key-moment list

---

## Notes for related docs

**PRD-005 should enumerate the overlays.** This UXS contains the concrete list (10 overlays, 8 default-enabled). PRD-005 v0.2 should reference it explicitly so the product surface is documented at the impact level, not only at the visual-contract level.

**RFC-006 audio system architecture stands.** The prototype confirms the four-axis audio control surface (theme, energy arc, sensitivity, key moments). The "via generative API" subtitle indicates the stem-source choice (per RFC-006's Implementation B path) is in play here — the deeper API choice (Mubert vs. Beatoven) remains open.

**RFC-007 key moment detection** — the prototype shows three detected moments by name (`El Niño peak`, `Record high`, `Acceleration`). These map to the four detector types in RFC-007 (peaks, records, threshold, inflection); `Acceleration` corresponds to the inflection detector. Worth confirming in RFC-007's open questions whether the user-facing moment names are derived from detector type or set by the user / preset.
