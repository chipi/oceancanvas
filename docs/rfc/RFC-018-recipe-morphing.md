# RFC-018 — Recipe morphing: continuous interpolation between recipes

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/pipeline · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · RFC-012 Atmospheric audio · RFC-014 Modulation graph · RFC-015 Bloom · RFC-017 Recipe-level macros
> **Closes into** · ADR-042 (Recipe morphing: schedule + interpolation), ADR-043 (Per-parameter morph rules + sample crossfade)
> **Why this is an RFC** · Absynth's distinctive wavetable morphing — smooth continuous interpolation between source waveforms over time — has no direct analogue in the current OceanCanvas stack. RFC-015 Bloom generates *discrete* variants; RFC-014 envelopes morph *parameters within one recipe* over time. Neither addresses the gesture "morph from this whole recipe at the start to that whole recipe at the end across the video duration." The technical question is what *recipe morphing* means concretely: numeric parameters interpolate naturally, but enum parameters (palettes, accent styles), sample-bank references (vocal stack entries), and envelope shapes (whose breakpoint topologies may differ between source recipes) each require an explicit rule. The aesthetic payoff is real — long-form recipes that drift through compositional space rather than holding a single state — but the cost in render performance, schema complexity, and cross-validation surface is non-trivial. Multiple plausible architectures exist for the morph schedule (binary blend, multi-stop interpolation, envelope-driven blend curve), each with different trade-offs.

---

## The question

Long-form ambient pieces benefit from compositional motion that a single recipe cannot express. A five-minute video that begins in a thermal-warm SST identity and ends in a cool-tracks identity has no clean authoring path today: the author either commits to one identity (and accepts staticness) or builds a single recipe whose envelopes approximate the journey (laborious, brittle, fights every parameter individually). Bloom (RFC-015) produces discrete variants — it cannot interpolate. Envelopes (RFC-014) can move individual parameters over time but cannot coordinate the wholesale parameter-and-sample-bank shift of "become a different recipe."

The technical question is **how to define and evaluate a continuous morph between two (or more) full recipes across a video's duration.** Four sub-questions sit underneath:

- **Schedule.** A simple `from → to` linear blend covers the headline case but misses obvious extensions — multi-stop morphs (A → B → C with hold at B), curved blend trajectories (slow start, fast middle), morph-curve-as-envelope (the morph weight itself follows an authored curve).
- **Per-parameter rules.** Numeric parameters lerp; enum parameters cannot (no number lies between `palette: thermal` and `palette: oceanic`). What is the rule per parameter type — snap at midpoint, crossfade with both active, defer to author override?
- **Envelope morph.** Two recipes' envelopes have different breakpoint topologies. Interpolating in *envelope space* (breakpoint values) requires same-shape envelopes; interpolating in *output-array space* (per-frame values after expansion) is always defined but flattens authoring intent. Which is right?
- **Audio sample crossfade.** Recipe A uses humpback whale; Recipe B uses soprano vocal. A morph wants both audible simultaneously during the transition, weighted by morph position. The audio engines have to mix both stacks. Performance and determinism cost are real.

Recipe morphing is a different gesture from Bloom and from envelope authoring. It is the *Absynth wavetable* primitive expressed at the recipe level — the recipe is the wavetable, the morph schedule is the wavetable position envelope.

## Use cases

1. **Identity arc across a long video.** A five-minute piece begins as `pacific-thermal-drift.yaml` (warm, SST, slow drone-heavy) and ends as `tropical-tracks-cool.yaml` (cool, OBIS tracks, vocal-foreground). The morph schedule blends them linearly; the viewer experiences a continuous compositional shift without seeing recipe boundaries.
2. **Three-act structure.** Recipe A (calm), Recipe B (climax), Recipe C (resolution). Multi-stop morph with hold at B for the middle 30%: morph weight = `[A: 1.0 at t=0, B: 1.0 at t=0.4, B: 1.0 at t=0.6, C: 1.0 at t=1.0]`. Authored as a small schedule, evaluated continuously.
3. **Bloom-meets-morph.** RFC-015 Bloom produces five variants of a seed. The author picks two favourites and authors a morph between them — `bloom_002 → bloom_004` over the video duration. The morph becomes the *exploration* path through Bloom's discrete variant space.
4. **Macro-driven morph trajectory.** RFC-017 macros control the morph weight: an `intensity` macro that, when raised, simultaneously pushes the morph toward Recipe B. Performance gesture × compositional gesture in one knob.
5. **Cross-modal morph.** Audio identity and visual identity morph independently — audio shifts from ambient to synthetic across the video (different schedule), visual stays on one recipe throughout. Useful for "music swells over a continuous image" or vice versa.

## Goals

- **New primitive: morph schedule.** A top-level `morph:` block declares source recipes (2+) and a schedule mapping render time to source weights. Recipe is single by default; morph is opt-in.
- **Per-parameter morph rules.** Each parameter type has a defined morph behaviour: numeric → lerp, envelope → output-array lerp, enum → snap at midpoint with optional crossfade for sample-bank refs.
- **Audio sample crossfade.** When morph weight crosses a transition zone, both source audio stacks are active and mixed by morph weight. Sample bank references morph by crossfading the rendered audio, not by interpolating sample identities.
- **Output-array envelope morph.** Envelopes morph by interpolating their *expanded per-frame arrays*, not their breakpoint structures. Two recipes can have envelopes with completely different topologies; the morph still works.
- **Macro / envelope / clock can drive morph weight.** The morph weight itself is polymorphic — scalar, envelope, clock, or macro. Authors can morph linearly, on a curve, or driven by data.
- **Deterministic.** Same source recipes + same schedule → byte-identical output.
- **Cross-validated TS ↔ Py** at output-array level — both implementations produce identical morphed arrays for identical inputs.
- **Performance bounded.** Worst case: two full recipe payloads expanded in parallel plus crossfade. Acceptable for typical 2-source morphs; multi-source morphs (3+) opt in to higher cost.
- **Composable with everything.** Morph integrates with macros (macros work post-morph, on the morphed parameter values), envelopes (envelopes inside source recipes work normally during their source's active weight), and Bloom (a morph is a real recipe and can be a Bloom seed).

## Constraints

- **Recipe YAML as source of truth** — morph schedules live in the recipe file.
- **Deterministic rendering** — morph evaluation is a pure function of source recipes + schedule + data.
- **Cross-validated TS ↔ Py** at the output-array level.
- **Self-hostable.**
- **Render performance** — morph evaluation cannot more than double the per-frame compute cost of a single recipe; multi-source morphs are best-effort.
- **Payload v3 extension** — morphed recipes carry both source payloads (or both expanded `envelopes` and `clocks` arrays) plus the schedule, OR a pre-mixed final payload. Decision affects browser preview latency vs. pipeline render cost.

## Proposed approach

### Morph schedule

A top-level `morph:` block declares sources and a schedule:

```yaml
morph:
  sources:
    - { id: a, recipe: pacific-thermal-drift.yaml }
    - { id: b, recipe: tropical-tracks-cool.yaml }
  schedule:
    weight:                          # morph weight for source B (A weight = 1 - B)
      envelope:
        points:
          - { t: 0.0, v: 0.0 }       # 100% A at start
          - { t: 0.3, v: 0.0 }       # hold on A
          - { t: 0.7, v: 1.0, slope_to_next: cosine }
          - { t: 1.0, v: 1.0 }       # 100% B at end
        interpolation: cosine

# Top-level audio: / render: blocks are absent — the morph drives them
```

Two sources at v1; the schema generalises to N sources via per-source weight schedules, but multi-source is deferred. Schedule weight is itself polymorphic (scalar | envelope | clock | macro) per the RFC-014 / RFC-017 rule.

### Per-parameter morph rules

```
NUMERIC:        result = lerp(a, b, w)
NUMERIC (clamp): result = clamp(lerp(a, b, w), param.min, param.max)
ENUM:           result = w < 0.5 ? a : b                              # hard snap at midpoint
ENUM (crossfade): two enums treated as concurrent — both contribute, weighted by 1-w and w
ENVELOPE:       morph the expanded per-frame arrays (lerp(a_arr[f], b_arr[f], w))
CLOCK:          morph the expanded per-frame arrays (same as envelope)
MACRO VALUE:    morph as scalar / envelope per macro.value type
MACRO TARGETS:  union the target lists; weight each target by the source it came from
SAMPLE REF:     not interpolated as a value — handled by audio crossfade (next section)
PRESET REF:     resolve to value at expansion, then morph as ENVELOPE
COLOR (RGB):    lerp each channel
```

Numeric is unambiguous. Enum is the genuine design choice — hard snap is the v1 default; per-parameter override via `morph_rule: crossfade` opts into the costlier two-active-states behaviour. Envelope morph works on output arrays because that is the only universally defined topology — two recipes can have differently-shaped envelopes and the morph is still well-formed.

### Audio sample crossfade

Sample-bank references (vocal stack samples, accent samples) are not interpolated as identities — they are crossfaded as audio:

```
For each frame f:
    w = schedule_weight[f]                           # 0..1, weight of source B
    a_audio = render_recipe_a_layer(f)               # full audio frame from A
    b_audio = render_recipe_b_layer(f)               # full audio frame from B
    out[f]  = a_audio * (1 - w) + b_audio * w
```

Both recipes' audio engines run in parallel during transition zones. Outside transition zones (`w == 0` or `w == 1`), only the active source renders — no parallel cost. Transition zones are identified at schedule evaluation time so the engines can short-circuit when one side is silent.

### Envelope morph (output-array)

```python
def morph_envelope(env_a_arr, env_b_arr, weight_arr, total_frames):
    return [
        env_a_arr[f] * (1 - weight_arr[f]) + env_b_arr[f] * weight_arr[f]
        for f in range(total_frames)
    ]
```

The morph is on the already-expanded arrays — RFC-014's per-frame array contract — so breakpoint count and topology in the source recipes are irrelevant. Cross-validation is straightforward (compare arrays).

### Macro morph

When both sources define a macro of the same name (`intensity` in A, `intensity` in B), the morph blends their values. When only one defines it, the macro fades in or out by morph weight. Targets union — a parameter targeted by `intensity` in only A remains targeted (at weight × 1-w from A); a parameter targeted in only B remains targeted (at weight × w from B); a parameter targeted in both receives both contributions summed and clamped.

### Distribution — payload v3 extension

The render payload carries the schedule and both source recipes' expanded arrays under a new top-level field:

```json
{
  "version": 3,
  "morph": {
    "schedule_weight": [0.0, 0.0, ..., 0.99, 1.0],
    "sources": ["a", "b"]
  },
  "recipe_a": { ... full payload of source A ... },
  "recipe_b": { ... full payload of source B ... },
  "envelopes": {
    "audio.atmosphere": [ ... morphed result ... ]
  }
}
```

The pipeline computes the morphed final envelopes (and clocks, macros) at payload-build time. The browser uses the morphed arrays directly for preview. The two source payloads are retained for editor inspection ("show me what source A's atmosphere envelope looks like") but engines do not re-morph.

Audio crossfade is handled differently — the pipeline runs both audio engines in parallel for transition zones and outputs a single morphed WAV; the browser likewise runs both engines and mixes. The payload does not pre-mix audio (it never has, even for single recipes).

### Editor UX

A new "Morph" mode in the Video Editor:

- Lists source recipes (drag from the recipe browser to add).
- Schedule editor that looks like the envelope editor (RFC-014) — drag breakpoints to shape the morph weight curve.
- Side-by-side preview: thumbnail of source A on the left, source B on the right, the morphed frame at the current playhead in the centre.
- Per-parameter morph rule overrides under an Advanced panel (the parameters that have non-default rules — most are inherited defaults).
- Crossfade audio audible during scrubbing.

### Cross-validation

`tests/cross-validation/morph/` fixtures cover:

- Two-recipe linear morph (sanity baseline)
- Two-recipe envelope-driven schedule (curved morph)
- Two-recipe with shared macros (target-list union)
- Two-recipe with differently-shaped envelopes (output-array morph)
- Enum hard-snap vs crossfade rules
- Transition-zone edge detection (w transitions through 0 or 1 mid-render)
- Source with absent param (B doesn't define `vocal:` but A does — B's missing-param falls back to zero presence during morph)

~20 fixtures at v1.

## Alternatives considered

### Alternative — morph in breakpoint space, not output-array space

Interpolate envelope shapes by matching breakpoints between sources and lerping their `(t, v)` tuples.

Rejected. Requires the two recipes to share envelope topology — same number of breakpoints, same `t` positions, same `slope_to_next` types. That is not the case in practice; authors do not coordinate envelope shapes across recipes. Output-array morph is always defined and produces musically reasonable results (a sharply-peaked envelope morphing into a flat one passes through a gentler peak naturally). The intent loss is real but acceptable; the alternative is "you can only morph recipes that share envelope shapes," which is not useful.

### Alternative — enum crossfade as default

Instead of hard snap at midpoint, default to crossfade for all enum parameters (both palettes active, both accent samples playing, both vocal stacks audible).

Rejected as default. Some enums (palette) cannot crossfade — there is no rendering of "60% thermal + 40% oceanic"; the renderer takes one palette per frame. Some enums (accent samples) can crossfade but the result is muddy. Snap at midpoint is the conservative default that always works; crossfade is an opt-in per-parameter override for the cases where it sounds right.

### Alternative — defer multi-source morphs (N ≥ 3) to v2

Three-act structure (A → B → C with hold at B) is the most compelling multi-source use case. Excluding it from v1 simplifies schema and evaluation.

Accepted in part. The schema generalises to N sources via per-source weight schedules, but v1 evaluation supports only 2 sources. Multi-source schedules are a fast-follow: the same machinery generalises, the editor surface is what costs the most. Document the path; ship the two-source case.

### Alternative — pre-mix the payload (single combined source)

The pipeline morphs source A and source B at payload-build time and emits a single payload identical in shape to a non-morph recipe. The browser sees one recipe.

Rejected. Loses editor introspection (no way to ask "what is the underlying source A doing right now?"). Loses preview affordances (side-by-side source comparison). Loses fast morph-schedule editing (changing the schedule requires re-emitting the entire payload). Carrying both source payloads is verbose but correct.

### Alternative — implement morphing as a special case of macros (RFC-017)

A morph schedule is "a macro called `morph_weight` whose targets are every parameter, each with weight = (b_value - a_value)." Eliminates the new primitive.

Rejected. The macro target list would have to be derived from a comparison of two whole recipes (which params differ and by how much), recomputed every time the source recipes change. The macro abstraction is for *author-defined coordinations*; morph is a *whole-recipe transformation* — different concern, different lifecycle. Conflating them confuses both primitives.

### Alternative — defer the entire RFC; rely on long envelopes within one recipe

Authors can approximate morphing by hand-authoring envelopes on every relevant parameter within a single recipe.

Rejected. The labor cost of authoring twenty parallel envelopes for what is conceptually "become a different recipe" is prohibitive. The morph primitive captures the intent in one block; envelopes-per-parameter scatter it across the recipe. Authors who have used Absynth wavetable morphing will recognise the gesture and reach for it.

## Trade-offs

- **Compute cost.** Two-recipe morph approximately doubles per-frame compute in transition zones (both audio engines running). Outside transition zones, only one source runs. Acceptable for typical 30-second to 5-minute outputs; pathological cases (long morph with broad transition zones) may approach 2× total cost.
- **Payload size.** Carrying both source payloads expands the payload file substantially. Acceptable — payloads are small and disk-cheap; the redundancy buys editor introspection.
- **Schema complexity.** Recipe authoring gains a new top-level block and a per-parameter morph-rule system. The macro / envelope / clock vocabulary already grew the schema; morph adds another concept. Documentation has to land.
- **Enum-as-snap is opinionated.** Some authors will assume enums crossfade; documentation has to be clear that hard snap is the default and crossfade is opt-in.
- **Output-array envelope morph loses authoring intent.** A recipe author who carefully shaped an envelope for source A loses that *shape* during transition zones; they only see the morphed array result. Acceptable cost for the universal applicability of output-array morph.
- **Editor UX is genuinely new.** Side-by-side source preview, schedule editor, per-param overrides — comparable in complexity to the envelope editor. Material editor work.
- **Cross-validation surface grows.** Morph fixtures must cover enum rules, envelope topology divergence, transition-zone edges. ~20 fixtures is a starting estimate; may grow.

## Open questions

1. **N-source schedule schema.** Two sources at v1; the schema needs to anticipate N sources without locking in. Recommendation: each source declares its own weight schedule (no shared one); sum of weights at any frame is *not* required to be 1.0 — the engine normalises. Multi-source path is a small schema extension once the two-source case is stable.
2. **Render duration mismatch between sources.** Source A is 60s; Source B is 90s. What does the morph mean? Recommendation: morph applies over the *morph recipe's* duration, both sources scaled to that duration. The source recipes' own duration fields are advisory in the morph context.
3. **Source recipe references — absolute vs. relative path.** Recipes are tracked in `recipes/`; morph references should be by ID, not path. Recommendation: by recipe stem (`pacific-thermal-drift`), resolved via the gallery's recipe index.
4. **Bloom × morph.** Can Bloom sample morph schedules? Two sub-questions: can Bloom *generate* a morph recipe (pick two random source recipes and a schedule)? Can Bloom sample *the schedule curve* of an existing morph? Recommendation: yes to schedule sampling at v1 (extends Bloom's archetype library); the "pick two sources" case is more speculative and defers to a Bloom v2.
5. **Crossfade region width.** Audio crossfade is wide enough to be smooth (>200ms) but narrow enough to be clear. Recommendation: auto-compute from schedule weight derivative — fast transitions get short crossfades, slow ones get long crossfades.
6. **Macro morph when target lists diverge.** A has macro `intensity` targeting params X, Y. B has `intensity` targeting Y, Z. During morph, Y is in both; X exits gracefully (broadcast fades with A's weight); Z enters (broadcast appears with B's weight). The union rule above. Is this the right behaviour, or should the editor warn on divergent target lists? Recommendation: silent union at v1; surface warnings only if recipes routinely produce surprising results.
7. **Preview latency.** Side-by-side preview in the editor requires both source recipes' payloads to be expanded. For interactive editing that is two payload builds per recipe change. Recommendation: cache expanded source payloads keyed by recipe id + content hash; only re-expand when the source changes.

## How this closes

- **ADR-042 — Recipe morphing: schedule + interpolation.** Locks the `morph:` schema (sources + schedule), the polymorphic schedule weight, the payload distribution model (both source payloads + morphed result arrays), and the cross-validation contract.
- **ADR-043 — Per-parameter morph rules + sample crossfade.** Locks the per-parameter morph rule table (numeric / enum / envelope / clock / macro / sample), the enum default (snap at midpoint, crossfade opt-in), the output-array envelope morph approach, the audio crossfade implementation (parallel engines mixed by weight), and the editor's per-parameter override surface.

Closure trigger: Phase 1 implementation forces the schema decision once two ambient-identity recipes morph end-to-end with audible crossfade and visual interpolation, cross-validated TS ↔ Py.

## Links

- **Source** — Absynth wavetable morphing concept applied at the recipe level · Moments morphing transitions ("intimate vulnerability to expansive cinematic bloom") observation
- **TA** — components/render-system · components/pipeline · components/web-frontend · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-012 Atmospheric audio · RFC-014 Modulation graph · RFC-015 Bloom · RFC-017 Recipe-level macros
- **Related ADRs** — ADR-032 · ADR-033 · ADR-034 · ADR-035 · ADR-036 · ADR-037 · ADR-038 · ADR-041
