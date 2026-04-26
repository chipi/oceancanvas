# PRD-005 — Video Editor

> **Status** · Draft v0.2 · April 2026 · revised to enumerate overlays per UXS-005
> **PA anchor** · audiences/artist · audiences/climate-communicator · promises/accumulation · promises/citation-travels
> **IA anchor** · §surfaces/video-editor
> **Related** · PRD-001 Recipe · PRD-004 Gallery · UXS-005 Video Editor · RFC-006 Audio system · RFC-007 Key moment detection
> **Status moves to Implemented when** · A user can open the video editor for any recipe with at least 30 days of accumulated renders, configure audio + overlays, and export an MP4 that plays anywhere

---

## Why this is a PRD

A timelapse film is the format that turns daily-render accumulation into something a person can actually *show* someone. A year of SST data as a 30-second film is a different kind of artefact than 365 PNGs in a folder — it is the moment the project stops being a gallery and becomes a piece of work. The Video Editor is the surface where that transformation happens. It needs its own argument because the experience it creates is qualitatively different from anything else in OceanCanvas: the recipe + the render are static; the timelapse + the music + the overlays are *time-based, viscerally communicative, exportable to anywhere a video can play*.

## What changes for the person

Today, when a recipe has accumulated three months of daily renders, the artist looks at the gallery's 14-day strip and feels the change passing by. They can scroll through individual renders, but they can't *play* the year. They can't share what the ocean did over time as a single thing — they have to assemble it elsewhere, with their own tools, losing the data attribution and the editorial framing along the way.

With the Video Editor:

The artist opens the video editor for a recipe (from Gallery's `timelapse ↗` action, or directly via URL). The preview shows the accumulated renders animating at default 12fps. They configure the music — pick a theme (Ocean / Ambient / Dramatic), set the energy arc (builds throughout / peaks in middle / meditative / follows data), set sensitivity. The system has already detected the key moments — the El Niño peaks, the records, the inflection points — and listed them by frame number. Audio swells will fire at exactly those frames; visual annotations (record flash, anomaly indicator) will fire at exactly those frames too. The artist confirms the overlays they want — Primary counter, Anomaly indicator, Date stamp, Source attribution are on by default; Pull quote is off. They click `export MP4`, and within thirty seconds the file is on disk: the year of ocean, scored to music, annotated with editorial dignity, ready to post anywhere.

The climate communicator, watching the same export, hears the music intensify at exactly the frame the screen says "+1.7°C" and the date reads "August 2022." They never had to choose between *accurate* and *moving*. The data and the feeling are synchronous because they share the same key-moment-detection signal.

## The body of the argument

### The three enrichment tracks

The Video Editor layers three tracks onto the accumulated visual frames. All three are optional. All three pull from the same data time series, and the audio + overlays share the same key-moment detection algorithm (RFC-007).

**Track 1 — Visual.** The recipe's accumulated PNG renders, in date order, played at the chosen frame rate. The user can trim the date range to focus on a specific period (a year, a season, a period around an anomaly event). Frame rates: 6fps (contemplative), 12fps (default — 365 frames = 30 seconds), 24fps (approaching real footage). No re-rendering happens here — the renders already exist on disk; this is assembly.

**Track 2 — Audio.** A generative music track that evolves with the data. The user picks a theme, sets an energy arc, calibrates sensitivity. The system generates the track at export time (RFC-006: stem-based crossfading, with stems sourced from a generative API or local library). Music swells at detected key moments.

**Track 3 — Overlays.** Data annotations rendered over each frame at composite time. SVG overlays generated per-frame from the data time series, composited by ffmpeg with the visual track. The overlays are listed below; they are toggleable.

### The overlays — concrete list

These are the ten overlays the system supports, with their default state. UXS-005 specifies their visual contract.

| Overlay | Default | What it shows |
|---|---|---|
| **Primary counter** | enabled | The current-frame data value (e.g., "SST 14.2°") rendered in the lower-left of each frame. The data point that the frame *is*. |
| **Anomaly indicator** | enabled | The anomaly versus the recipe's baseline (e.g., "+1.4° above climatology") in source colour. The data point that gives the frame its *meaning*. |
| **Named event labels** | enabled | Editorial labels at known events (El Niño '15, Marine heatwave 2019). Sourced from a curated event list per source — the climate-communication context the data alone can't provide. |
| **Record flash** | enabled | A brief visual pulse at the frame where a key-moment record fires. Synchronised to audio peak. The visceral confirmation of "this is the day." |
| **Moving sparkline** | enabled | A small trace in the upper-left showing the last 30 frames' values. Spatial context for "where are we in the trend?" |
| **Timeline ribbon** | enabled | A thin horizontal bar across the bottom of the preview marking key-moment positions and current playback. The film's structural skeleton, made visible. |
| **Date stamp** | enabled | The current frame's date in editorial format (e.g., "14 Mar 2026"). Anchors the visual to time. |
| **Source attribution** | enabled | The data source line at the very bottom of the frame (e.g., "NOAA OISST · North Atlantic · OceanCanvas"). Required by the *citation-travels* promise — every exported frame carries its provenance. |
| **Pull quote** | disabled | An editorial quote inset on selected frames. For when the artist wants narrative voice in addition to data. |
| **Projection ghost** | disabled | An overlay of the next-decade projection rendered with reduced opacity over recent frames. For showing implied futures. |

The default-enabled set is the editorial baseline: counter + anomaly + date + attribution gives every frame a complete data identity. Record flash + sparkline + ribbon + named events add narrative. Pull quote and projection ghost are deliberate creative choices, not defaults — they're tools for specific stories, not standard equipment.

### The shared key-moment signal

The audio's swells and the overlays' record flashes do not coordinate by accident. They consume the same per-frame intensity signal produced by RFC-007's key-moment detection. When SST anomaly peaks at frame 348, RFC-007 returns intensity ≈ 1.0 at frame 348. Audio crossfades to its peak stem at frame 348. Record-flash overlay fires at frame 348. Timeline ribbon marker is at frame 348. Anomaly indicator hits its highest contrast colour at frame 348. *One signal, four points of expression.* That synchronicity is the whole reason the Video Editor exists as a coherent surface — without it, audio is decoration and overlays are clutter.

## The sharpest threat

**The audio and overlays read as decorative rather than data-bearing.**

If a viewer plays the export and concludes "nice ambient music, pretty annotations," the surface has failed at its job. The product's promise is that the music and the overlays *are the data*, surfaced through a different sense or a different channel. The whole architectural decision to share the key-moment signal between audio and overlays exists to defeat this threat. So does the constraint that audio is generated at export from the data scalar (not a stock soundtrack), and that overlays are computed per-frame from the time series (not pre-rendered editorial graphics).

What kills the threat: a viewer noticing — even unconsciously — that the music swells at exactly the moment "+1.7°C" appears on screen. What feeds the threat: stock-feeling music, generic overlay aesthetics, key-moment markers that don't match what's audible. Hence: RFC-006's stem-based architecture must be tested against this; UXS-005's overlay set must avoid generic data-vis tropes; the key-moment detection (RFC-007) must produce moments that are *audibly* and *visually* distinguishable from non-moments.

## What this is not

The Video Editor is not a video editing tool. There is no timeline-editor multi-track interface where the user trims clips, splices, adjusts levels. The artist's creative work is captured in the *recipe* — by the time they reach the Video Editor, the visual story is already told. The editor is *enrichment* and *assembly*, not editing.

The Video Editor is also not a music studio. The user does not pick chord progressions, instruments, or effects. They pick *editorial controls* (theme, energy arc, sensitivity) — the equivalent of choosing a film score's mood, not composing it. Generation is delegated to the audio system (RFC-006).

## Open threads

- **Audio API choice.** RFC-006 has Mubert and Beatoven as the candidates; the choice is open. Affects pricing and stem quality but not the surface design.
- **Local stem fallback.** RFC-006 specifies a self-hostable fallback path when the commercial API is unavailable. The exact stem catalog is undefined.
- **Pull quote sourcing.** When the Pull quote overlay is enabled, where does the quote come from? Manually authored per recipe? Selected from a curated source library? Phase 2 question.
- **Projection ghost data source.** The Projection ghost overlay needs a *projection* dataset (e.g., CMIP6 ensemble means). Not in the OC-03 catalog yet. Phase 2.
- **Export formats beyond MP4.** GIF for embeds. WebM for the open web. 4K resolution for installations. Each is a separate trade-off — kept off the v1 list to ship.
- **Sharing and embeds.** A timelapse export is meant to live elsewhere — Twitter, Bluesky, Instagram, blog posts. The export carries citation in its overlays; whether OceanCanvas also produces a *landing page* for each export is a Phase 2 question.

## Related work

- **PRD-001 Recipe** — the authored work the timelapse is *of*.
- **PRD-004 Gallery** — the entry point to the video editor (per IA, via `timelapse ↗` actions on hero and grid cards).
- **UXS-005 Video Editor** — the visual contract for everything described here.
- **RFC-006 Audio system** — the technical proposal for stem-based crossfading driven by data.
- **RFC-007 Key moment detection** — the signal both audio and overlays consume.

---

## Changelog

- **v0.2 · April 2026** — Added explicit overlay enumeration per UXS-005's surfacing of the prototype's concrete overlay list. Promoted "the overlays" from prose mention to its own listed section with default states. Refined the sharpest-threat paragraph to tie back to specific RFCs (006, 007) and the UXS. No structural changes to the argument.
- **v0.1 · April 2026** — Initial blog-post-format draft, replacing the earlier numbered-FR format. Folded audio + overlay enrichment into a single Video Editor PRD. Superseded by v0.2.
