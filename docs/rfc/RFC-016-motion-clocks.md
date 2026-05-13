# RFC-016 — Per-layer motion clocks: data-derived modulation sources

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · RFC-010 Generative audio composition · RFC-012 Atmospheric audio · RFC-014 Modulation graph · RFC-015 Bloom
> **Closes into** · ADR-036 (Clock primitive: data-derived modulation sources), ADR-037 (Data features registry)
> **Why this is an RFC** · Motion clocks are the most speculative of the five-RFC arc derived from the Absynth + Moments analyses. The aesthetic claim — that giving each audio layer its own clock derived from a different data feature produces *polyrhythmic, data-revealing* motion that nothing else in the stack can produce — is real but unproven in this codebase. The cost is also real: a new primitive in the recipe schema, a data-features registry that the project has to maintain, cross-validation surface, and a small but non-zero conceptual burden on authors. Whether the clock primitive justifies its existence as a separate concept (versus extending RFC-014's envelope LFO to accept data sources) is the central architectural question. Several sub-questions follow — data-features registry scope, polyrhythm sync semantics, editor surface, the relationship between clocks and envelopes at the runtime layer.

---

## The question

The Moments analysis surfaced a property the OceanCanvas audio system does not have: *per-voice motion engines.* In NI's Moments Vocal Clouds, soprano / alto / countertenor / basso layers each move on their own internal rhythm, producing loose polyrhythmic motion that is one of the library's signature qualities. The Absynth analysis surfaced a complementary property — *macro stability + micro motion* — already addressed by RFC-014's per-breakpoint embedded LFO.

What RFC-014 does *not* address is the source of that motion. The LFO inside an envelope is a fixed-frequency sine wave. It has no relationship to the data the recipe is rendering. A whale-shark recipe running on twelve months of OBIS observations has rich seasonal structure that the audio could reflect — but if every layer's wobble is at the same fixed Hz, the structure is in the visual and absent from the sound.

The architectural question is **whether to introduce a *clock* primitive — a data-derived per-frame phase signal — that any layer's envelope can subscribe to as a modulation source, producing motion that is (a) per-layer and therefore polyrhythmic and (b) tied to features of the data the recipe is rendering.** Three sub-questions sit underneath:

- **Why not extend RFC-014's LFO to accept a data source?** That is a real alternative, considered and rejected below for reasons of authoring clarity, but the case is closer than the proposal suggests at first glance.
- **What lives in the data-features registry?** A clock has to declare its source — `data.annual_cycle`, `data.monthly_delta`, `data.enso_index`. The registry is project-shipped and grows; how much ships at v1, and what is the extension protocol?
- **How aggressively do clocks integrate with the editor?** A new "clock view" in the Video Editor would let authors hear and see a clock independently of the envelope it modulates. Worth the UI work, or sufficient to expose clocks only in YAML at v1?

This RFC depends on RFC-014 being decided — clocks compile to per-frame modulation arrays that envelopes consume. Without the envelope primitive there is no consumer.

## Use cases

1. **Whale-shark seasonal cadence.** A whale-shark migration recipe defines three clocks: `vocal_clock` sourced from `data.annual_cycle` at quarter speed, `pulse_clock` sourced from `data.monthly_delta` at unit rate, `drone_clock` sourced from `data.enso_index` at slow rate. The vocal layer swells once per year, the pulse layer tightens when month-to-month variance spikes, the drone drifts on multi-year climate phase. Three layers, three timescales, all from the same data.
2. **Polyrhythmic minimalism.** A recipe defines three clocks at rates `1.0`, `1.33`, `0.75` against the same data feature. The phases drift relative to each other across the recipe duration — never quite aligning, producing a loose woven texture that nothing else in the stack produces.
3. **Visual + audio aligned on the same clock.** A vignette pulse subscribes to `vocal_clock`; the vocal layer swells on the same clock. Eye and ear move together; the breath you hear is the breath you see.
4. **Bloom-generated clock variety.** RFC-015 Bloom samples clock sources and rates as part of its variant generation. Five blooms of the same seed produce five recipes with subtly different polyrhythmic textures — one of Bloom's most distinctive surprises.
5. **Authoring escape hatch.** A recipe author who does not want polyrhythm omits the `clocks:` block entirely. Nothing changes. Clocks are additive; the existing single-timeline behaviour is the default.

## Goals

- **One new primitive.** A clock is a named, data-derived per-frame `[0, 1]` array. Declared in a top-level `clocks:` block (mirroring RFC-014's `envelopes:` block convention).
- **Data-features registry.** A project-shipped registry defines available data-feature functions (`annual_cycle`, `monthly_delta`, `enso_index`, `record_proximity`, …). Each is a pure function `(values, dates) → number[totalFrames]` producing a phase signal.
- **Compiles to envelope modulation.** Clocks are consumed by RFC-014 envelopes via a `modulation: { clock: <name>, depth: <0..1> }` field. The envelope's runtime is unchanged — clocks just supply a new kind of modulation array.
- **Free-running by default; optional sync.** Clocks run independently. An optional `sync: dominant_moment | start | end | none` field aligns the clock's phase to a recipe-level reference. Default `none`.
- **Deterministic.** Same data + same clock spec → same array. No randomness in clock evaluation.
- **TS ↔ Py parity.** Browser `clocks.ts` and pipeline `clocks.py` consume the same data-features registry and produce byte-identical output for the same inputs. Cross-validation fixture set extends.
- **Authoring optional.** Clocks are an opt-in feature. Recipes that do not declare a `clocks:` block render exactly as they did before. The conceptual burden lands only on authors who want what clocks offer.
- **Bloom-aware.** RFC-015's sampling spec includes clock sources and rates so generated variants can explore the polyrhythmic space.

## Constraints

- **Recipe YAML as source of truth** (TA constraints). Clocks declared in the recipe; no sidecar files.
- **Deterministic rendering** (TA constraints). Clock evaluation is a pure function of data + spec. Same inputs → same per-frame array.
- **Cross-validated TS ↔ Py** (precedent: RFC-011, RFC-014). Shared fixture file; browser and pipeline produce identical output.
- **Self-hostable** (TA constraints). All data-feature functions run locally.
- **Payload v3** (extended from RFC-014). Clock arrays travel through the payload alongside envelopes — same distribution model.
- **No regression on non-clock recipes.** Existing recipes (whether ambient identity from RFC-012 or any successor) render unchanged when no `clocks:` block is present.

## Proposed approach

### Clock primitive

```yaml
clocks:
  vocal_clock:
    source: data.annual_cycle      # registry-defined data feature
    rate: 0.25                     # frequency multiplier on the raw phase
    wave: sine                     # sine | triangle | square | trigger
    phase_offset: 0.0              # [0, 1], shifts starting phase
    sync: none                     # none | dominant_moment | start | end

  pulse_clock:
    source: data.monthly_delta
    rate: 1.0
    wave: triangle

  drone_clock:
    source: data.enso_index
    rate: 0.1
    wave: sine
    phase_offset: 0.5
```

Each clock produces a per-frame array in `[0, 1]`. The runtime caches the array per recipe-render; the payload carries it under `clocks.<name>` (same shape as `envelopes.*`).

### Data features registry

Project-shipped registry at `pipeline/src/oceancanvas/data_features.py` and `gallery/src/lib/dataFeatures.ts`:

```python
def annual_cycle(values: list[float], dates: list[str]) -> np.ndarray:
    """Seasonal phase: maps each date's month to [0, 1] wrapping every 12 months."""
    ...

def monthly_delta(values: list[float], dates: list[str]) -> np.ndarray:
    """Normalised |Δ value| frame-to-frame, smoothed over a 3-frame window."""
    ...

def enso_index(values: list[float], dates: list[str]) -> np.ndarray:
    """ENSO climate index for the date range, mapped to [-1, 1] then to [0, 1]."""
    ...

def record_proximity(values: list[float], dates: list[str]) -> np.ndarray:
    """Inverse distance to the nearest record event from moments.py."""
    ...
```

Initial v1 registry: the four features above. Each feature has a metadata entry — name, description, output unit, applicable data sources — used by the editor for clock-source picker UI.

The registry is project-shipped and reviewed; user-defined features are not in scope at v1. New features ship via small follow-up RFCs or, where the deliberation is light, ADRs.

### Clock evaluation

```
def evaluate_clock(spec, values, dates, total_frames, sync_anchor_frame):
    # 1. Raw phase signal from the data feature
    raw = data_features[spec.source](values, dates)  # ∈ [0, 1] per frame

    # 2. Apply rate and phase_offset
    phase = (raw * spec.rate + spec.phase_offset) % 1.0

    # 3. Apply sync if requested
    if spec.sync == "dominant_moment":
        phase = (phase - phase[sync_anchor_frame]) % 1.0
    elif spec.sync == "start":
        phase = (phase - phase[0]) % 1.0
    elif spec.sync == "end":
        phase = (phase - phase[-1]) % 1.0

    # 4. Apply wave shape
    if spec.wave == "sine":     output = 0.5 + 0.5 * sin(2 * pi * phase)
    elif spec.wave == "triangle": output = triangle_wave(phase)
    elif spec.wave == "square":   output = square_wave(phase)
    elif spec.wave == "trigger":  output = trigger_pulse(phase)  # narrow spikes at phase wrap

    return output  # ∈ [0, 1] per frame
```

### Integration with RFC-014 envelopes

An envelope's `modulation` field accepts either a built-in LFO spec (RFC-014's existing form) or a clock reference:

```yaml
envelopes:
  vocal_bloom:
    points:
      - { t: 0.0, v: 0.2 }
      - { t: 0.5, v: 0.6 }
      - { t: 1.0, v: 0.5 }
    modulation:
      clock: vocal_clock           # reference a clock from the clocks: block
      depth: 0.15                  # how much the clock perturbs the envelope
```

At evaluation time, the envelope's per-frame output is `base[frame] + depth * (clock[frame] - 0.5)`. The `- 0.5` centres the perturbation around the base value (clock outputs `[0, 1]`; modulation should swing symmetrically around the envelope's set point).

RFC-014's per-breakpoint LFO embedding is preserved — it remains the right tool for clock-less wobble. Clocks add a new source of modulation; the envelope runtime is otherwise unchanged.

### Polyrhythm via independent clocks

Multiple layers can subscribe to multiple clocks. There is no master clock and no requirement that clocks align. The polyrhythmic charm comes precisely from clocks at related-but-not-equal rates drifting in phase across the recipe duration.

The optional `sync` field exists for the case where alignment matters — pinning a clock's zero crossing to the dominant moment frame (so a vocal swell peaks on the all-time record event, for example). Most authors will not use it; the default is free-running.

### Distribution — payload v3 extension

The render payload's `envelopes` field already extends per RFC-014. Clocks add a peer field:

```json
{
  "version": 3,
  "recipe": { ... },
  "envelopes": { ... },
  "clocks": {
    "vocal_clock":  [0.0, 0.001, 0.003, ..., 0.998],
    "pulse_clock":  [0.5, 0.52, ..., 0.49],
    "drone_clock":  [0.5, 0.5, 0.501, ...]
  }
}
```

Engines and ffmpeg consumers read clocks by name when an envelope's modulation references one. Clocks unreferenced by any envelope are still computed and shipped — they may be referenced from future consumers, and the cost is small.

### Editor UX

At v1, clocks are surfaced minimally:

- The envelope editor's modulation panel gains a "clock" tab alongside the existing LFO tab. Picking a clock shows the clock's per-frame curve overlaid on the envelope.
- The `clocks:` block is editable as raw YAML in the Recipe Editor's source view. A structured clock-builder UI (drop-downs for source, sliders for rate, etc.) is deferred to a follow-up RFC if usage justifies it.

The deliberately small UI footprint at v1 reflects the speculative nature of the primitive — if clocks turn out to be a beloved feature, the UI investment is straightforward; if they turn out to be a quiet corner of the schema, no UI work is wasted.

### Cross-validation

`tests/cross-validation/clocks/` carries fixtures shaped as (data values, dates, clock spec, expected output array). Coverage at v1:

- Each data feature × each wave type (16 cases)
- Rate variation (3 cases per feature)
- `sync` modes (3 cases)
- Edge cases: single-frame data, dates with gaps, NaN handling (3 cases)
- Polyrhythm composition: two clocks against the same data with related rates (2 cases)

Total target ~27 fixtures. Cheap because clocks are pure data-in / array-out.

## Alternatives considered

### Alternative — extend RFC-014's LFO to accept a data source

Instead of a new primitive, add `lfo_source: data.annual_cycle` to RFC-014's per-breakpoint LFO spec. The LFO frequency becomes data-derived rather than constant.

Rejected, but the case is close. **Authoring clarity** — a clock is a *layer-level* concept (this whole layer breathes on this rhythm); an LFO is a *breakpoint-level* concept (this point on this envelope wobbles). Conflating them produces a single concept that has to expose both per-breakpoint and per-layer authoring affordances, doubling the cognitive surface. **Reuse** — clocks are referenceable by name from multiple envelopes and multiple layers; per-breakpoint LFOs cannot be. **Distinction at the runtime layer is the same** (both produce per-frame arrays envelopes consume), so the architectural cost of a separate primitive is small. The win is conceptual, not technical.

### Alternative — clocks as fully separate runtime primitive

Don't compile clocks down to envelope modulation; let layers subscribe to clocks directly, bypassing envelopes.

Rejected. The envelope primitive in RFC-014 already exists to be the path between time-varying control and audio engines. Adding a parallel path means engine code has to handle two modulation sources independently; cross-validation grows in two dimensions; the editor surface fragments. One modulation path through envelopes is enough; clocks contribute their value as a modulation source within it.

### Alternative — user-extensible data-features registry at v1

Allow users to declare custom data-feature functions in the recipe or in a config file.

Rejected at v1. A custom-function authoring affordance is real complexity (sandboxing, schema validation, language choice) for a use case that is speculative — there is no evidence yet that authors will want to define features the project-shipped registry does not cover. Ship four features at v1; observe; revisit. If a recipe author repeatedly works around the registry, that is the signal to invest in extensibility.

### Alternative — clocks defined inline within layers, not in a named top-level block

Each layer declares its own clock inline without a global namespace.

Rejected. Clocks are explicitly designed to be reusable across layers — a `vocal_clock` and a `vignette_clock` sharing the same definition is a primary use case (one clock, two consumers). Inline-only clocks lose the reuse affordance. Named + top-level mirrors RFC-014's envelope convention and keeps the schema coherent.

### Alternative — defer the entire RFC until clocks have a proven use case

Recipes today do not declare clocks; the demand is theoretical. Defer the RFC until at least one ambient recipe demonstrably needs clocks to feel right.

Considered seriously. Counter-argument: RFC-015 Bloom samples over the parameter space — without clocks in the schema, Bloom cannot explore polyrhythmic variants. The five-RFC arc derived from the Absynth + Moments analyses is more complete with clocks than without. Ship the RFC as Draft v0.1; light implementation can wait until RFC-012/013/014 land; if six months pass without a recipe needing clocks, retire the RFC honestly. Drafting it now is cheap and clarifies the relationship between the primitives.

### Alternative — synthetic clocks (free-running, no data dependency)

Allow `source: synthetic` with an explicit `hz` for a free-running LFO independent of data.

Rejected. That is exactly RFC-014's per-breakpoint embedded LFO with a single breakpoint. Adding it under the clock primitive duplicates the abstraction. Clocks are *defined* by their data dependency — that is the point. Free-running modulation is RFC-014's job.

## Trade-offs

- **Speculative aesthetic payoff.** The polyrhythmic motion clocks enable is real in Moments and in Steve Reich; whether it lands in this project's data-driven context is unproven. The RFC's v1 scope is deliberately small so the cost of being wrong is bounded.
- **Data-features registry is a maintenance line.** Each new data source (e.g., a future tide-gauge data source) may want new features; the registry has to be reviewed and extended. Modest ongoing cost.
- **Recipe schema grows again.** After RFC-014's envelopes and RFC-015's sampling hints, RFC-016 adds the `clocks:` block. Schema-as-a-whole is now substantially larger than v0.3.0's. Acceptable but worth acknowledging — the documentation work is non-trivial.
- **Conceptual burden, even optional.** "Why are there clocks AND envelopes AND LFOs?" is a reasonable question from a new author. Documentation has to make the relationships clear: clocks are *sources* of modulation, envelopes are *paths* through time, LFOs are clock-less periodic modulators inside envelopes.
- **Cross-validation grows.** ~27 new fixtures, plus integration tests where envelopes reference clocks. Manageable.
- **Bloom integration is real work.** RFC-015's sampling spec extends to clock sources, rates, and sync modes. The cross-validation fixture for Bloom + clocks grows.

## Open questions

1. **Data-features extensibility.** Project-shipped only at v1. When (if ever) to add user-extensible features is open; depends entirely on observed demand.
2. **Sync semantics — additional anchors.** `dominant_moment | start | end | none` covers the obvious cases. Authors may want `sync: <named_moment>` to pin to a specific moment by name. Recommendation: ship the four at v1; add named-moment sync as a fast-follow.
3. **Trigger wave behaviour.** A `wave: trigger` clock produces narrow spikes at phase wrap. Useful for "fire an event every annual cycle" use cases. Spike width and shape are open — recommendation: ship a single fixed shape (square spike of 1-frame width), extend if needed.
4. **Clock-to-clock modulation.** Can a clock's rate be modulated by another clock? Speculative and recursive — recommendation: explicitly no. Re-evaluate only if a recipe demands it.
5. **Editor visualisation depth.** The v1 clock surface is "show the array in the envelope editor's modulation tab." A dedicated clock-explorer view (audition data features against the recipe's actual data, side-by-side curve previews) is a possible follow-up.
6. **Default clock library.** Should the project ship a small set of pre-defined clocks (e.g. `default_annual_clock`, `default_monthly_clock`) that authors reference without having to declare them? Reduces authoring cost for common cases. Recommendation: yes, ship 3–4; treat them as the equivalent of RFC-014's built-in `tension_arc` templates.
7. **Bloom + clock sampling depth.** RFC-015's sampling can vary clock source, rate, wave, phase_offset, and sync. Sampling all five independently may produce too much variety. Recommendation: sample source from a curated set per data type; rate from a small set of musically-related values (`0.25, 0.5, 0.75, 1.0, 1.33, 2.0`); wave biased toward sine; phase_offset uniform; sync rarely.
8. **Editor visualisation for cyclic modulation.** RFC-013's `<Knob>` `modulation` prop shows a single animated current value — designed for monotonic envelope progress. Clocks are cyclic and the visual should communicate that. The proposed approach in RFC-013 is to keep the visual uniform and rely on the source label (`← vocal_clock`). If user testing shows authors confused by an oscillating dot on the ring, a small phase-circle overlay glyph is the natural extension.
9. **Clocks driving accent triggers, not just modulation.** RFC-016's `wave: trigger` produces narrow spikes at phase wrap. A natural extension: those spikes directly trigger accent events (an accent fires every annual cycle wrap). Currently accents are triggered by RFC-012's moment detection. Adding clocks as a trigger source widens what counts as a "moment." Open as a v2 extension; do not bundle into v1.

## How this closes

- **ADR-036 — Clock primitive: data-derived modulation sources.** Locks the `clocks:` schema, the clock evaluation algorithm, the integration with RFC-014 envelope modulation, the polyrhythm semantics, and the payload field.
- **ADR-037 — Data features registry.** Locks the v1 feature set (`annual_cycle`, `monthly_delta`, `enso_index`, `record_proximity`), the per-feature metadata schema, the extension protocol (project-shipped only at v1), and the cross-validation fixture set.

Closure trigger: Phase 1 implementation forces the schema decision once the pipeline, the browser, and the cross-validation fixture set all produce identical clock arrays end-to-end, *and* at least one ambient-identity recipe demonstrably uses a clock to drive a vocal or atmosphere envelope. The second condition is the honest test — if no recipe wants clocks, the RFC stays at Draft v0.1 and is candidate for retirement rather than closure.

## Links

- **Source** — Moments Vocal Clouds *per-voice motion engines* property · Absynth *macro stability + micro motion* philosophy
- **TA** — components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-010 Generative audio composition · RFC-012 Atmospheric audio · RFC-014 Modulation graph · RFC-015 Bloom
- **Related ADRs** — ADR-027 · ADR-029 · ADR-030 · ADR-032 · ADR-033 · ADR-034 · ADR-035
