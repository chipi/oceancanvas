# RFC-017 — Recipe-level macros: one knob, many parameters

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/web-frontend · contracts/recipe-yaml · constraints
> **Related** · RFC-012 Atmospheric audio · RFC-013 Editor controls · RFC-014 Modulation graph · RFC-015 Bloom
> **Closes into** · ADR-041 (Macro primitive: schema, evaluation, broadcast semantics)
> **Why this is an RFC** · After RFC-012 (audio identity), RFC-013 (knob UI), and RFC-014 (envelopes), the recipe surface has the right *low-level* primitives but is missing the *high-level* user surface Moments built its entire identity on — a handful of macros that each broadcast a single value to many parameters with weighted distribution. The technical question is whether macros warrant a new primitive or are already expressible as RFC-014 named envelopes referenced from multiple parameters. They are *almost* the same thing, but not quite: a named envelope is a curve, a macro is a scalar; multiple consumers of a named envelope receive the same value, multiple consumers of a macro receive *weighted* values. The architectural distinction looks small and is in fact the difference between "automation" and "performance control." Resolving this matters for the editor UX, the Bloom sampling spec, and how authors think about their recipes.

---

## The question

RFC-013 gave us circular knobs. RFC-014 gave us per-parameter envelopes that can be referenced by name from multiple parameters. Between the two, an author can reach Moments' aesthetic for a *single parameter*: a clean visual control, time-varying modulation, multi-consumer envelopes that drive `atmosphere` and `vignette` together.

What is still missing is what makes Moments' surface *feel* the way it does: **a small number of macros, each a single value, that broadcast to many parameters at once.** An `intensity` knob that, when raised, simultaneously increases atmosphere wet send, vocal presence, pulse sensitivity, and particle density — each with its own weighting and clamp — is not the same thing as four parameters all reading the same envelope. The envelope gives all four consumers the same number. The macro gives them weighted numbers that produce *coherent musical motion* across the entire mix.

The architectural question is **whether to introduce a `macros:` primitive that defines named scalars with weighted target lists, and how that primitive relates to RFC-014's named envelopes.** Three sub-questions sit underneath:

- **Macro versus named envelope.** Both produce values consumed by multiple parameters. The technical difference is scalar-with-weights versus curve-with-uniform-output. Is the conceptual gap large enough to justify a new primitive, or should authors approximate macros by composing envelopes?
- **Target weight semantics.** A macro at value 0.7 broadcasting to a parameter with weight 1.2 produces 0.84 — exceeds 1.0 for parameters in [0, 1]. Clamp behaviour matters: clamp at target, clamp at macro, soft saturation? Each implies different musical results.
- **Time-varying macros.** A macro's *value* can itself be an envelope (or a clock). At which evaluation layer does the macro live — is it a scalar that envelopes can modulate, or is it just a multi-target envelope wearing a different hat?

This RFC depends on RFC-013 (UI) and RFC-014 (envelope primitive). It precedes RFC-015 Bloom's full sampling coverage — macros sampled by Bloom produce striking variants because they coordinate many parameters at once.

## Use cases

1. **The "intensity" macro.** An ambient recipe exposes one knob — `intensity` — that drives atmosphere wet send (weight 0.8), vocal presence (weight 0.6), pulse sensitivity (weight 1.2, clamped), particle density (weight 0.5), and drone presence (weight -0.4, *inverse* — drone retreats as intensity rises). Author moves one knob; the entire piece rebalances coherently from "calm bed" to "swelling apex."
2. **The "warmth" macro.** A second knob shifts the palette temperature, the vocal stack mix (more human-vocal-weight on warm, more whale on cool), and the granular shimmer (less on warm, more on cool). Two macros — intensity and warmth — give an author a 2D performance space over a complex recipe.
3. **Recipe authoring stays cheap.** A new recipe declares one or two macros and assigns weights. The author never has to set `atmosphere = 0.6`, `vocal_presence = 0.45`, `pulse_sensitivity = 0.36` individually — they set `intensity = 0.75` and the weights distribute. Recipe YAML stays compact, even as the parameter count grows.
4. **Time-varying macros.** A macro's value is itself an envelope: `intensity` envelope starts at 0.3, swells to 0.8 at the midpoint, returns to 0.4 by end. Every target parameter follows the macro envelope at its weighted scale. One envelope, one macro, ten coherent automated parameters.
5. **Bloom-generated macros.** RFC-015 Bloom samples macro weights as part of variant generation. Five blooms produce five recipes whose macros bias the parameter space differently — one where intensity-warmth strongly couple, another where they push opposite directions, another where intensity foregrounds drone (negative weight). Variant space becomes *qualitatively* larger.
6. **Editor performance.** The Video Editor's preview view shows only the macros (one or two large knobs) by default; the underlying parameters are hidden in a collapsed "advanced" section. Authors who want to perform can grab a MIDI controller and map macros directly. Authors who want to compose still have full parameter access. Surface scales to skill.

## Goals

- **New primitive: macros.** A `macros:` top-level block declares named scalars with weighted target lists. Each target names a parameter path and a weight.
- **Polymorphic macro value.** A macro's `value` is scalar | envelope-ref | inline-envelope | clock-ref. Same polymorphism rule as RFC-014 parameters.
- **Weighted broadcast.** Target parameter receives `macro_value * weight`, clamped to the target's natural range (with optional explicit `clamp` override per target).
- **Negative weights** for inverse relationships (drone retreats as intensity rises, palette cools as warmth drops).
- **Macros are first-class in the editor.** RFC-013's `<Knob>` renders macros prominently; the Video Editor's default view leads with macros and demotes underlying parameters to a secondary panel.
- **Macros are first-class in Bloom.** RFC-015 samples macro definitions: which targets a macro covers, which weights it assigns, and its initial value or envelope shape.
- **Deterministic.** Same macro definitions + same value → same broadcast outputs.
- **Composable with envelopes.** A target parameter can be `{ macro: intensity }` *and* also have an additive envelope on top — macro broadcast plus envelope offset. The composition rule must be unambiguous.

## Constraints

- **Recipe YAML as source of truth** (TA constraints).
- **Deterministic rendering** — macro broadcast is a pure function of macro value × weights.
- **Cross-validated TS ↔ Py** — both implementations compute identical broadcast arrays for identical inputs.
- **No regression on RFC-014 envelopes** — recipes that do not use macros remain valid.
- **Schema integrity** — macros validate against the schema; CI gates the same way as for envelopes.
- **Self-hostable**.

## Proposed approach

### Macro primitive

```yaml
macros:
  intensity:
    value: 0.6                       # scalar | envelope ref | inline envelope | clock ref
    range: [0, 1]                    # the macro's own range
    description: "Overall energy"    # for editor labelling, optional
    targets:
      - { path: audio.atmosphere,         weight:  0.8 }
      - { path: audio.vocal.presence,     weight:  0.6 }
      - { path: audio.pulse_sensitivity,  weight:  1.2, clamp: [0, 1] }
      - { path: render.particle_density,  weight:  0.5 }
      - { path: audio.drone.presence,     weight: -0.4, offset: 0.4 }     # drone retreats

  warmth:
    value:
      envelope:                      # macro value can itself be time-varying
        points:
          - { t: 0.0, v: 0.3 }
          - { t: 0.5, v: 0.7 }
          - { t: 1.0, v: 0.5 }
    range: [0, 1]
    targets:
      - { path: render.palette_temperature, weight: 1.0 }
      - { path: audio.vocal.stack.0.gain,   weight:  0.4 }    # more whale on warm
      - { path: audio.vocal.stack.1.gain,   weight: -0.4 }    # less human on warm
      - { path: audio.atmosphere_shimmer,   weight: -0.5 }    # less shimmer on warm
```

### Parameter consumption

A parameter consumes a macro by name in place of its scalar:

```yaml
audio:
  atmosphere:
    macro: intensity                 # this param is broadcast by the macro

  vocal:
    presence:
      macro: intensity               # same macro can drive multiple params
```

The polymorphism rule for any parameter widens to: `scalar | preset_ref | envelope | macro_ref`. Parser normalises all forms to the same per-frame output array.

### Broadcast evaluation

For each frame, for each parameter that has a `macro:` reference:

```
macro_value_at_frame = evaluate(macro.value, frame)        # scalar if static, array lookup if envelope/clock
broadcast            = macro_value_at_frame * target.weight
if target.offset:
    broadcast = broadcast + target.offset
if target.clamp:
    broadcast = clamp(broadcast, target.clamp[0], target.clamp[1])
else:
    broadcast = clamp(broadcast, param.min, param.max)
arr[frame] = broadcast
```

`offset` shifts the broadcast (useful for negative-weight relationships like drone: when intensity = 0, drone = offset 0.4; when intensity = 1, drone = 0.4 - 0.4 = 0). `clamp` overrides the parameter's natural range for cases where the math wants to exceed it before clipping.

### Composition with envelopes

A target parameter can have an additive envelope on top of macro broadcast:

```yaml
audio:
  atmosphere:
    macro: intensity
    envelope_add: subtle_breath      # adds the envelope's per-frame value on top of broadcast
```

Composition order: macro broadcast → envelope add → clamp. This lets authors define a baseline via macro and a slow drift on top via envelope without either fighting the other. Composition is optional; most parameters reference one or the other.

### Distribution — payload extension

Payload v3 (from RFC-014) gains a `macros:` field carrying per-frame macro values:

```json
{
  "version": 3,
  "macros": {
    "intensity": [0.3, 0.302, ..., 0.4],
    "warmth":    [0.3, 0.32, ..., 0.5]
  },
  "envelopes": { ... },
  "clocks":    { ... }
}
```

For each parameter, the precomputed final value (after broadcast + envelope add + clamp) lands in the existing `envelopes` field, so engine code reads from one place regardless of source. The `macros` field exists for editor preview (showing the macro's current value) and for cross-validation.

### Editor UX

Three changes in the Video Editor:

- **Macro panel first.** Recipe Editor's default view leads with a Macro section (one large `<Knob>` per macro). Underlying parameters move into an "Advanced" collapsed panel.
- **Macro authoring.** A "Define macro" affordance in the editor lets authors create a macro: name, range, then drag-and-drop parameters from the Advanced panel into the macro's target list. Weight is a small slider per target (default 1.0; drag down for negative).
- **Macro envelope authoring.** The macro's `value` field opens the envelope editor when the author wants time-varying macros — same envelope editor RFC-014 ships.

### Cross-validation

A `tests/cross-validation/macros/` fixture set carries (macro definition, value at frame, expected broadcast outputs across targets). Coverage:

- Single target, single weight (sanity baseline)
- Multiple targets, mixed positive/negative weights
- Macro value as scalar, envelope, clock
- Composition: macro + envelope_add
- Clamp behaviour at target overflow
- Offset behaviour for inverse relationships

~20 fixtures at v1.

## Alternatives considered

### Alternative — no new primitive; use multi-target named envelopes

A named envelope can already be referenced by multiple parameters. An author who wants intensity-as-macro defines an envelope, references it from multiple parameters. Done — no new primitive.

Rejected, but the case is close. **Two material differences.** First, a macro is a *scalar*; the author thinks "0.6 of intensity," not "this curve over time." Forcing all macros to be envelopes means a static recipe still requires authoring a flat single-point envelope, which is ceremony for the simple case. Second, **weighting** — every consumer of a named envelope receives the same value, but a macro's whole point is that different consumers receive *different* values from the same gesture (intensity 0.7 → atmosphere 0.56, pulse 0.84, drone 0.16). Encoding per-consumer weights in envelopes would require sidecar weight tables, which is exactly the macro primitive in disguise. Build the primitive properly; do not pretend it is sugar over envelopes.

### Alternative — macros as syntactic transformation (expanded at parse time)

A macro is YAML-only: at recipe load, the parser substitutes the macro's weighted values into each target's slot, producing a flat recipe with no macro references at runtime.

Rejected. Loses runtime introspection (no way to ask "what is intensity right now?" in the editor or in cross-validation logs). Loses the editor's ability to show *one knob driving many params* visually. Loses time-varying macros (envelope-valued macros need runtime evaluation). The macro primitive earns its keep precisely at runtime; flattening it at parse time wastes that.

### Alternative — clamp at macro value, not at target

Macro value is clamped before broadcasting; targets receive `macro_value * weight` without further clamping.

Rejected. Different targets have different natural ranges (`audio.pulse_sensitivity` is `[0, 1]`, `render.palette_temperature` might be `[0.2, 0.9]`). Clamping at the macro forces every target into a shared range, which is wrong. Per-target clamp (default to target's range, optional override) is correct.

### Alternative — macros only for audio, not visual

Cleaner scope. Visual parameters stay free of the new primitive at v1.

Rejected. The most compelling use case is *coordinated* audio + visual motion — intensity simultaneously raising atmosphere wet and particle density is the gesture authors want. Restricting to audio loses the cross-modal coherence that is the whole point.

### Alternative — defer macros until RFC-014 lands and authors complain

Macros are not strictly necessary for any single recipe. Maybe authors are happy with shared envelopes and won't ask for macros.

Considered. Counter-argument: macros are the most distinctive feature of Moments' surface, and the user identified this aesthetic explicitly as the target. Building the right primitive now is cheaper than retrofitting after authors have built workarounds using shared envelopes. Ship the RFC as Draft v0.1 alongside the others; implementation can land after RFC-014 stabilises.

## Trade-offs

- **Schema growth — again.** After RFC-014's envelopes, RFC-015's sampling hints, and RFC-016's clocks, RFC-017 adds the `macros:` block and the `macro:` parameter form. The schema is genuinely complex now; documentation must work harder than before.
- **Conceptual hierarchy.** Authors will rightly ask: when do I use a macro, an envelope, a clock, or a preset reference? Documentation has to make the distinctions land: presets are *named static values*, envelopes are *named time-paths*, clocks are *data-derived modulation sources*, macros are *scalar broadcasts*. Different primitives, different jobs.
- **Editor UX shift.** Leading with macros instead of parameters is a real change to the Video Editor's default mode. Authors used to the old view will rebind muscle memory. Mitigation: keep parameter access one click away (Advanced panel), not behind a deep menu.
- **Composition rules can confuse.** When a parameter is `{ macro: intensity, envelope_add: subtle_breath }`, two sources combine. Authors who don't understand the order may get unexpected results. Documentation needs a small worked example for every composition path.
- **Bloom sampling adds a dimension.** Sampling macro *definitions* (which targets a macro covers, what weights) requires richer sampling specs in RFC-015. Cross-validation fixture grows.

## Open questions

1. **Default macros shipped with the project.** Should the initial RFC-012 ambient recipe family ship with a recommended pair of macros (`intensity`, `warmth`)? Recommendation: yes — they become the de-facto starting surface every new recipe inherits, with authors free to customise.
2. **Target weight UI.** Weights live in YAML naturally, but the editor needs a control. Per-target slider with snap-to-1.0 and snap-to-0.0? Numeric input? Recommendation: small slider per target row in the macro panel, with right-click-to-edit-numeric for precision.
3. **Auto-generated macro from selection.** "Right-click these three parameters → Create macro" workflow. Reasonable UX shortcut; needs the editor to know which parameters are currently selected. Recommendation: ship at v1 if RFC-013's editor work surfaces a selection model; otherwise fast-follow.
4. **Macro of macros.** Can a macro's target be another macro (recursive broadcast)? Speculative. Recommendation: explicitly no — broadcasting through one layer is enough; recursion adds debugging hazard.
5. **MIDI binding.** Macros are the natural target for external MIDI control surfaces. Out of scope for this RFC but worth noting — when the audio engine is performable (a future RFC), macros are the integration point.
6. **Clamp semantics — soft saturation alternative.** Hard clamp at target bounds works but can produce sudden flat spots in the broadcast curve as the macro sweeps past a parameter's edge. Soft tanh-style saturation is musically nicer but introduces a non-linear math primitive. Recommendation: hard clamp at v1; revisit if recipes consistently sound "stuck" at parameter edges.
7. **Negative-weight + offset is a footgun.** `weight: -0.4, offset: 0.4` is the proposed inverse-relationship recipe. Easy to mis-author. Recommendation: ship an `inverse: true` alias that auto-computes weight and offset from the parameter's range, as syntactic sugar.

## How this closes

- **ADR-041 — Macro primitive: schema, evaluation, broadcast semantics.** Locks the `macros:` block schema, the `macro:` parameter form, the broadcast evaluation pipeline (value × weight + offset, clamped per-target), the composition rule with envelopes (`macro` then `envelope_add` then clamp), the payload field, and the cross-validation fixture protocol.

Closure trigger: Phase 1 implementation forces the schema decision once the editor leads with a macro panel and at least one ambient-identity recipe demonstrably uses a macro with three or more targets including a time-varying macro value.

## Links

- **Source** — Moments "1 knob, many parameters" macro philosophy · Absynth Mutator's preset-DNA observation (a single move re-coordinates many params)
- **TA** — components/render-system · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-012 Atmospheric audio · RFC-013 Editor controls · RFC-014 Modulation graph · RFC-015 Bloom · RFC-016 Motion clocks
- **Related ADRs** — ADR-032 · ADR-033 · ADR-034 · ADR-035 · ADR-036 · ADR-037 · ADR-038 · ADR-039 · ADR-040
