# RFC-011 — Tension arc as shared primitive

> **Status** · Decided · closes into [ADR-028](../adr/ADR-028-tension-arc-shared-curve.md)
> **TA anchor** · §components/render-system · §contracts/recipe-yaml · §contracts/render-payload · §constraints
> **Related** · PRD-006 The piece · ADR-027 Generative audio composition · ADR-008 Shared payload format · ADR-024 Key moment detection
> **Closes into** · [ADR-028](../adr/ADR-028-tension-arc-shared-curve.md) (locks the arc representation, expansion logic, and consumer protocol)
> **Why this is an RFC** · The tension arc has to be authored once in the recipe and consumed identically by three independent systems — the browser audio engines, the pipeline audio synthesis, and the ffmpeg filter graph that keys the visual filters. How it is represented in YAML, where it is expanded into a per-frame array, and how that array reaches each consumer all have plausible alternatives with real trade-offs.

---

## The question

PRD-006 calls for a single authored curve — a *tension arc* — that shapes audio dynamics and visual filter values in unison across the duration of a video. The curve is the load-bearing primitive: pad amplitude, sequence density, ffmpeg `eq=saturation`, `vignette` intensity, and rate-of-playback at flagged key moments all derive from it.

The architectural question is **how that one curve is authored, expressed, and distributed** so the audio engine, the pipeline synthesis, and the ffmpeg filter graph all see the same shape without recomputing it differently. The arc has to round-trip cleanly through ADR-008's payload, has to be cheap to author (the editor needs live preview), and has to be deterministic (the same recipe + same date must produce the same arc array down to the float).

Three forces apply: the curve must be **author-friendly** (a recipe author should not write 534 floats), **transmissible** (it has to fit in YAML and survive the payload pipeline), and **expansion-deterministic** (TS and Python expansions must produce byte-identical arrays for parity).

## Use cases

1. **Live editing.** The author opens the Video Editor, drags an arc-peak handle, and immediately hears the audio rebalance and sees the visualizer overlay update. No pipeline round-trip; the browser computes the arc array on the fly.
2. **Pipeline export.** `oceancanvas export-video` reads the recipe, expands the arc to a per-frame array, feeds it to `audio.py` for amplitude modulation and to `video.py` for ffmpeg filter keyframing. Same expansion logic as the browser; cross-validated.
3. **Key moment pinning.** The dominant key moment from `moments.py` (the all-time record, typically) becomes a peak of the arc regardless of what the author chose, so a Record Moment hold lands on a real significant frame even when the arc preset is *Drift* or *Plateau*.
4. **Future consumers.** Modal scales (PRD-007) will modulate density along the arc. Phase 4 video formats (ghost accumulation, temporal split) read the arc to drive opacity and split-line softness. The primitive has to support consumers that do not exist yet.

## Goals

- A single representation in recipe YAML — author-friendly enough to edit by hand, expressive enough to cover the four preset shapes named in the Creative doc (Classic / Plateau / Drift / Invert).
- Deterministic expansion to a per-frame `arc[]: number[0..1]` array. Same recipe + same dates + same key moments → byte-identical arc array.
- Cross-validation parity. TypeScript expansion (browser) and Python expansion (pipeline) produce identical arrays for every recipe.
- One source of truth. The arc is computed once per consumer, not duplicated across audio.py and video.py and tensionArc.ts.
- Cheap to interpolate. Audio modulates per-frame; ffmpeg keyframes at a sampled rate. Both have to be efficient.
- Does not bloat the recipe. The arc adds at most a small typed block; not a 534-float array.
- Forward-compatible. Future consumers (modal density, ghost opacity, temporal split softness) plug into the same array without schema changes.

## Constraints

- **File-based YAML storage** (TA §constraints). No database; arc parameters live in the recipe file alongside `render:` and `audio:`.
- **Shared payload format** (ADR-008). The arc array has to round-trip through the render payload because the browser preview and the pipeline both need it; whatever shape the YAML stores must serialize cleanly into the payload.
- **Deterministic rendering** (TA §constraints). Visual frames remain byte-identical for the same recipe + data + date; the arc must not introduce non-determinism. Audio is "perceptually identical" per ADR-027.
- **Daily cadence** (TA §constraints). Expansion must be cheap enough to run as part of the once-daily pipeline render without measurable overhead.
- **Self-hostable** (TA §constraints). No remote curve-rendering services; expansion happens locally in the pipeline and the browser.

## Proposed approach

### Recipe schema — preset + parameters

The recipe stores a typed `tension_arc:` block with a preset name and a small number of shaping parameters:

```yaml
# ⊓ creative controls ⊓
render:
  type: field
  colormap: thermal
  ...
audio:
  drone_waveform: triangle
  ...
tension_arc:
  preset: classic           # classic | plateau | drift | invert | none
  peak_position: 0.65       # 0–1 fraction of duration where the arc peaks
  peak_height: 1.0          # 0–1 maximum value the arc reaches
  release_steepness: 0.7    # 0–1 how sharply the arc drops after the peak
  pin_key_moment: true      # if true, peak position is overridden to align with the dominant key moment frame
```

`preset: none` opts out — the arc array is constant 1.0 across the duration, leaving v0.4.0's flat dynamics behaviour as the default for recipes that do not author one.

### Shared expansion logic — TS ↔ Py parity

A `tensionArc.ts` module in the gallery and an `arc.py` module in the pipeline both implement the same function:

```
expandArc(spec: TensionArcSpec, totalFrames: int, dominantMomentFrame: int | null) → number[totalFrames]
```

Both modules consume the same fixture file in `tests/cross-validation/tension-arc/` to assert byte-identical outputs for a battery of (preset, peak_position, peak_height, release_steepness, totalFrames, momentFrame) tuples. Same pattern as `creative_mapping_fixtures.json` for the audio mapping cross-validation that already ships in v0.4.0.

The four preset shapes are defined as parametric curves over `t ∈ [0, 1]`:

- **Classic** — `pow(t/peak_position, 2) * peak_height` for `t ≤ peak_position`; cubic ease-out scaled by `release_steepness` for `t > peak_position`.
- **Plateau** — early ramp, sustained plateau at `peak_height`, late drop. Two parameters (ramp duration, drop steepness) collapse onto `peak_position` and `release_steepness`.
- **Drift** — cosine wave around `peak_height * 0.5` with low frequency; no clear peak. `release_steepness` controls wave amplitude.
- **Invert** — Classic mirrored around the time axis. Starts tense, releases early.

When `pin_key_moment` is true and a dominant moment exists (highest-scoring event from `detect_moments`), the curve is recomputed with `peak_position` set to `momentFrame / totalFrames`. The peak is *guaranteed* to land on a real significant frame.

### Distribution — payload field

The expanded `arc[]` array travels through the render payload as a new optional field:

```json
{
  "version": 2,
  "recipe": {
    "id": "...",
    "audio": { ... },
    "tension_arc": [0.0, 0.02, 0.05, ..., 0.97, 0.94, ...]
  },
  ...
}
```

Pipeline `build_payload` task computes the arc once and serialises it. Browser `payloadBuilder.ts` mirrors. Audio engines and the ffmpeg filter graph both read the field, never re-expand.

### Audio engine consumption

Both `SynthEngine` and `AmbientEngine` gain a `setTensionArc(arc: number[]) → void` method on the existing `AudioEngineInterface`. Per-frame layer gains multiply by `arc[frame]` alongside the existing `channelScale(mix, ...)` and `mix.master` multipliers. Identical contract on both engines; downstream `ToneEngine` (if it ever ships) implements the same.

### ffmpeg filter graph consumption

The pipeline `video.py` `assemble_video` step samples the arc at 1Hz (one keypoint per second of output, regardless of fps) and emits `eq=saturation=expr` and `vignette=PI/4*expr` filter expressions with linear interpolation between keypoints. Rate slowdown via `setpts` triggered at the dominant moment frame: a 1-second `setpts=4*PTS` segment, framed by short ramps in and out. A 30s video gets ~30 keypoints; a 45s SST timelapse gets ~45 keypoints. Filter graph length stays bounded.

### How this closes

ADR-028 once Phase 1 implementation lands and the schema is locked. The ADR will name: the four preset shapes, the parameter ranges, the `pin_key_moment` semantics, the payload field name, and the engine interface signature.

## Alternatives considered

### Alternative — raw per-frame array in YAML

Recipe stores `tension_arc: [0.0, 0.02, 0.05, ...]` as a literal array of 365–534 floats. Expansion is identity.

Rejected. Authoring becomes hostile (no one hand-edits a 534-element list), version control diffs balloon, the arc cannot be parametrically tweaked from the editor without rewriting the entire array. The compactness goal collides with the author-friendliness goal.

### Alternative — control-points expanded only at runtime

Recipe stores N control points; expansion happens lazily at consumer time. The browser audio engine expands. The pipeline expands separately. ffmpeg gets keyframes from the pipeline expansion.

Rejected. Two consumers expanding independently is exactly the duplicated-curve risk the proposal exists to defeat. Even with shared cross-validated logic, expansion at the consumer is an integrity hazard if one consumer forgets to pin to the same key-moment frame the other did. Single-expansion-into-payload is the cleaner contract.

### Alternative — pipeline-only computation, payload-distributed

Pipeline expands the arc and writes it to the payload. Browser preview reads the payload. No expansion logic in the browser at all.

Rejected. The Recipe Editor and Video Editor both need *live* arc preview as the author drags the peak handle. A pipeline round-trip per slider tick is unworkable. The expansion has to live on both sides; cross-validation is the safety net.

### Alternative — Bezier curve with handles

Recipe stores Bezier control points; the editor exposes draggable handles for the curve.

Rejected for v1. Bezier handles are notoriously fiddly UI; the four named presets cover the cases the Creative doc identifies. If authors hit the expressive ceiling of preset-plus-three-parameters, a future RFC can introduce a `preset: custom` extension with explicit control points.

## Trade-offs

- **Recipe schema grows.** The `tension_arc:` block is one new top-level key under the creative-controls marker. Acceptable; matches the precedent set by `audio:` in v0.4.0.
- **Payload v2.** The arc becomes a payload field, bumping payload version. Existing v1 payloads continue to work; consumers default to constant 1.0 if the field is missing.
- **ffmpeg keypoint density.** 1Hz sampling caps complexity, but on long-duration timelapses (multi-minute) the filter graph still grows linearly. Acceptable for v1; if it becomes a bottleneck, the fallback is `sendcmd` reading from a sidecar file.
- **Cross-validation overhead.** Each new preset shape doubles the fixture surface. Manageable while there are four; revisit if the count exceeds eight.

## Open questions

- **Tone.js migration.** Orthogonal. The arc primitive works against any synthesis engine that implements `setTensionArc`. Decided in a separate RFC if and when the synthesis ceiling is reached.
- **Arc preset count.** Four shapes (Classic / Plateau / Drift / Invert) match the Creative doc's enumeration. If recipe authors consistently want a fifth shape, it is a one-line addition to the expansion module plus a fixture row.
- **Modal scales as a separate RFC.** Recommended. Modal scales modulate pitch space; the arc modulates dynamics. Different concerns, different mappings, different user-facing UI. RFC-012 candidate.
- **Visual-side filters beyond `eq` and `vignette`.** LFO-driven vignette pulse, mode-driven LUT, grain-driven jitter all layer onto the arc primitive. Each is a small follow-up; none belong in this RFC.

## How this closes

ADR-028 — *Tension arc as shared primitive.* Locks the preset-plus-parameters YAML schema, the cross-validated expansion logic, the payload-field distribution, the audio engine interface signature, and the ffmpeg keypoint-sampling protocol. Closes once a Phase 1 implementation forces the schema decision (likely once the editor and the pipeline both read and consume the array end-to-end).
