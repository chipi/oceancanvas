# PRD-005 — Video Editor

> **Status** · Draft v0.3 · April 2026 (supersedes v0.2 — reshaped to match PRD template)
> **Sources** · OC-02 §Surface 4 · OC-04 §Video editor · OC-05 §Video editor
> **Audiences** · climate-communicator, artist (PA §audiences)
> **Promises** · *accumulation*, *citation-travels*, *editorial-dignity* (PA §promises)
> **Principles** · *aesthetic-traces-to-data*, *attribution-baked-in* (PA §principles)
> **Why this is a PRD** · A timelapse turns daily-render accumulation into something a person can actually *show* someone. Whether the result feels like data brought to life — or like a slideshow with music — is a product judgment, not an export-format decision.

---

You scrub the timeline back to August 2022. The thermal field on your *North Atlantic Drift* recipe is the deepest coral the palette can render. The audio panel says *Record high · fr. 348*. You toggle the four default overlays — they are already on. You hit *export MP4*. Thirty seconds later the file is on disk. You watch it back: the music swells exactly when *+1.7°* hits the screen, and a record flash pulses in the same beat. The year of the ocean compresses into thirty seconds, and the moment the data peaks, the film knows.

## The problem

A recipe accumulates a frame a day. Three months in, you want to show someone what *North Atlantic Drift* has been doing. The fourteen-day strip in the gallery is too short. Scrolling through ninety individual renders is not a viewing experience. To make a film of the year, you would have to assemble it elsewhere — Premiere, ffmpeg, hand-built — and along the way you would lose the data attribution, the per-frame editorial framing, and the synchrony between what the data did and what the film says.

There is also a deeper version of the problem. When a year of ocean data is set to ambient music and titled with editorial overlays, the result *feels* like climate communication. But ambient music is decoration unless it is structurally connected to the data. A timelapse with a stock soundtrack is a slideshow. A timelapse with music that swells at the precise frame the anomaly peaks is a piece of work. The difference is invisible from the outside and total from the inside.

## The experience

You open the video editor for *North Atlantic Drift* — the gallery's `timelapse ↗` action drops you straight in. The preview takes the upper-left of the screen with the recipe's frames already animating at twelve frames per second. On the right, three sections: Sequence, Audio, Overlays.

You glance at Audio. The system has already detected three key moments in the year — *El Niño peak fr. 54*, *Record high fr. 348*, *Acceleration fr. 378*. Each is colour-coded. You pick a theme — *Ocean*. You set the energy arc — *builds throughout*. You leave sensitivity on *reactive*. You do not pick chord progressions, instruments, or effects. You pick mood and let the system score the rest.

You glance at Overlays. Eight are on by default — primary counter, anomaly indicator, named events, record flash, sparkline, timeline ribbon, date stamp, source attribution. Two are off — pull quote, projection ghost. The defaults give every frame a complete data identity; the off-by-default ones are deliberate creative choices. You leave them off.

You click *export MP4*. Thirty seconds. The file lands on disk: a year of ocean, scored to music, annotated with editorial dignity, ready to post anywhere. You watch it back. At frame 348, the music intensifies, the screen says *+1.7°*, the record flash pulses. The data and the feeling arrive at the same instant. They were never going to drift, because they came from the same signal.

## Why now

Recipes accumulate from the day they are created. A recipe authored in March 2026 has a year of frames by March 2027 — the timelapse becomes interesting around the three-month mark, useful around the six-month mark, and the project's most shareable artefact by the twelve-month mark. Without the video editor, that accumulation has nowhere to go. The gallery shows the work; the timelapse *moves* it.

The video editor is also the surface that does the most to take OceanCanvas's work *out* of OceanCanvas. A render lives at a URL; a timelapse is an MP4 that lives anywhere a video can play. For climate communicators in particular, the export is the format that gets used. Without it, the project's reach stops at the gallery URL.

## Success looks like

- A viewer of the export feels the music swell at the same instant a record value appears on screen — and cannot articulate why the moment landed.
- A climate communicator uses an exported timelapse in a deck or a post without modification. Citation, attribution, anomaly framing all already there.
- An artist watching their own year-long timelapse describes it as *the piece* rather than *the export*.
- The audio reads as part of the data, not part of the production. If a viewer thinks "nice soundtrack" but not "the music *is* the data," the surface has missed.

## Out of scope

- Recipe authoring. PRD-003 (Recipe Editor) holds that. By the time someone reaches the video editor, the visual story is already told.
- Frame-by-frame video editing. No multi-track timeline, no clip splicing, no levels mixing. The video editor is *enrichment* and *assembly*, not editing.
- Music composition. No chord progressions, no instrument selection, no effect chains. The user picks editorial controls (theme, energy arc, sensitivity); generation is delegated to RFC-006's audio system.
- Hosting the export. The MP4 lands on disk; sharing happens elsewhere. (A landing page per timelapse is a Phase 2 question.)
- Export formats beyond MP4. GIF, WebM, 4K — each is a separate trade-off, kept off the v1 list to ship.
- Pull quote sourcing and projection ghost data. Both overlays are off by default; their content sources are Phase 2 questions.

## The sharpest threat

**The audio and overlays read as decorative rather than data-bearing.**

If a viewer plays the export and concludes *nice ambient music, pretty annotations*, the surface has failed at its job. The product's promise is that the music and the overlays *are the data*, surfaced through a different sense or a different channel. The whole architectural decision to share the key-moment signal between audio and overlays exists to defeat this threat — same per-frame intensity signal feeds the audio's swells, the record flash, the timeline ribbon markers, and the anomaly indicator's contrast peaks.

What kills the threat: a viewer noticing — even unconsciously — that the music swells at exactly the moment *+1.7°* appears on screen. What feeds the threat: stock-feeling music, generic data-vis overlay aesthetics, key-moment detection that produces moments which are not actually audible or visually distinguishable from non-moments. The risk is highest at the audio side; the overlay side is more visually obvious. RFC-006's stem-based architecture and RFC-007's detection threshold both have to land or the frame collapses into "slideshow with music."

## Open threads

- **RFC-006 — Audio system.** Stem-based crossfading driven by data. Mubert vs Beatoven choice still open. Self-hostable fallback path required.
- **RFC-007 — Key moment detection.** The shared signal both audio and overlays consume. Threshold definitions, user-facing moment names, false-positive handling.
- **UXS-005 — Video Editor.** Static visual contract. Already enumerates the ten overlays (eight default-on, two deferred).
- **ADR — Audio API choice.** Closes once RFC-006 lands.
- **Phase 2 — Pull quote and projection ghost.** Both overlays exist as toggles in v1 but their content sources (curated quote library, CMIP6 projection dataset) are Phase 2.

## Links

- **Source** — OC-02 §Surface 4 · OC-04 §Video editor · OC-05 §Video editor
- **PA** — §audiences · §promises · §principles
- **Related PRDs** — PRD-001 Recipe (the work the timelapse is *of*) · PRD-004 Gallery (the entry point — `timelapse ↗`)
- **Related UXS** — UXS-005 Video Editor (visual contract, overlay enumeration)
- **Related RFCs** — RFC-006 Audio system · RFC-007 Key moment detection

---

## Changelog

- **v0.3 · April 2026** — Reshaped to match PRD template (consistent with PRDs 001–004). Replaced `PA anchor` / `IA anchor` / `Status moves to Implemented when` metadata block with template-shape header (Sources · Audiences · Promises · Principles · Why this is a PRD as a sentence). Added magazine-lede opening paragraph. Replaced "What changes for the person" + "The body of the argument" with template sections (The problem · The experience · Why now · Success looks like · Out of scope). Removed the ten-row overlay enumeration table — UXS-005 is the canonical home for that specification; PRDs argue, UXSes specify. Argument unchanged.
- **v0.2 · April 2026** — Added explicit overlay enumeration. Promoted "the overlays" from prose mention to its own listed section with default states. Refined the sharpest-threat paragraph to tie back to specific RFCs (006, 007) and the UXS. Superseded by v0.3.
- **v0.1 · April 2026** — Initial blog-post-format draft, replacing the earlier numbered-FR format. Folded audio + overlay enrichment into a single Video Editor PRD. Superseded by v0.2.
