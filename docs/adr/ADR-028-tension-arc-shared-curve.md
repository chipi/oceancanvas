# ADR-028 — Tension arc as shared primitive

> **Status** · Accepted
> **Date** · 2026-05-04
> **TA anchor** · §components/render-system · §contracts/recipe-yaml · §contracts/render-payload
> **Related RFC** · RFC-011 (closes)
> **Related PRD** · PRD-006 (the user-value argument this ADR serves)

## Context

PRD-006 argued that v0.4.0 ships image and audio that follow the data in parallel, not together — and that one authored curve over the video duration shaping both dimensions in unison turns a render-with-soundtrack into a piece. RFC-011 framed the open technical question — how to make the tension arc a single source of truth for audio modulation, ffmpeg filter keyframing, and rate scheduling — and proposed a preset+parameters YAML schema with shared TS↔Py expansion logic.

Phase 1 implementation (issues #75–#83) shipped end-to-end with no schema surprises; the proposal stands.

## Decision

The tension arc is a **single shared primitive** authored once per recipe and consumed identically by three independent systems: the browser audio engines, the pipeline synthesis (`audio.py`), and the ffmpeg filter graph (`video.py`).

### Recipe schema

The recipe YAML carries a `tension_arc:` block beneath the creative-controls marker:

```yaml
# ⊓ creative controls ⊓
render: ...
audio: ...
tension_arc:
  preset: classic           # classic | plateau | drift | invert | none
  peak_position: 0.65       # 0–1 fraction of duration
  peak_height: 1.0          # 0–1 maximum value
  release_steepness: 0.7    # 0–1 post-peak drop sharpness
  pin_key_moment: true      # if true, peak relocates to the dominant moment frame
```

The block is optional. Recipes without a `tension_arc:` block (or with `preset: none`) get a constant 1.0 array — preserving v0.4.0 baseline dynamics exactly.

### Five preset shapes

Implemented identically in `gallery/src/lib/tensionArc.ts` and `pipeline/src/oceancanvas/arc.py`:

- **classic** — quadratic ease-in to peak, ease-out after. Default.
- **plateau** — early ramp, sustained plateau, late drop.
- **drift** — undulating, no clear peak (1.5 cosine cycles over duration).
- **invert** — classic mirrored across the time axis.
- **none** — constant 1.0 (opt-out).

Three shaping parameters control all of them: `peak_position`, `peak_height`, `release_steepness`. `pin_key_moment` (when paired with a non-null dominant moment frame) overrides `peak_position` to align the peak with that frame.

### Cross-validated expansion

`expandArc(spec, totalFrames, dominantMomentFrame)` (TS) and `expand_arc(spec, total_frames, dominant_moment_frame)` (Py) produce identical output arrays within 1e-9 tolerance for every fixture case (`tests/cross-validation/tension_arc_fixtures.json`, 18 cases). Both implementations are pure functions; same recipe + same inputs always produce the same arc array.

### Distribution through the payload

The tension-arc **spec** (not the expanded array) round-trips through `OceanPayload.recipe.tension_arc`, mirroring how `recipe.audio` is handled. Each consumer expands the spec at use time:

- **Browser audio engine** — `useGenerativeAudio` calls `expandArc()` once per (spec, totalFrames, dominantMomentFrame) change, forwards the array to `setTensionArc(arc)`. SynthEngine and AmbientEngine multiply per-frame layer gains by `arc[frame]`.
- **Pipeline export** — `oceancanvas export-video` calls `expand_arc()` once at start, passes the array to `build_audio_track(arc=...)` and `assemble_video(tension_arc=...)`.

Storing the spec rather than the expanded array avoids inflating per-frame render payloads with hundreds of redundant floats. The render payload stays per-frame; the arc is per-video, expanded at the consumer that knows the right `totalFrames`.

### Audio engine consumption

Both `SynthEngine` and `AmbientEngine` implement `setTensionArc(arc: number[])` on the shared `AudioEngineInterface`. Inside `setFrame()`, the per-frame layer gains multiply by `arcAt(arc, view.frame)` alongside the existing `channelScale(mix, …)` and master volume multipliers. The `arcAt` helper returns 1.0 for empty/out-of-bounds inputs so missing arcs are a no-op.

### Visual coupling — ffmpeg filter graph

`video.py` `_build_arc_chain` emits a `sendcmd`-driven filter sub-chain at 1Hz keyframes:

- `eq=saturation = 1.0 − 0.35 × arc[t]` — image cools toward the peak.
- `vignette=angle = π/5 − π/15 × arc[t]` — vignette tightens toward the peak.

The filter graph length is bounded by duration in seconds (one keypoint per second), keeping ffmpeg invocations practical for arbitrarily long timelapses.

### Record Moment hold

When `pin_key_moment: true` and a dominant moment frame exists, the export holds that frame for ~1 second:

- The concat file gives the held frame a `duration` of `1/fps + 1.0` seconds — the visual lingers.
- `build_audio_track` `_inject_hold` extends the per-frame inputs (values, dates, arc, moments) by `1.0 × fps` copies of the held frame's data, AND returns a per-frame `hold_mask` marking the inserted frames.
- `_synth_pulse` and `_synth_accent` skip firing on held frames — the sequence stops, no new accents trigger.
- `_synth_texture` zeros its envelope on held frames — the noise layer mutes; per-sample interpolation provides natural fade at the boundaries.
- The drone holds full through the held window — that's PRD-006's "single sustained note" gesture.
- The bell that fires at the moment frame itself (which is NOT inside the hold mask) rings out naturally into the held seconds — its sample plays through after firing because the bus gain stays constant.

Browser preview applies the same gesture for the equivalent span (`fps` frames after the moment) via the engines' `setHoldMask(mask)` method. Audio and video drift slightly during preview because the browser doesn't extend playback, but the gesture is audible and matches what the exported MP4 plays.

Both extensions happen at the same index; total export duration grows by exactly 1 second.

## Rationale

**One curve, three consumers.** The arc is the load-bearing primitive for v0.5.0's audio-video coupling. Storing it once (spec in YAML), expanding via shared cross-validated logic, and distributing the expanded array via in-process method calls (rather than re-expanding per consumer) eliminates the duplicated-curve risk RFC-011 set out to defeat.

**Spec, not array, in the payload.** v0.4.0's `recipe.audio` block carries the same compactness pattern. Both audio and arc are per-recipe (or per-video) concerns; the per-frame render payload is the wrong shape to carry per-video data. Storing the spec keeps the payload small, lets each consumer expand with its own `totalFrames`, and matches the existing precedent.

**Sync-preserving Record Moment hold.** The held-moment gesture must read in both dimensions at once or it collapses into a "fancy fade" (PRD-006's sharpest threat). Extending both video (concat duration) and audio (synthesis injection) at the same frame index keeps them frame-aligned without resorting to setpts tricks that would desync under `-shortest`.

**Determinism.** Visual renders remain byte-identical (constraint preserved). Synthesised WAV is byte-identical for the same inputs (`test_audio.py::test_arc_none_equals_arc_ones` and `test_same_inputs_same_output`). AAC encode through ffmpeg may produce non-byte-identical MP4 audio across versions — the "perceptually identical" concession from ADR-027 carries forward.

## Implementation notes

- TS expansion: `gallery/src/lib/tensionArc.ts`, `gallery/src/lib/tensionArc.test.ts`
- Py expansion: `pipeline/src/oceancanvas/arc.py`, `pipeline/tests/unit/test_arc.py`
- Cross-validation fixture: `tests/cross-validation/tension_arc_fixtures.json` (18 cases)
- Fixture generator: `scripts/build-tension-arc-fixtures.mjs` (single source of truth for expected arrays; re-run when curve formulas change)
- Recipe migration: `scripts/migrate-recipes-arc.mjs` (idempotent; default `tension_arc: classic` + `pin_key_moment: true`)
- Audio engine arc consumption: `audioEngine.ts`, `audioEngineAmbient.ts`, `audioEngineTypes.ts::arcAt`
- Pipeline arc consumption: `audio.py::build_audio_track` (`arc`, `hold_at_frame`, `hold_duration_sec` params)
- ffmpeg filter chain: `video.py::_build_arc_chain` and `_build_filters`
- Record Moment hold: `video.py` (concat duration) + `audio.py::_inject_hold`
- ArcEditor UI: `gallery/src/components/ArcEditor.tsx`
- Visualizer overlay: `gallery/src/components/AudioWaveform.tsx` (arc + currentFrame props)

## Open follow-ups

- **e2e coverage.** Cross-validation + unit determinism are in. A full Docker Compose e2e exercising the held-moment behaviour end-to-end is left as v0.5.x polish; the live exports verified the path manually.
- ~~**Audio "drop to drone only" at the held moment.**~~ Implemented as part of this ADR via the `hold_mask` plumbing: pulse + accent skip new firings during hold, texture mutes, drone holds full, accent bell fired at the moment frame rings out naturally. PRD-006's lede gesture lands.
- **Modal scales.** PRD-007 candidate. The arc shapes dynamics; modes shape pitch space. Different RFC.
- **Other timeframe-mixing video formats.** Ghost accumulation, temporal split, etc. (per the Video×Audio Creative working notes). Each is its own PRD; all build on the arc primitive locked here.
