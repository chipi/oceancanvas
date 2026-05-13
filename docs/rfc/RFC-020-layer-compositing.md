# RFC-020 — Multi-source layer compositing

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · RFC-012 Atmospheric audio (audio counterpart for layer architecture) · RFC-014 Modulation graph · RFC-016 Motion clocks · RFC-019 Visual identity + post-FX (paired companion)
> **Closes into** · ADR-043 (Layer compositing primitive), ADR-044 (Feedback layer + accumulator semantics)
> **Why this is an RFC** · The current renderer produces one sketch's output per frame. Multi-source compositions — SST gradient *with* particle field *with* tracks scatter *with* a coastline outline *with* accumulated motion trails — are not expressible. The audio side has had five parallel layers since RFC-012; the visual side has had one. The aesthetic research on Ikeda / Viola / Akten surfaced the same primitive from three different angles — a **feedback buffer with parameterised fade** is what makes Akten's accumulated trails feel like Akten, what makes Ikeda's hard-cut grids feel like Ikeda (fade = 0 = no accumulation), and what gives every long-form ambient piece visual breath. The architectural questions are real: how layer order maps to compositing semantics, how feedback layers interact with deterministic rendering when they depend on prior frames, what the schema looks like when blend modes + transforms + envelopes all apply per-layer, and where the renderer's existing single-sketch path fits into the multi-layer model. This RFC is paired with RFC-019 (visual identity + post-FX) — the post-FX bus operates over the composited frame, and the visual identity broadcasts coherent layer defaults.

---

## The question

The five-layer audio architecture in RFC-012 (atmosphere → vocal → drone → pulse → accent) gave the audio side parallel voices with their own envelopes, their own routing, their own perceptual roles. The visual side has nothing equivalent — one sketch per recipe, one frame per timestep, no compositional layering. Any recipe that wants "SST as the bed, tracks as the foreground, particle field for motion, coastline for clarity" has to bake that into a single bespoke sketch.

The aesthetic research on Ikeda / Viola / Akten makes the gap concrete. Three artists, three radically different looks, and each one's signature primitive is a *compositional pattern that requires multi-layer rendering with parameterised feedback*:

- **Akten's accumulated trails** — particles drawn with alpha 0.02–0.08 on a non-cleared buffer, decaying over 60–300 frames. Without a feedback buffer, this is unauthorable.
- **Ikeda's stroboscopic grids** — frames change wholly every 1–3 steps, no easing, hard cuts. A feedback buffer with `fade: 0.0` and `transform_per_step: identity` is exactly this primitive at the other extreme.
- **Viola's submerged subjects** — single-subject centered composition with cross-dissolves between phases. Requires layer transforms (centred anchor) and time-window-based layer transitions.

The architectural question is **how to introduce a multi-layer compositing primitive that supports the existing single-sketch path as a special case (one layer, no feedback), unlocks the three artist primitives above, and integrates cleanly with RFC-014 envelopes + RFC-019 post-FX + RFC-016 clocks.** Four sub-questions sit underneath:

- **Layer types.** A `sketch` layer wraps an existing sketch. A `feedback` layer accumulates with decay. A `texture` layer applies a static medium overlay. A `motion_graphics` layer renders text and markers. Do we ship all four at v1, or stage them?
- **Determinism of feedback.** Feedback layers depend on prior frames — frame N reads from a buffer written at frame N−1. Pipeline rendering is naturally frame-sequential and deterministic; browser preview during scrubbing is *not* (the user can scrub backwards, jump ahead). How does the feedback buffer interact with preview semantics?
- **Compositing semantics.** Layer z-order matters; blend modes matter; opacity envelopes matter. Where does the post-FX bus from RFC-019 sit — over each layer, over the composited frame, or both?
- **Camera as layer-level or recipe-level.** RFC-019 made camera an envelope-able parameter. Does each layer have its own camera (parallax-style), or do all layers share the recipe's single camera (cinematic-style)? Either is valid; the choice has perceptual consequences.

This RFC depends on RFC-019 (post-FX runs over the composited frame) and benefits from RFC-014 envelopes + RFC-016 clocks (per-layer params modulatable). It is the keystone for the Akten / Ikeda / Viola aesthetic primitives the research surfaced.

## Use cases

1. **Akten-style accumulated tracks.** A whale-shark recipe stacks: an SST gradient layer at the bottom, a tracks scatter layer above it with `blend_mode: screen` and `opacity: 0.4`, a `feedback` layer reading from the tracks layer with `fade: 0.96, transform_per_step: { rotation: 0.1° }`. The tracks leave fading rotating ghosts behind them. Akten's signature — directly authorable.
2. **Ikeda-style grid composition.** A minimalist recipe: a single `sketch` layer rendering binary data grids, no feedback (`fade: 0.0`), `nearest_scale` post-FX from RFC-019 preserving the pixel grid. Hard-cut frame-to-frame transitions every 60 frames produce the stroboscopic Ikeda cadence.
3. **Viola-style submerged composition.** A meditative recipe: a centred subject layer with locked transform, a `two_tone_grade` post-FX from RFC-019, a `feedback` layer with very slow decay (`fade: 0.99`) producing the long temporal smear Viola gets from his high-speed source footage.
4. **Cross-modal layer rhythms.** An ambient recipe defines four layers, each with a `clock:` from RFC-016 driving its opacity envelope. The SST layer breathes on annual cycle, the tracks layer pulses on monthly delta, the particle field drifts on ENSO index, the coastline holds steady. Polyrhythmic visual motion mirroring the audio's per-layer clocks.
5. **Single-sketch backward compatibility.** A recipe written before RFC-020 with no `layers:` block renders exactly as before — the renderer treats the recipe's existing sketch as a single implicit layer. No migration burden on legacy recipes.
6. **Motion graphics on key moments.** A recipe declares a `motion_graphics` layer with `on_moments: true`. RFC-007's detected key moments trigger labelled annotations to fade in for 2 seconds at each moment. The data tells its own story without authors hand-placing labels.

## Goals

- **Layer primitive.** A top-level `layers:` block declares an ordered list of layers, each typed (`sketch | feedback | texture | motion_graphics`) with shared params (`opacity`, `blend_mode`, `transform`, `z_order` is implicit from list order).
- **Four layer types at v1.**
  - **`sketch`** — wraps an existing p5/canvas sketch; the renderer's current single-sketch path becomes a one-layer special case.
  - **`feedback`** — accumulator with parameterised fade (0.0–1.0) and optional per-step transform. Single primitive serving Akten (long decay), Ikeda (zero decay), Viola (very slow decay).
  - **`texture`** — static or per-frame medium overlay (film grain, paper, halftone). Bank lives in `visual/textures/` mirroring `visual/luts/`.
  - **`motion_graphics`** — text, markers, annotations triggered by key moments or time positions.
- **Per-layer envelopes/clocks/macros.** Every layer's `opacity`, `blend_mode`-mix, `transform.scale | rotation | offset` accepts scalar | envelope | clock | macro per RFC-014/016/017 polymorphism.
- **Blend modes.** Standard set: `normal | multiply | screen | add | overlay | soft_light`. Implementable via ffmpeg `blend` filter and browser CSS/WebGL compositing.
- **Feedback determinism.** Feedback buffer state is a function of (layer config, prior frames). The pipeline renders sequentially (trivially deterministic). The browser preview pre-computes a "feedback history" on first play and seeks within it (predictable scrub behaviour).
- **Camera shared at recipe level.** RFC-019's camera is recipe-wide; layers do not have per-layer cameras at v1. Per-layer camera (parallax) is a future extension if a use case surfaces.
- **Post-FX over composite.** RFC-019's post-FX bus runs over the *composited* frame, not per-layer. Per-layer FX is a possible v2 extension; v1 keeps it simple.
- **Backward compatibility.** Recipes without a `layers:` block continue to render via their existing single sketch — no implicit layer required, the renderer detects the legacy path.

## Constraints

- **Recipe YAML as source of truth** (TA constraints).
- **Self-hostable** (TA constraints).
- **Deterministic at pipeline export level** (TA constraints). Feedback layers are deterministic given sequential rendering; browser preview has predictable but possibly-non-bit-identical scrub behaviour.
- **Texture asset bank** mirrors RFC-012's vocal sample / RFC-019's LUT discipline — `visual/textures/<name>/metadata.yaml` with license gate, provenance, BOM.
- **Cross-validated TS ↔ Py at perceptual tolerance** for composited output. ADR-027 / RFC-019 tolerance extends.
- **Performance bound.** N-layer compositing increases render time roughly linearly with layer count. Target: ≤ 8 layers per recipe before perceptual responsiveness degrades.

## Proposed approach

### Layer primitive

```yaml
layers:
  - id: sst_base
    type: sketch
    sketch: field                              # references sketches/field.js
    opacity: 1.0
    blend_mode: normal
    transform: { scale: 1.0, rotation: 0.0, offset: [0, 0] }

  - id: tracks
    type: sketch
    sketch: scatter
    opacity: 0.8
    blend_mode: screen
    transform: { scale: 1.0, offset: [0, 0] }

  - id: tracks_ghost
    type: feedback
    source_layer: tracks                       # reads the buffer of tracks layer
    fade: 0.96                                 # per-frame decay factor [0, 1]; 0=hard wipe (Ikeda), 1=infinite trails
    transform_per_step:                        # optional per-frame transform applied to feedback buffer
      rotation: 0.1                            # degrees per frame
      scale: 1.001                             # gentle scale
    blend_mode: screen
    opacity: 0.5

  - id: paper
    type: texture
    source: paper_warm                         # references visual/textures/paper_warm/
    blend_mode: multiply
    opacity: 0.25

  - id: annotations
    type: motion_graphics
    on_moments: true                           # appears on RFC-007 detected moments
    template: data_label
    fade_in_seconds: 0.5
    hold_seconds: 2.0
    fade_out_seconds: 1.5
```

List order is z-order: earlier entries are behind, later entries are in front. The composited frame is the in-order blend of all layers.

### Sketch layer

The existing renderer's single-sketch path becomes a one-layer special case. A recipe without `layers:` declared and with the legacy `render: { type: field, ... }` block renders as before — the new path treats the legacy block as if it were:

```yaml
layers:
  - id: __legacy
    type: sketch
    sketch: field
    opacity: 1.0
    blend_mode: normal
```

This is the migration story. Authors who want layered composition explicitly opt in by writing `layers:`; legacy recipes continue to render byte-identically.

### Feedback layer — the keystone primitive

The single most important new primitive in this RFC. Reads from another layer's render buffer (or the composited buffer up to its z-order) and accumulates with parameterised fade:

```
buffer[t] = fade * transform(buffer[t-1]) + source[t]
```

Parameters:

- `source_layer` — name of the layer whose buffer to read. Use `__composite_below` to read everything below this layer's z-order.
- `fade` — `[0.0, 1.0]`. 0.0 hard-wipes the buffer each frame (no accumulation; identical to source_layer); 1.0 never decays (infinite trails). Akten uses 0.95–0.98; Viola 0.99+; Ikeda 0.0.
- `transform_per_step` — optional `{ rotation, scale, offset }` applied to the buffer between frames. Gives subtle drift to accumulated trails.
- `blend_mode`, `opacity` — standard layer compositing into the final frame.

The single primitive serves three radically different aesthetics by parameterising one number (`fade`). That's why it's the keystone.

Determinism: pipeline renders frames in order, the buffer is naturally the previous frame's accumulator. Browser preview pre-computes a feedback array on first play; scrubbing seeks within it. Editing parameters in the editor invalidates the array and re-computes lazily on next play.

### Texture layer

```yaml
- id: paper
  type: texture
  source: paper_warm
  blend_mode: multiply
  opacity: 0.25
  regen: static                                 # static (default) | per_frame
```

`visual/textures/<name>/<name>.png` + `metadata.yaml`. Same provenance + license + lifecycle discipline as LUTs (RFC-019) and vocal samples (RFC-012). Open-licensed textures from MIT-FilmGrade or freesound-equivalent sources.

`regen: per_frame` re-tiles the texture with random offset each frame — produces moving grain for the Akten / painterly use case.

### Motion graphics layer

```yaml
- id: annotations
  type: motion_graphics
  on_moments: true                              # triggers on each detected moment
  # OR
  on_schedule:                                  # explicit time positions
    - { t: 0.2, text: "Annual peak" }
    - { t: 0.7, text: "Dispersal phase" }
  template: data_label                          # data_label | title_card | progress_bar | marker
  fade_in_seconds: 0.5
  hold_seconds: 2.0
  fade_out_seconds: 1.5
  position: { x: 0.05, y: 0.92 }                # normalised frame coordinates
  font: ocean_sans                              # references visual/fonts/
```

`data_label` shows the data value and date at trigger time. `title_card` shows arbitrary text. `progress_bar` shows render progress. `marker` is a small visual indicator at a screen position.

Templates are project-shipped. Font bank in `visual/fonts/<name>/` with license-gated discipline.

### Per-layer modulation

Every layer's params are polymorphic per RFC-014:

```yaml
- id: vocal_pulse_visual
  type: sketch
  sketch: particles
  opacity:
    envelope: vocal_bloom                       # reuse the audio's vocal envelope visually
  blend_mode: screen
  transform:
    scale: { clock: monthly_delta_clock }       # data-driven scale via RFC-016
```

Macros (RFC-017) can target layer params for cross-modal coordination — `intensity` macro broadcasting to both `audio.atmosphere` and `layers.tracks_ghost.opacity` gives one-knob control over how much "history" the visual shows.

### Compositing pipeline

```
1. Each non-feedback layer renders to its own buffer (sketch / texture / motion graphics output)
2. Layers composite in order via blend modes + opacity
3. Feedback layers read from (a) named source_layer's buffer or (b) the composite buffer below their z-order
4. Feedback buffer updates with fade + transform + new contribution
5. Feedback layer's buffer composites into the running composite
6. Continue through remaining layers in z-order
7. Composited frame enters RFC-019's post-FX chain
8. Post-FX'd frame is the final exported frame
```

Pipeline implementation: ffmpeg `filter_complex` for sketch composition + a small Python loop for feedback (numpy buffers, frame-by-frame). Browser implementation: WebGL framebuffer ping-pong for feedback, canvas/WebGL compositing for non-feedback layers.

### Distribution — payload extension

```json
{
  "version": 3,
  "visual": {
    "layers": [
      { "id": "sst_base", "type": "sketch", ... },
      { "id": "tracks", "type": "sketch", "opacity": [0.8, 0.81, ...] },
      { "id": "tracks_ghost", "type": "feedback", "fade": 0.96, "source_layer": "tracks", ... },
      ...
    ]
  }
}
```

Per-layer envelope-resolved arrays travel under the layer's own block. Feedback layer params are scalar (`fade`, `transform_per_step`) or envelope-resolved like any other.

### Editor UX

Three additions in the Video Editor's visual panel:

- **Layer list** — a vertical stack of cards (one per layer) showing layer type, id, blend mode, opacity. Drag-to-reorder changes z-order. Click "+ layer" to add from a typed dropdown (sketch / feedback / texture / motion graphics).
- **Per-layer detail** — clicking a layer opens its detail panel with type-specific controls (sketch selection, feedback source/fade/transform, texture picker, motion graphics template).
- **Feedback preview** — a small "show feedback buffer" toggle on feedback layers shows the buffer state as a thumbnail next to the live preview, useful for tuning fade values.

The five-button identity selector from RFC-019 broadcasts layer defaults when an identity changes — selecting `cinematic` could add a feedback layer with Akten-style fade; selecting `minimalist` could remove it.

### Cross-validation

`tests/cross-validation/visual_layers/` fixtures cover:

- Single-sketch layer (legacy path equivalent) — sanity
- Two sketch layers with different blend modes
- Feedback layer with fade = 0.0 / 0.5 / 0.95 / 0.99 (Ikeda / mid / Akten / Viola)
- Feedback layer with transform_per_step (rotation, scale, offset)
- Texture layer with static vs per_frame regen
- Motion graphics on RFC-007 moments
- Per-layer envelope on opacity
- Per-layer clock on transform scale

Coverage at v1: ~30 fixtures. Tolerance: SSIM ≥ 0.98 per frame between pipeline and browser, matching RFC-019.

## Alternatives considered

### Alternative — single sketch with multi-source baked in

Instead of multi-layer compositing at the renderer level, extend each sketch to accept multiple data sources internally and render them in one pass. No layer primitive at the recipe level.

Rejected. Forces every sketch to duplicate compositing logic. Feedback would need to be implemented inside each sketch separately. Reuse across sketches becomes impossible. The whole point of a compositing primitive is one implementation, many sketches.

### Alternative — feedback as a post-FX, not a layer

Treat accumulated trails as a frame-buffer effect in RFC-019's post-FX chain rather than a layer type.

Rejected. The aesthetic primitive is "this layer accumulates," not "the whole frame accumulates." Akten's tracks-with-trails example has the SST base layer rendering fresh each frame while the tracks layer accumulates — a frame-level post-FX cannot express that. Per-layer feedback is the right level of abstraction.

### Alternative — per-layer camera (parallax)

Each layer has its own camera; layers can move independently. Real parallax effects become authorable.

Rejected for v1. Real parallax authoring is rich and complex (foreground/midground/background depth assignment, motion blur per layer, focus depth) and the use case is speculative. Recipe-level camera covers most cinematic needs. Per-layer camera is a future extension if recipes consistently want depth.

### Alternative — per-layer post-FX chains

Each layer has its own post-FX chain in addition to the composite-level chain.

Rejected for v1. The composite-level chain in RFC-019 already covers the majority of authoring needs. Per-layer post-FX doubles the schema surface and the cross-validation fixture set. Treat as future extension if recipes consistently want pre-composite per-layer FX.

### Alternative — implicit feedback (no source_layer required)

Feedback layers always accumulate from the composite below them; explicit `source_layer:` reference is removed.

Rejected. Akten's specific look is feedback on *one* layer (the particles) while other layers (the gradient bed) render fresh. Implicit "feedback on composite below" loses that authoring affordance. Explicit `source_layer` (with `__composite_below` available as a special value) is more flexible.

### Alternative — defer motion graphics layer to a follow-up RFC

Ship the three core layer types (sketch / feedback / texture); motion graphics waits for its own RFC with more design depth.

Considered. Counter-argument: motion graphics is mechanically simple (text rendering over a frame) and has direct use cases tied to RFC-007 key moments. Bundling it now costs little and delivers concrete value (data annotations on detected events). Ship it.

### Alternative — N-layer feedback chain (feedback reads feedback)

A feedback layer's source can be another feedback layer, producing recursive accumulation.

Deferred to a future revision. The schema allows it (the source_layer field just names a layer); the implementation needs careful determinism analysis. Defer until a recipe demands it.

## Trade-offs

- **Render pipeline complexity grows.** Multi-layer compositing in ffmpeg `filter_complex` is more elaborate than single-sketch rendering; feedback buffer management is new infrastructure. Worth it for the expressivity gain.
- **Feedback buffer is a state primitive.** Until now, every frame was a pure function of (recipe, frame_index, data). Feedback breaks that — frame N depends on frame N−1. The pipeline sequential rendering handles this naturally; the browser scrubbing model needs a feedback array cache. Real but bounded complexity.
- **Texture asset bank — third asset class to maintain.** After vocal samples (RFC-012) and LUTs (RFC-019), textures add another bank with metadata, license gates, BOM. The discipline scales but the maintenance is real.
- **Schema growth — yet again.** The `layers:` block is substantial. Documentation has to make the per-layer-type schema legible.
- **Cross-validation tolerance budget shrinks.** Each new layer compounds the perceptual divergence between pipeline and browser. SSIM 0.98 was the RFC-019 target; with feedback layers the practical floor may be 0.96. Worth measuring on first fixture runs.
- **Performance cost scales with layer count.** Eight-layer recipes will render meaningfully slower than one-layer. Authors with many layers should expect ~2–4× render time. Acceptable for offline batch.
- **Legacy path remains supported.** The single-sketch fallback adds a renderer branch. Worth the backward compat; not a long-term burden.

## Open questions

1. **Maximum layer count.** Target ≤ 8 layers based on perceptual responsiveness; hard cap or soft warning? Recommendation: soft warning at 8, hard cap at 16 to prevent runaway.
2. **Feedback transform_per_step composition order.** Currently `transform` then `fade`. Should it be the reverse for some aesthetics? Recommendation: ship transform-first at v1; revisit if results feel wrong.
3. **Source_layer rendering order.** A feedback layer must come after its source_layer in the list. Validation at parse time, error message clear? Yes.
4. **Motion graphics template extensibility.** Four templates ship. Custom templates via user-provided HTML/SVG? Recommendation: project-shipped only at v1; user templates is a richer scoping discussion.
5. **Layer-level macros.** A macro could target an entire layer (turning on/off a feedback layer based on macro position above/below 0.5). Achievable via opacity envelope; explicit layer enable/disable as a macro target is more discoverable. Recommendation: ship via opacity at v1; explicit enable is a fast-follow.
6. **Camera-on-layer for future RFC.** Per-layer transforms (`scale`, `rotation`, `offset`) provide *some* of what per-layer cameras give. The distinction is parallax — different layers receive different perspective projections. Defer until a recipe wants real parallax.
7. **Feedback layer in browser preview during scrub.** Pre-computing the feedback array works for sequential play. Scrubbing backwards requires either keeping the full array in memory (expensive at high resolutions) or accepting visual lag during scrub. Recommendation: keep full array for previews up to ~5 min; degrade gracefully for longer.
8. **Bloom integration with feedback.** When bloom (RFC-019) runs over a composited frame containing feedback trails, the trails themselves bloom. Authors may want bloom on the dry source layer, not the accumulated one. Per-layer post-FX (deferred above) would solve this. Recommendation: accept the v1 behaviour as a known limitation.

## How this closes

- **ADR-043 — Layer compositing primitive.** Locks the `layers:` schema (four layer types: sketch / feedback / texture / motion_graphics), the per-layer parameter polymorphism, the blend mode catalogue, the z-order semantics, the legacy single-sketch fallback path, and the compositing pipeline order.
- **ADR-044 — Feedback layer + accumulator semantics.** Locks the feedback layer's evaluation (`buffer[t] = fade * transform(buffer[t-1]) + source[t]`), the source_layer reference rules, the transform_per_step semantics, the determinism contract (pipeline sequential, browser pre-computed cache), and the cross-validation fixture set for feedback.

Closure trigger: Phase 1 implementation forces the schema decisions once the pipeline + browser composite a four-layer recipe with at least one feedback layer end-to-end, and the RFC-019 post-FX chain runs over the composited output for each of the five identities.

## Links

- **Source** — RFC-012 *Atmospheric audio* (five-layer audio architecture; visual analogue) · Ikeda / Viola / Akten aesthetic research surfacing the feedback primitive · TouchDesigner feedback loops + Notch node-graph compositing as reference architectures
- **TA** — components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-012 Atmospheric audio · RFC-014 Modulation graph · RFC-016 Motion clocks · RFC-017 Recipe macros · RFC-019 Visual identity + post-FX (paired)
- **Related ADRs** — ADR-027 · ADR-029 · ADR-031 · ADR-032 · ADR-033 · ADR-041 · ADR-042
