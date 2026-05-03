# PRD-006 — The piece

> **Status** · Draft v0.1 · May 2026
> **Sources** · OC-02 §Surface 4 · OC-04 §Video editor · OC-05 §Video editor
> **Audiences** · artist, climate-communicator, curious-person (PA §audiences)
> **Promises** · *grounded*, *editorial-dignity*, *accumulation* (PA §promises)
> **Principles** · *aesthetic-traces-to-data*, *determinism*, *data-is-hero* (PA §principles)
> **Why this is a PRD** · v0.4.0 ships generative audio that follows the data and a Video Editor that exports an MP4. The two follow the data in parallel, not together. Whether shaping image and sound from a single authored curve changes what the daily render *is* — turns a render-with-soundtrack into a piece — is a product judgment, not an export-format decision.

---

A friend opens the Gulf Stream timelapse you exported last Tuesday. The opening minute breathes — colour neutral, the music a low pad. Around the forty-second mark the saturation lifts perceptibly, the vignette tightens, the arpeggio quickens; you watch them lean in without noticing why. At fifty-three seconds — the frame the data crossed *+1.7°* in 2023 — the image holds. The pad drops to a single note. The room goes quiet for a full beat. Then the colour returns, the music releases, the timelapse runs out the rest of the year. Your friend does not say *nice soundtrack*. They say *what was that moment?*

## The problem

v0.4.0 shipped generative audio that follows the data, and a Video Editor that bundles image and sound into a single MP4. But the two follow the data in parallel, not together. The visual track is a stream of frames driven by the data's geography; the audio is a stream of layered synth voices driven by the data's intensity. They share inputs. They do not share a *shape*. Watching an export back, the sound and the image arrive at the same moments but neither reaches *for* the other. The piece reads as a render with a soundtrack, not as a piece.

There is a deeper version of the problem. A timelapse compressing 534 monthly frames into 45 seconds has emotional architecture available to it that a static render does not — build, peak, release. When the audio engine has a built-in arc and the visual filter graph does not, the engine is the only thing performing structure, and the piece feels half-composed. Either both dimensions get a shape, or neither should pretend to.

## The experience

She opens the Video Editor on the Gulf Stream recipe. Beside the mixer she finds an arc editor — a small curve over the timeline showing where tension peaks and how it resolves. The default is *Classic*: a gentle build through two-thirds of the duration, a peak, a release. She drags the peak to align with the 2023 record marker on the timeline ribbon. The visualizer above the canvas paints the arc as a faint guide line. She hits play.

The pad's amplitude builds with the curve. The arpeggio gets denser as the arc rises. The video's saturation lifts in parallel, the vignette tightens. At the record frame the curve hits its peak — and the engine pins it there for a beat. The video holds. The audio reduces to a single sustained note. A second of stillness, in both dimensions, in unison. Then the curve releases and the piece runs out the year.

She switches the preset to *Plateau* — the curve flattens. The piece reads differently: less anticipation, more sustained presence. She picks *Drift* — the curve undulates without resolving. The same recipe, three different pieces. The data has not changed. The shape has.

## Why now

v0.4.0 finished the synthesis foundation: four-layer generative engine, multi-engine architecture, recipe-authored audio character, deterministic export. The arc is the smallest move that turns synthesis-plus-pipeline into a single composed thing. It does not require new data, new sources, or a foundation rewrite. It requires one shared curve consumed in three places — the audio engine, the ffmpeg filter graph, the rate scheduler.

Without the arc, every subsequent musicality investment — modal scales, FM synthesis, granular textures — lands inside a piece that has no shape. With the arc, those investments land inside a designed structure. The arc is the load-bearing primitive that the rest of the next milestone builds on top of.

## Success looks like

- A viewer describes a timelapse with a verb of feeling before a verb of recognition. They say *it built up to that moment* before they articulate what the data was doing.
- The same recipe with three different arc presets produces three different pieces. The shape is editorial; the data is fixed.
- At a record frame, image and audio hold *together*. A viewer registers the held breath without prompting.
- The arc lives in one source of truth — recipe YAML — and the video, audio, and rate scheduler all consume the same per-frame array. No drift between dimensions.

## Out of scope

- **Modal scales.** PRD-007 candidate. The arc shapes dynamics; modes shape pitch space. Both eventually; one fits in this milestone.
- **FM synthesis, granular textures, additive layering.** The synthesis ceiling has not yet been hit; the arc operates above the engine.
- **Multi-frame video compositing.** Ghost accumulation, temporal echo, temporal split, long-exposure blend, rewind. Each is a separate piece of pipeline work — Phase 4 PRDs when reached.
- **LFO-driven vignette pulse, mode-driven LUT grading, grain-driven frame jitter.** Each is a small ffmpeg addition that layers on top of the arc primitive once it exists. Defer until the arc has shipped and the visual coupling vocabulary is established.
- **Tone.js migration.** Orthogonal to the arc. Decided separately if the synthesis ceiling becomes the bottleneck.

## The sharpest threat

**The arc reads as a fancy fade.**

The visual side of the coupling — saturation drift, vignette tightening — risks looking like an Instagram filter rather than a designed gesture. The audio side risks reading as ambient music with louder sections. The point of the arc is that the *coupling* makes the gesture legible: image holds, audio holds, both at once, deliberately. If the held moment fails to register because the visual change is too subtle or the audio drop is too gradual, the whole frame collapses into *render with effects*.

Counter-evidence we want: a viewer naming the held moment unprompted, or describing the rhythm of the piece without referencing data values. What kills the threat: the held moment being legible enough that it reads as authorship. The arc has to feel like a decision, not a setting.

## Open threads

- **RFC-011 — Tension arc as shared primitive.** Architecture for the audio engine, ffmpeg filter graph, and rate scheduler to consume the same array deterministically. Closes into ADR-028 once implementation forces the decision.
- **UXS-005 update.** The Video Editor surface contract gains the arc editor block.
- **PRD-007 — Modal scales.** Audio musicality, second pass. Drafts after this PRD reviews.
- **Phase 4 PRDs.** Timeframe-mixing pieces (ghost accumulation, temporal split, rewind). Each is its own PRD when the time comes; all of them build on the arc primitive locked here.

## Links

- **Source** — research input from the v0.4.0 retrospective working notes (not committed)
- **PA** — §audiences (artist, climate-communicator, curious-person) · §promises (grounded, editorial-dignity, accumulation) · §principles (aesthetic-traces-to-data, determinism, data-is-hero)
- **Related PRDs** — PRD-005 Video Editor (the surface this PRD extends)
- **Related RFCs** — RFC-011 Tension arc as shared primitive (the technical close)
- **Foundation** — RFC-010 → ADR-027 (generative audio, v0.4.0)
