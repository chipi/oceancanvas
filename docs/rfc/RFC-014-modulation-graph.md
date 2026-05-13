# RFC-014 — Modulation graph: per-parameter breakpoint envelopes + embedded LFOs

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · RFC-010 Generative audio composition · RFC-011 Tension arc · RFC-012 Atmospheric audio · RFC-013 Editor controls · ADR-027 · ADR-028 (superseded by this RFC's closure)
> **Closes into** · ADR-032 (Modulation graph: envelope primitive + evaluation), ADR-033 (LFO embedding semantics + cross-validation)
> **Why this is an RFC** · RFC-011 locked a single shared curve — the tension arc — as the project's modulation primitive. RFC-012 just landed a five-layer audio system whose `atmosphere`, `vocal.presence`, `drone.presence`, and bus-level parameters all want to *breathe* over time in ways the four preset arc shapes cannot express. The technical question is whether to generalise the tension arc into a full per-parameter envelope primitive *now* (one RFC, one migration, one supersession) or to keep adding bespoke per-parameter curves alongside it. Once generalisation is chosen, real architectural questions remain — schema representation (named vs. inline envelopes), LFO embedding math (continuous vs. stepped depth), evaluation strategy (precomputed per-frame arrays vs. real-time evaluation), cross-validation fixture growth, and how tension_arc keeps its name in recipe YAML for editor clarity while becoming a special case underneath.

---

## The question

PRD-006 asks the audio to *breathe*. RFC-011 answered with a single tension arc — one curve, four preset shapes, parametric peak position and height — and it was the right answer at the time because the four-layer engine only needed one global dynamics modulator. RFC-012 just inverted that assumption: with five layers and an atmosphere bus, the parameters that want time-varying control are no longer all in lockstep. `atmosphere` wants a slow swell. `vocal.presence` wants a separate, even slower bloom. `drone.presence` wants to stay flat. `pulse_sensitivity` wants to ramp up at the midpoint and decay. The four arc presets cannot express this; layering four parallel arcs would re-introduce the duplication ADR-028 explicitly designed against.

The architectural question is **how to give every modulatable parameter its own time-varying curve, with deterministic evaluation, low authoring cost, and the same TS ↔ Py parity guarantee the tension arc has today.** Three sub-questions sit underneath:

- **Schema shape.** Envelopes inline in each param (cheap for one-offs, verbose when reused), named in a top-level `envelopes:` block (compact when reused, ceremony for one-offs), or both? Either choice constrains the editor UI and the round-trip diff weight.
- **LFO embedding.** Absynth's signature feature is per-breakpoint LFO depth — localised wobble on top of a long macro shape. The math has to be deterministic across browser and pipeline, and the depth has to interpolate sensibly between breakpoints (linear? cosine? stepped at each breakpoint?).
- **tension_arc's fate.** ADR-028 named tension_arc as *the* modulation primitive. Generalising it to envelopes supersedes ADR-028. The question is whether `tension_arc:` survives as a named alias in recipe YAML (preserving an evocative concept name for authors) or disappears entirely.

This RFC supersedes ADR-028 on closure. It is *not* paired with another RFC — but it forward-pays RFC-013's `modulation` prop on `<Knob>` (RFC-013 ships inert; RFC-014 lights it up) and threads through every RFC-012 audio parameter.

## Use cases

1. **Slow atmosphere bloom.** An author opens a five-minute ambient recipe, defines an envelope that takes `atmosphere` from 0.4 at the start to 0.8 by minute three, holds, and decays back to 0.5 by the end. The Knob shows the static set point and an animated arc indicating current value as the video plays.
2. **Vocal swell synchronised to data cadence.** A whale-shark tracks recipe uses an envelope on `vocal.presence` whose breakpoints are pinned to the dominant migration months — vocal blooms when the whale sharks aggregate, recedes during dispersal. The author drags the breakpoints in the envelope editor; the preview updates live.
3. **Breathing drone via embedded LFO.** A recipe wants the drone to feel alive without changing average level — `drone.presence` envelope holds 0.25 throughout, but per-breakpoint `lfo_depth` rises to 0.05 in the middle third (a slow wobble), then drops back to 0.0. Macro-stability + localised micro-motion on one timeline.
4. **Visual filter automation reused.** The same envelope that controls `atmosphere` audibly also drives `vignette` intensity visually — declared once in `envelopes:`, referenced from both `audio:` and `render:` blocks. Editor sees the link.
5. **tension_arc by name.** An author who wants the classic shape writes `tension_arc: { preset: classic, peak_position: 0.6 }` exactly as they do today; behind the scenes it resolves to a built-in envelope template. No re-authoring of the existing four preset shapes.

## Goals

- **One modulation primitive.** Every modulatable parameter (audio + visual) can be a scalar, a preset reference, or an envelope. The envelope primitive subsumes tension_arc; the four preset shapes become built-in templates.
- **Named + inline envelopes.** Top-level `envelopes:` block for reusable curves; inline literal envelopes for one-off cases. Both resolve to the same internal representation.
- **Embedded per-breakpoint LFO.** Each breakpoint carries optional `lfo_depth` and `lfo_hz`; the LFO interpolates between breakpoints so the wobble can intensify or calm along the curve. Deterministic phase (always starts at 0).
- **Precomputed per-frame arrays.** Envelopes expand once per render into `number[totalFrames]` arrays, distributed via the payload (same model as RFC-011). Audio engines and ffmpeg filter graphs read precomputed values; no real-time math.
- **TS ↔ Py parity.** Browser `envelopes.ts` and pipeline `envelopes.py` produce byte-identical output for every fixture. Cross-validation surface extends but stays tractable.
- **tension_arc kept by name.** Authors continue to write `tension_arc:`; the parser converts to the new envelope representation transparently. The named concept survives in recipe YAML and in the Video Editor's vocabulary.
- **Editor integration.** RFC-013's `<Knob>` `modulation` prop lights up: any param with an envelope renders the dual indicator (static set point + animated current). A new envelope-editor view exposes the breakpoint curve for editing.
- **Visual + audio scope.** Envelopes drive both — vignette, saturation, particle density, audio layer gains, atmosphere wet send. One primitive, two consumers.

## Constraints

- **Deterministic rendering** (TA constraints). Envelope evaluation is pure: same envelope + same totalFrames → byte-identical array. LFO phase is deterministic (starts at 0); no random component.
- **Cross-validated TS ↔ Py** (precedent set by ADR-027 + ADR-028). Both implementations consume the same fixture JSON; CI asserts byte-identical output across a battery of (envelope, totalFrames) tuples.
- **Recipe YAML as source of truth** (TA constraints). Envelopes live in the recipe file, either named or inline. No sidecar files.
- **Payload distribution** (ADR-008 + ADR-019). Expanded per-frame arrays travel through the render payload alongside the existing `tension_arc[]` field. Payload version bumps; backward compat handled per ADR-019.
- **Authoring cost** — non-negotiable from RFC-011. The four arc presets remain valid YAML. Envelope authoring uses the editor's new breakpoint UI, not hand-edited float arrays.
- **Performance** — envelope expansion runs once per render in the pipeline and once per recipe load in the browser. Per-frame audio path reads precomputed arrays; no per-sample envelope math. Browser bundle size impact ≤ 5KB gzipped for the envelope module.

## Proposed approach

### Schema — named + inline, both resolving to one shape

Top-level `envelopes:` block for reusable curves:

```yaml
envelopes:
  atmosphere_breath:
    interpolation: cosine            # default slope for breakpoints that don't override
    points:
      - { t: 0.0, v: 0.4 }                                              # uses envelope-level cosine
      - { t: 0.6, v: 0.8, slope_to_next: linear, lfo_depth: 0.2, lfo_hz: 0.15 }   # linear segment from here
      - { t: 1.0, v: 0.5 }
    loop:
      mode: tile                      # tile | sustain | none (default none)
      period_seconds: 30              # tile mode: repeat the entire envelope every N seconds
      # for sustain mode, use `section: [start_t, end_t]` instead — loops that subrange after first reaching it

  vocal_bloom:
    points:
      - { t: 0.0, v: 0.2 }
      - { t: 0.4, v: 0.6, slope_to_next: exponential }
      - { t: 0.7, v: 0.6 }                                              # plateau
      - { t: 1.0, v: 0.3 }

audio:
  identity: ambient
  atmosphere:
    envelope: atmosphere_breath       # named reference

  vocal:
    presence:
      envelope:                       # inline literal
        points:
          - { t: 0.0, v: 0.2 }
          - { t: 1.0, v: 0.5 }

  drone:
    presence: 0.25                    # scalar still works

  pulse_sensitivity: 0.30             # scalar
  accent_style: bell                  # enum

  tension_arc:                        # preserved by name; resolves to a built-in envelope
    preset: classic
    peak_position: 0.65
    peak_height: 1.0

render:
  vignette:
    envelope: atmosphere_breath        # same envelope, visual consumer
```

The polymorphism rule: any parameter that today accepts a number can accept either:

- A bare scalar (`0.25`)
- An inline envelope (`{ envelope: { points: [...] } }`)
- A named reference (`{ envelope: "atmosphere_breath" }`)
- (For audio parameters only) An enum string where the schema defines one — e.g. `accent_style: bell`

The parser normalises all three numeric forms to the same internal `Envelope` representation. Scalars become single-point envelopes (`[{t: 0, v: X}]`) so the evaluation path is uniform.

### Envelope evaluation

Given `Envelope { points: Point[], interpolation: "linear"|"cosine"|"exponential", loop?: LoopSpec }` and `totalFrames: int`:

```
for frame in 0..totalFrames:
    t_raw = frame / (totalFrames - 1)        // [0, 1] across the render

    # 0. Apply loop transform, if any, to derive the effective t inside the envelope shape
    t = applyLoop(t_raw, loop, totalDurationSeconds)

    # 1. Find the two breakpoints bracketing t
    (p0, p1) = bracketPoints(points, t)

    # 2. Base value via the slope assigned to p0 (or envelope-level default)
    u = (t - p0.t) / (p1.t - p0.t)
    slope = p0.slope_to_next ?? envelope.interpolation ?? "linear"
    base = interpolate(p0.v, p1.v, u, slope)

    # 3. Per-breakpoint LFO depth + hz, interpolated linearly between breakpoints
    depth = lerp(p0.lfo_depth ?? 0, p1.lfo_depth ?? 0, u)
    hz    = lerp(p0.lfo_hz    ?? 0, p1.lfo_hz    ?? 0, u)

    # 4. LFO contribution; phase deterministic from envelope start
    phase = 2 * pi * hz * t * totalDurationSeconds
    lfo   = depth * sin(phase)

    # 5. Final value, clamped to param range
    arr[frame] = clamp(base + lfo, paramMin, paramMax)
```

Per-breakpoint `slope_to_next` overrides the envelope-level `interpolation` for the segment from that breakpoint to the next — Absynth MSEG-style. Authors can mix curve types within one envelope: a hard linear ramp into a held plateau into an exponential decay, all in one envelope. Envelope-level `interpolation` remains as a default to keep the simple case simple.

LFO depth interpolation is linear between breakpoints — simpler than depth-curves, and the breakpoint density itself gives authors enough control over how depth changes along the curve. LFO `hz` interpolates the same way.

Phase is computed from `t * totalDurationSeconds` rather than `frame / fps` so the wobble rate is intuitive in Hz and does not subtly shift across recipes with different fps. Deterministic and fps-independent.

### Loop semantics

The optional `loop:` block lets an envelope repeat across long render durations without authoring every cycle by hand:

- **`mode: tile`** — the entire envelope (t=0 → t=1) is one cycle of length `period_seconds`. The cycle repeats from render start to render end. If `period_seconds * fps` doesn't divide totalFrames evenly, the final partial cycle is truncated.
- **`mode: sustain`** — the envelope plays normally from t=0 forward; on reaching `section[0]`, the subrange `section[0] → section[1]` repeats until the render approaches end, then resumes from `section[1] → 1.0` as the release. Direct port of Absynth's sustain-loop concept.
- **`mode: none`** (default if `loop:` absent) — envelope plays once across the full render.

`applyLoop` is deterministic: same inputs → same effective `t` per frame. Loop mode interacts with breakpoint slopes naturally — tile mode wraps the curve including the LFO phase reset at each cycle.

### Built-in envelope templates (tension_arc preset family)

The four ADR-028 preset shapes become built-in templates registered in `envelopes.ts` / `envelopes.py`:

```
TEMPLATES = {
  "classic":  (peak_position, peak_height, release_steepness) -> Envelope,
  "plateau":  (peak_position, peak_height, release_steepness) -> Envelope,
  "drift":    (peak_height, release_steepness) -> Envelope,
  "invert":   (peak_position, peak_height, release_steepness) -> Envelope,
}
```

The `tension_arc:` block in recipe YAML is parsed into a built-in template invocation, which produces the same `Envelope` shape any other path produces. The `pin_key_moment` behaviour from RFC-011 is preserved — the named template accepts a `dominantMomentFrame` parameter and overrides the breakpoint at `peak_position` accordingly.

This is what supersedes ADR-028: the tension arc is no longer a distinct primitive — it is a *named template* over the envelope primitive. Authors and the editor still see `tension_arc`; the engine sees an envelope.

### Distribution — payload v3

The render payload gains an `envelopes:` field — a map of parameter path → expanded per-frame array:

```json
{
  "version": 3,
  "recipe": { ... },
  "envelopes": {
    "audio.atmosphere":      [0.4, 0.41, 0.42, ..., 0.5],
    "audio.vocal.presence":  [0.2, 0.205, ..., 0.5],
    "render.vignette":       [0.4, 0.41, ..., 0.5],
    "tension_arc":           [0.0, 0.02, ..., 0.94, ...]
  }
}
```

Scalar params do not appear in `envelopes` — they are read from `recipe` directly. The `tension_arc[]` array remains under its name for backward compatibility with code that reads it; future code reads from `envelopes["tension_arc"]`.

Payload version bumps 2 → 3. v2 payloads continue to load (envelopes default to constant when missing). v3 payloads are not readable by v2 consumers, which is acceptable because the pipeline and the browser are versioned together.

### Audio engine consumption

Both `SynthEngine` and `AmbientEngine` gain `setEnvelopes(envelopes: Record<string, number[]>) → void`. Per-frame layer gains and bus sends look up their value as `envelopes[paramPath]?.[frame] ?? scalarFallback`. The existing `setTensionArc(arc)` interface is preserved as a thin wrapper for backward compatibility within RFC-014's transition window.

### ffmpeg filter graph consumption

The pipeline `video.py` already samples the tension arc at 1Hz for filter keyframing. The same path extends to every envelope under `render.*` — vignette, saturation, future filters land in the same keyframe protocol. Filter graph length stays bounded; one envelope per visual filter at 1Hz keypoint density.

### Editor UX

Two pieces:

- **Knob integration (RFC-013).** Any `<Knob>` whose parameter has an envelope receives a non-null `modulation` prop, which renders the dual indicator: static set point at the envelope's start value, animated arc following `envelopes[paramPath][currentFrame]` during playback. The Knob's drag still modifies the scalar fallback / envelope-start value; envelope authoring happens elsewhere.
- **Envelope editor view.** A new panel in the Video Editor lists named envelopes (from the `envelopes:` block) and allows: adding breakpoints, dragging breakpoints (time + value), setting per-breakpoint `lfo_depth` and `lfo_hz`, choosing interpolation type. Each Knob with an envelope gains a small "edit envelope" affordance opening the panel scoped to that parameter's curve.

A "scalar ↔ envelope" toggle on each Knob converts between the two representations: dropping a scalar to a single-point envelope (and back) is mechanical.

### Cross-validation

A `tests/cross-validation/envelopes/` fixture set carries (envelope, totalFrames, totalDurationSeconds, expected output) tuples. Browser `envelopes.test.ts` and pipeline `tests/unit/test_envelopes.py` both consume the same JSON, assert byte-identical output. CI gates the build on mismatch.

Initial fixture coverage:

- All four built-in templates (classic, plateau, drift, invert) at three duration scales
- Inline envelopes with 2, 5, 10 breakpoints
- LFO depth interpolation cases (depth 0 → max → 0, depth constant, depth stepped between adjacent breakpoints)
- Interpolation types (linear, cosine, exponential) for the same breakpoint set
- Edge cases (single-point envelope, breakpoints at exactly t=0 and t=1, two breakpoints at the same t)

## Alternatives considered

### Alternative — keep tension_arc as the only modulation primitive; add bespoke curves per param

For each new RFC-012 parameter that wants time-varying control, add a small curve schema (e.g. `atmosphere_envelope: {start, end, ramp_at}`). No generalisation; tension_arc stays the canonical modulator.

Rejected. Bespoke schemas multiply faster than parameters — each one re-invents interpolation, each one needs its own cross-validation fixtures, each one needs its own editor UI. Within five RFC-012 parameters that want envelopes the cost of bespoke curves exceeds the cost of one generalised primitive. Generalisation pays back almost immediately.

### Alternative — inline-only envelopes (no named block)

Envelopes always live inside the parameter they modulate; no top-level reuse.

Rejected. The intended use case explicitly includes the same envelope driving both an audio parameter (atmosphere wet send) and a visual filter (vignette intensity) coherently — Moments' core idea of "one knob, multiple consumers." Duplicating the envelope inline in two places means edits drift; the editor cannot show the linkage. Named envelopes cost a small schema addition; inline-only loses an important authoring affordance.

### Alternative — named-only envelopes (no inline)

Every envelope must be declared in `envelopes:`, even one-off uses.

Rejected. Many envelopes are genuinely one-off — a per-recipe vocal swell tuned to that recipe's specific data. Forcing ceremony for every envelope makes the recipe YAML noisier than it needs to be and discourages authors from using envelopes at all for small adjustments. Allow both forms; let authors choose.

### Alternative — real-time envelope evaluation (no precomputed arrays)

Browser audio engines and ffmpeg filters evaluate envelopes per-frame at runtime; nothing is precomputed in the payload.

Rejected. The tension arc precedent (RFC-011) is correct: precomputed arrays decouple authoring from evaluation, simplify cross-validation (compare arrays, not algorithm states), and let ffmpeg keyframe at its natural cadence without sub-frame math. The runtime cost of evaluation is trivial; the architectural cost of running it twice (browser + pipeline) is non-trivial. Precompute once, distribute, consume.

### Alternative — drop the `tension_arc:` name entirely; require explicit envelopes

After supersession, the only modulation primitive in the schema is `envelope`. `tension_arc` becomes invalid YAML.

Rejected. The tension_arc concept is evocative and well-understood — "the arc of tension across the piece" is a real authoring vocabulary that the editor uses, the docs use, and the user thinks in. Removing the name loses signal. Keeping it as syntactic sugar over a built-in envelope template costs nothing at the parser level and preserves the vocabulary.

### Alternative — LFO depth as a single global field per envelope, not per-breakpoint

Each envelope has one `lfo_depth` value that applies uniformly across the curve.

Rejected. The whole point of Absynth's per-point LFO is localised micro-motion — wobble that intensifies in the middle of a phrase and calms at the edges. A single global depth gives back the wobble but loses the shape control. The per-point cost is one optional field per breakpoint; the expressivity gain is large.

### Alternative — multiple LFOs per breakpoint (LFO bank)

Each breakpoint carries an array of `{depth, hz}` pairs allowing additive LFOs.

Rejected for v1. The audio identity work in RFC-012 does not yet have a use case for stacked LFOs at the same breakpoint; a single LFO is sufficient for the breathing/swelling motion the ambient identity wants. If a future RFC surfaces multi-LFO needs, the schema extends naturally — `lfo_depth` / `lfo_hz` become `lfos: [{depth, hz}, ...]`. Hold the simpler form for now.

## Trade-offs

- **Recipe schema grows substantially.** The `envelopes:` block and the per-param polymorphism (scalar | envelope-ref | envelope-inline) widen the YAML surface. Acceptable, but each new affordance is a new authoring concept to learn.
- **Cross-validation fixture explodes.** Envelope evaluation has more inputs (breakpoint count, interpolation type, LFO presence) than the four-shape tension arc. Initial fixture target ~50 cases; manageable but real.
- **ADR-028 superseded.** RFC-011's settled decision is replaced; ADR-029/030/031 from RFC-012/013 are not affected. The supersession is clean but it is the first time the project has retired an ADR.
- **Editor complexity.** A new envelope editor view is a substantial UI artefact. Smaller than the Video Editor itself, but larger than any current sub-panel.
- **Payload v3.** Backward compat handled per ADR-019 norms (v2 consumers reject; pipeline and browser ship together). Acceptable.
- **The `<Knob>` modulation prop now does work.** RFC-013 specified the prop as forward-compat; RFC-014 lights it up. Any RFC-013 bugs in the dual indicator surface here. Acceptable — that is exactly what paired shipping intended.
- **One more concept author has to internalise.** Scalar / preset / envelope is three forms per parameter; documentation has to land cleanly. Voice work in the recipe README is part of the implementation.

## Open questions

1. **Visual filter scope at landing.** This RFC declares envelopes apply to `render.*` parameters too, but the immediate consumer is audio. Should the first landing wire only audio envelopes (defer visual to a fast-follow), or wire both? Recommendation: wire both at landing — the cost is small and the use case (one envelope, two consumers) is the most compelling demo.
2. **Inline envelope value reading.** When an inline envelope is replaced by dragging the Knob to a new scalar, what happens to the envelope? Options: silently drop it (lose the curve), keep it and warn (UI clutter), require an explicit "remove envelope" action. Recommendation: explicit removal via the envelope editor's "delete" action; dragging the Knob modifies the envelope's start value, not the scalar fallback.
3. **Named envelope deletion semantics.** If an envelope is named in `envelopes:` and referenced from two parameters, deleting the named entry should fail-loud rather than silently dropping both references. Validation gate at recipe save time.
4. **Curve types beyond three.** Linear / cosine / exponential covers most cases. Authors may want spline interpolation for hand-shaped curves. Recommendation: ship three; revisit if the editor's "shape feels wrong" feedback becomes common.
5. **LFO waveform.** Sine is the default; some authors will want triangle or square (more obvious rhythmic wobble). Recommendation: sine only at v1; extend via `lfo_wave: sine | triangle | square` field if requested.
6. **Envelope-driven envelope** — should an envelope's breakpoint value itself be an envelope (recursive modulation)? Recommendation: explicitly no. The use case is speculative; the implementation complexity is high; the user-facing concept is hard to explain. Re-evaluate only if a concrete recipe demands it.
7. **Built-in template extensibility.** Can users add custom templates to the `tension_arc` preset family? Recommendation: not at v1. Templates are project-shipped; one-off shapes use inline envelopes.
8. **Stacked modulation per parameter.** v1 allows one modulation source per parameter (an envelope, or an LFO inside the envelope). Absynth allows stacked modulation (envelope + LFO + clock all driving the same parameter). The schema extension is small (`modulation:` becomes a list), the evaluation cost is small (sum the contributions), but the cognitive cost is real. Recommendation: single source at v1; extend to a list in a follow-up if recipes consistently want stacked motion.
9. **Loop mode interactions with envelope modulation.** When an envelope inside a `tile`-mode loop is referenced by another consumer (e.g. RFC-016 clock modulation), should the modulating value reset at each tile boundary or carry across? Recommendation: reset — each tile is a clean cycle. The cyclic semantics match author intent for "this breath repeats."

## How this closes

- **ADR-032 — Modulation graph: envelope primitive + evaluation.** Locks the polymorphic parameter shape (scalar | preset | envelope), the named + inline envelope schema, the precomputed-array distribution model, the payload v3 contract, and the engine consumption interface.
- **ADR-033 — LFO embedding semantics + cross-validation.** Locks the per-breakpoint `lfo_depth` / `lfo_hz` math (linear interpolation between breakpoints, deterministic phase from envelope start, sine waveform at v1), the built-in template registry (the four tension-arc presets), and the cross-validation fixture set.

Closure trigger: Phase 1 implementation forces the schema decision once the editor, the pipeline, and the cross-validation fixture set all read and emit envelope arrays end-to-end for at least three RFC-012 audio parameters and one visual filter parameter.

Supersession: ADR-028 (RFC-011's closure) is marked superseded by ADR-032 on closure. The tension arc keeps its name in YAML and in the editor; under the hood it is a built-in template over the new envelope primitive.

## Links

- **Source** — PRD-006 *The piece* · RFC-012 *Atmospheric audio*'s motivation for per-param time-varying control
- **TA** — components/render-system · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-010 Generative audio composition · RFC-011 Tension arc · RFC-012 Atmospheric audio · RFC-013 Editor controls
- **Related ADRs** — ADR-027 · ADR-028 (superseded on closure) · ADR-029 · ADR-030 · ADR-031
