# RFC-019 — Visual identity + post-process bus

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · RFC-012 Atmospheric audio (audio counterpart) · RFC-013 Editor controls · RFC-014 Modulation graph · RFC-017 Recipe macros · RFC-018 Recipe morphing · RFC-020 Layer compositing (paired companion)
> **Closes into** · ADR-044 (Visual identity + post-FX chain), ADR-045 (LUT bank + provenance)
> **Why this is an RFC** · The seven-RFC arc that landed in commit `dd755a4` rebuilt the audio side from a single-tone-on-pulses identity into a five-layer ambient bed with atmospheric processing and a vocal anchor. The visual side never received the same treatment. The renderer today produces a sketch's frames and applies a small set of ffmpeg filters (eq, vignette) before encoding — closer to a screen-recording than to the cinematic / painterly / minimalist visual identities the new audio identity wants alongside. Adopting NI's design philosophy on the visual side requires a *visual identity* switch (parallel to `audio.identity`), a *post-FX bus* (parallel to the atmosphere bus), and a *Cloud-Filter-style always-on subtle drift* on visual parameters. The architectural questions are real: where post-FX runs (ffmpeg vs. browser shaders vs. both), how to keep TS ↔ Py parity under floating-point divergence, what the LUT/color-grade primitive looks like, and how the camera (currently static-per-recipe) becomes a first-class envelope-able primitive. This RFC is paired with RFC-020 (layer compositing) — the post-FX bus operates over composited frames, and the identity switch only fully expresses itself when the layer stack supports it.

---

## The question

PRD-006 frames the video as a piece a viewer can settle into. The audio side now does that — RFC-012's atmospheric identity removed the "hardcore electro minimalism" the user identified. The video side still produces frames that read as *output of a renderer*: sharp edges, neutral exposure, no atmospheric depth, no characteristic medium. A still from any current recipe looks like every other still from any current recipe with palette changes — the *grade*, the *texture*, the *light* are uniform across the catalogue.

The architectural question is **how to introduce a visual identity primitive that broadcasts coherent visual character across multiple parameters, and a post-process bus that gives the rendered frames characteristic depth (atmospheric glow, grain, color grading, vignette, subtle drift) without abandoning the file-based recipe model or the deterministic-rendering contract.** Four sub-questions sit underneath:

- **Implementation surface.** Browser preview wants real-time post-FX (WebGL/WebGPU shaders are fast and authentic to the medium). Pipeline export wants deterministic post-FX (ffmpeg `filter_complex` is byte-stable but slower). Do both implementations run the same effects, or does the pipeline canonically encode while the browser approximates?
- **Determinism under floating-point divergence.** GPU and CPU floating-point implementations of the same shader produce visually indistinguishable but bit-different outputs. ADR-027's "perceptually identical" tolerance covers audio; visual has historically been byte-identical. Should visual relax to perceptual tolerance for post-FX, or hold byte-identical via pipeline-canonical encoding?
- **LUT primitive.** Color grading is the single largest perceptual lever for identity. Industry-standard `.cube` 3D LUTs are universally supported but heavy; tone-curve YAML is lighter but expressively narrower. Which lives in the recipe?
- **Camera as parameter.** The camera (pan, zoom, rotation) is currently a static-per-recipe choice baked into the sketch. Making it an envelope-modulatable layer is a large enabler for cinematic motion, but it touches every sketch.

This RFC depends on RFC-014 (envelopes drive post-FX params), interacts with RFC-017 (macros broadcast visual identity), and is paired with RFC-020 (layer compositing — post-FX operates over composited frames).

## Use cases

1. **Cinematic identity.** An author selects `visual.identity: cinematic` on a five-minute whale-shark recipe. Defaults change coherently: bloom intensity ~0.4, film grain density ~0.15, vignette intensity ~0.3, color grade applies a warm "ocean_warm" LUT, camera slowly orbits the data region. The same data renders with depth, atmosphere, and motion that the previous flat output lacked.
2. **Minimalist identity (Ikeda-leaning).** A second recipe uses `visual.identity: minimalist`. Defaults invert: bloom 0.0, grain 0.0, vignette 0.0, color grade applies a high-contrast monochrome LUT, camera static. Same data, completely different identity — and the schema's primitives shift coherently with one switch.
3. **Color grade as envelope.** A recipe wants the palette to warm across the video's duration — a long sunset feel. `visual.color_grade.lut` is an envelope referencing two LUTs: `ocean_cool` at t=0 transitioning to `ocean_warm` at t=1. The grade interpolates frame-by-frame.
4. **Camera as macro target.** RFC-017's `intensity` macro adds `visual.camera.zoom` to its target list with weight 0.3. As intensity rises, the camera gently pushes in alongside atmosphere swelling and vocal blooming. One knob → cross-modal coordinated motion.
5. **Always-on subtle drift.** Cloud Filter analogue. A held still frame never sits perfectly still — the post-FX bus applies ~1% displacement on a 20-second sine LFO, giving every frame imperceptible breath. The viewer doesn't see the drift consciously; they feel the difference between this and a static export.
6. **Provenance-aware LUT bank.** A LUT downloaded from MIT-FilmGrade or freely licensed lives in `visual/luts/<name>/`. CI gates license; BOM in `visual/ATTRIBUTION.md` (peer to `audio/ATTRIBUTION.md`) regenerates from per-LUT metadata.

## Goals

- **Visual identity switch** — top-level `visual.identity:` that broadcasts coherent defaults across post-FX, camera, and (via RFC-020) layer architecture. Identity values at v1: `cinematic | minimalist | meditative | painterly | technical`. Each identity grounded in a specific reference aesthetic (Akten / Ikeda / Viola / generic painterly / Ikeda variant) so defaults compose coherently rather than averaging into mush.
- **Post-FX chain primitive** — an ordered list of effects with per-effect parameters, every parameter polymorphic per RFC-014 (scalar / envelope / clock / macro).
- **LUT bank with provenance** — `visual/luts/<name>/<name>.cube` + `metadata.yaml`. License gate at build time: open licenses only.
- **Camera as envelope-able layer** — pan / zoom / rotation / orbit are parameters. Driven by scalars at v1; envelope/clock/macro per RFC-014/016/017.
- **Always-on subtle drift** — a project-shipped Cloud-Filter-equivalent default envelope applied to one or two visual params per identity. "The frame never sits still."
- **Cross-validated TS ↔ Py at perceptual tolerance.** Pipeline ffmpeg is canonical for export; browser shaders are best-effort match for preview. ADR-027's tolerance language extends to visual post-FX.
- **Deterministic at pipeline level.** Same recipe + same data + same seed → byte-identical exported video. Browser preview may diverge within tolerance.
- **No regression on existing renders.** Recipes without `visual.identity:` declared (legacy, hand-authored before the switch) render exactly as before — empty post-FX chain, static camera, no grade.

## Constraints

- **Recipe YAML as source of truth** (TA constraints).
- **Self-hostable** (TA constraints). All effects run locally; LUTs ship with the bank.
- **Deterministic at pipeline export level** (TA constraints). Browser preview tolerance per ADR-027.
- **License compliance** for LUT assets — same CC0 / CC-BY / NOAA-PD-or-equivalent gate as RFC-012's vocal samples.
- **No bundle explosion in browser** — shader pipeline keeps preview cost bounded. Target: post-FX bus adds ≤ 5MB to the gallery bundle.
- **ffmpeg is the canonical encoder.** The pipeline uses `filter_complex` for the FX chain; the browser approximates via shaders for preview but never authors the final encode.

## Proposed approach

### Visual identity switch

Top-level addition to the recipe schema:

```yaml
visual:
  identity: cinematic       # cinematic (default) | minimalist | painterly | technical
```

The identity broadcasts a coherent set of defaults across `post_fx`, `camera`, and (via RFC-020) `layers`. Identity is one of the macro-style abstractions Moments uses — one knob shifting many params. Identity acts as a defaults provider; explicit per-parameter overrides in the recipe win.

The identity defaults table is project-shipped in `visual_identity_defaults.yaml`:

```yaml
cinematic:               # Akten-leaning: accumulated motion, soft glow, chromatic separation
  post_fx:
    chain:
      - { type: bloom,                 intensity: 0.5, threshold: 0.45 }     # whole-field bloom, low threshold
      - { type: chromatic_aberration,  amount: 0.004, source: velocity }    # separation along flow
      - { type: grain,                 density: 0.10, size: small, regen: per_frame }
      - { type: vignette,              intensity: 0.3, softness: 0.6 }
      - { type: color_grade,           lut: ocean_warm }
  always_on:
    subtle_drift: { filter: lowpass_displacement, depth: 0.05, period_seconds: 20 }
  camera:
    motion: slow_orbit

minimalist:              # Ikeda-leaning: binary, monospaced, stroboscopic
  post_fx:
    chain:
      - { type: threshold_binarize, threshold: 0.55 }
      - { type: nearest_scale,      factor: 1.0 }                            # preserve pixel grid
      - { type: scanline,           intensity: 0.10, frequency: 480 }
  always_on:
    subtle_drift: null               # explicitly disabled — minimalism wants stillness
  camera:
    motion: static

meditative:              # Viola-leaning: submerged palette, slow temporal dilation, highlight bloom only
  post_fx:
    chain:
      - { type: bloom,           intensity: 0.4, threshold: 0.88 }           # highlights only
      - { type: two_tone_grade,  shadow_tint: "#0A1820", highlight_tint: "#E8C098", crush: 0.6 }
      - { type: vignette,        intensity: 0.5, softness: 0.8 }
  always_on:
    subtle_drift: { filter: lowpass_displacement, depth: 0.02, period_seconds: 40 }     # slower, gentler
  camera:
    motion: static       # Viola-style locked single-subject composition

painterly:
  post_fx:
    chain:
      - { type: bloom,        intensity: 0.6, threshold: 0.5 }
      - { type: blur_radial,  amount: 0.02, falloff: 1.2 }
      - { type: grain,        density: 0.25, size: medium, regen: per_frame }
      - { type: color_grade,  lut: painterly_warm }

technical:
  post_fx:
    chain:
      - { type: scanline, intensity: 0.15 }
      - { type: chromatic_aberration, amount: 0.003, source: centre }
  always_on:
    subtle_drift: null
```

### Post-FX chain primitive

```yaml
visual:
  identity: cinematic              # provides defaults
  post_fx:
    chain:                          # ordered list; later effects apply on top
      - { type: bloom,        intensity: 0.5, threshold: 0.65 }   # override the cinematic default
      - { type: grain,        density: 0.20 }
      - { type: vignette,     intensity: 0.4 }
      - { type: color_grade,  lut: { envelope: warmth_drift } }   # envelope-modulated LUT blend
    macro: visual_intensity         # optional macro that broadcasts to multiple effects' params
```

Each effect has a declared parameter set. Parameters accept scalar | envelope | clock | macro per RFC-014 polymorphism. The `macro:` field on the chain lets one knob coordinate multiple effects' params (the visual analogue of RFC-017's audio macros). Chain order matters and is preserved.

Initial effect catalogue at v1:

| Effect | Params | Notes |
|---|---|---|
| `bloom` | intensity, threshold, radius | Brightness extraction + gaussian blur + composite. Threshold range matters: 0.85+ produces Viola-style highlight-only glow; 0.4–0.5 produces Akten-style whole-field bloom. |
| `glow` | intensity, falloff | Soft halo around bright areas; distinct from bloom |
| `chromatic_aberration` | amount, falloff, source | RGB channel offset. `source: centre` produces lens-style edge tint; `source: velocity` separates along the underlying flow field's vector (Akten primitive). |
| `grain` | density, size, color, regen | Film grain — monochrome or color. `regen: per_frame` (default) regenerates noise each frame; `regen: static` is cheaper but reads as a fixed overlay. |
| `vignette` | intensity, softness, shape | Edge darkening; existing primitive extends |
| `color_grade` | lut, opacity | LUT-based 3D color transform |
| `two_tone_grade` | shadow_tint, highlight_tint, crush | Submerged-palette primitive distinct from full LUT: shadows lifted toward one hue, highlights pushed toward another, midtones crushed. Viola's signature look. |
| `threshold_binarize` | threshold, gamma | 1-bit luminance reduction — Ikeda primitive. Hard-cuts every pixel above the threshold to white, below to black. Use `nearest_scale` after for pixel-grid integrity. |
| `nearest_scale` | factor | Nearest-neighbour upscale/downscale that preserves sharp pixel edges — essential for Ikeda-style grids; bilinear scaling destroys the look. |
| `blur_radial` | amount, falloff | Soft focus toward edges |
| `scanline` | intensity, frequency | Horizontal-line overlay (technical / Ikeda) |
| `displacement` | amount, scale, source | Subtle warp driven by a noise/clock source |

Effects are pipeline-canonical via ffmpeg `filter_complex`; browser previews via fragment shaders.

### LUT bank

LUT layout mirrors RFC-012's vocal sample bank:

```
visual/
  luts/
    ocean_warm/
      ocean_warm.cube         # standard .cube 3D LUT, 17³ or 33³
      metadata.yaml
    mono_high_contrast/
      mono_high_contrast.cube
      metadata.yaml
    painterly_warm/
      ...
  textures/                    # for RFC-020 texture layers
    paper_warm/
      ...
  ATTRIBUTION.md               # regenerated from metadata.yaml files
```

`metadata.yaml` schema:

```yaml
name: ocean_warm
source_url: https://...
source_organisation: MIT FilmGrade
license: CC0
attribution: "ocean_warm LUT, MIT FilmGrade, CC0"
sha256: 9c4f...
lut_size: 33
notes: "Warm-leaning ocean tone, gentle contrast lift"
```

License gate runs at build: `license ∈ {CC0, CC-BY, NOAA-PD or equivalent gov-PD}` — same rules as RFC-012.

LUT lifecycle: versioned in name (`ocean_warm_v1`), deprecation flag in metadata, CI cross-references each recipe's LUT references against the bank.

### Camera as envelope-able layer

The camera moves from static-per-recipe sketch parameter to first-class envelope-able primitive:

```yaml
visual:
  camera:
    pan:    0.5                                   # scalar — static centre
    zoom:   1.2                                   # scalar — fixed zoom
    rotation: 0.0
    motion: slow_orbit                            # named built-in motion preset (identity defaults)
    # OR each param can be envelope/clock/macro:
    pan:
      envelope:
        points:
          - { t: 0.0, v: 0.3 }
          - { t: 1.0, v: 0.7 }
    zoom: { macro: intensity }                    # cross-modal macro coordination
```

Built-in camera motion presets (project-shipped):

```
static          — no motion
slow_pan_right  — left to right at 0.05/min
slow_orbit      — gentle rotation + zoom on a circle
push_in         — slow zoom in across duration
breathe         — slow zoom in/out on a long LFO
```

Each preset is a registry-defined combination of param envelopes. Authors who want custom motion override individual params with their own envelopes.

Sketches consume the camera state through a small `getCamera(frame)` API that returns `{ pan, zoom, rotation }`. The existing sketches gain the API call; renders incorporate the camera as a viewport transform.

### Always-on subtle drift (Cloud Filter analogue)

A project-shipped default envelope applied to one visual parameter per identity — typically a low-pass displacement on the post-FX output. Default for `cinematic`:

```yaml
always_on:
  subtle_drift:
    filter: lowpass_displacement
    depth: 0.05                                   # max ±5% pixel offset
    period_seconds: 20                            # one breath cycle every 20s
    waveform: sine
```

The drift adds a slow, low-depth wobble that prevents dead air on long held frames — the visual analogue of the Cloud Filter in RFC-012's atmosphere bus. Authors disable it explicitly with `always_on: null` (the `minimalist` identity does this by default).

### Implementation surface

- **Pipeline (canonical export):** Python composes the post-FX chain into an ffmpeg `filter_complex` graph at render time. Each effect type has a registered Python function that emits its filter fragment with per-frame keyframes for envelope-modulated params (1Hz sampling, same model as RFC-011's tension arc).
- **Browser (preview):** WebGL fragment shaders implement each effect. The shader pipeline composes effects in order; envelope-modulated params drive uniforms per frame.
- **Cross-validation:** *Perceptual tolerance* per ADR-027. The pipeline output is canonical for export; browser preview is allowed to differ within a structural similarity threshold (SSIM ≥ 0.98 per frame across the validation fixture set). Byte-identical guarantee shifts from per-engine to per-export-path.

LUT handling differs between paths: ffmpeg has `lut3d` filter consuming `.cube` files directly; the browser's WebGL path applies LUTs as 3D textures.

### Distribution — payload extension

The render payload gains a `visual:` field with the resolved identity defaults + author overrides + expanded envelope arrays for FX params:

```json
{
  "version": 3,
  "visual": {
    "identity": "cinematic",
    "post_fx_chain": [
      { "type": "bloom", "params": { "intensity": [0.4, ..., 0.4], "threshold": 0.7 } },
      ...
    ],
    "camera": { "pan": [0.3, ..., 0.7], "zoom": 1.2, "rotation": 0.0 },
    "lut_refs": ["ocean_warm"]
  }
}
```

Effects' time-varying params arrive as per-frame arrays (same model as `envelopes:`). Static params arrive as scalars. LUT references are resolved at the browser/pipeline boundary against the bank.

### Editor UX

Three additions in the Video Editor:

- **Identity selector** — top of the visual panel, four-button group for the v1 identities. Selecting an identity re-evaluates defaults; per-effect overrides remain.
- **Post-FX chain editor** — ordered list of effect cards with per-effect parameter controls (RFC-013 knobs). Drag to reorder; click to enable/disable; click "+ effect" to add from the catalogue.
- **LUT picker** — browses the LUT bank with thumbnail previews (the bank ships pre-rendered thumbnail PNGs alongside `.cube` files). Selected LUT applied to the live preview.

Camera authoring lives in a small dedicated panel within the visual section — three sliders + a motion-preset dropdown, or "advanced" to drop into RFC-014 envelopes.

### Cross-validation

`tests/cross-validation/visual_post_fx/` fixtures cover:

- Each effect with default params (sanity baseline, ~10 fixtures)
- Effects in chain (combinations of 2-3 effects, ~15 fixtures)
- LUT application across identities (5 LUTs × 4 identities = ~20 fixtures)
- Envelope-modulated effect param (e.g. bloom intensity sweeping over duration, ~5 fixtures)
- Always-on drift presence/absence per identity (4 fixtures)

Coverage at v1: ~50 fixtures. Tolerance: SSIM ≥ 0.98 per frame between ffmpeg pipeline output and browser WebGL output for each fixture.

## Alternatives considered

### Alternative — browser shaders as canonical encoder

The browser renders the final frame including post-FX via WebGL; ffmpeg only encodes the supplied frames.

Rejected. Browser GPU rendering is non-deterministic across machines (driver differences, GPU floating-point semantics, anti-aliasing variations). The pipeline's ffmpeg is genuinely deterministic across runs. We sacrifice browser-side preview fidelity for export-side reproducibility — that's the right trade. Pipeline canonical, browser preview-only.

### Alternative — single global post-FX preset, no chain

A simple `visual.post_fx_preset: cinematic | minimalist | …` that selects a fixed bundle of effects. No per-effect parameter overrides, no chain editing.

Rejected. The whole RFC-013 + RFC-014 + RFC-017 arc commits to *fine parameter authoring* on top of macro defaults. Treating visual FX as a coarse preset is inconsistent with the audio side, which gives authors deep parameter access. The identity switch already provides the coarse default; the chain gives the fine control on top.

### Alternative — tone curves instead of `.cube` LUTs

Lighter-weight color grading via tone curves authored in YAML (RGB curves, contrast, lift/gamma/gain).

Rejected. Tone curves cover roughly 60% of grading needs and miss most of the *characteristic* grades that make identity feel real (the painterly desaturate-then-warm move is hard to express as a tone curve). `.cube` LUTs are universal and small (a 33³ LUT is ~330KB). Adopt the industry standard.

### Alternative — defer camera-as-parameter to a follow-up RFC

Ship visual identity + post-FX bus + always-on drift; leave camera as a static-per-recipe sketch parameter for now.

Rejected. Static camera is one of the most visible reasons current renders feel like screen-recordings rather than cinema. Adding camera motion is a large enabler that the FX chain alone cannot reach. Bundle camera in RFC-019; sketches gain the `getCamera(frame)` API in the same commit as the FX chain.

### Alternative — per-frame post-FX evaluation only at export, no browser preview

The browser preview shows raw rendered frames without post-FX; only the exported video has the FX. Faster preview, cleaner contract.

Rejected. Authors editing a recipe with `cinematic` identity *must* see the cinematic preview live — otherwise they're editing blind. Browser preview matters even if it's perceptually-tolerance-only rather than byte-identical. Worth the shader implementation cost.

### Alternative — visual identity replaces audio identity coupling

`identity:` becomes a top-level (recipe-wide) switch that drives *both* `audio.identity` and `visual.identity`, coupling them.

Rejected. Cross-modal coupling is occasionally desirable but more often constraining — an `ambient` audio identity may want a `cinematic` visual identity or a `minimalist` one; locking them coarsens authoring. The RFC-017 macros are the right tool for cross-modal coordination (a `mood` macro can drive both); separate identity switches preserve flexibility.

## Trade-offs

- **Cross-validation moves from byte-identical to perceptual.** A real loss in reproducibility for the visual side. Mitigation: pipeline export remains byte-identical (the contract that matters for distribution); browser preview is the relaxed surface.
- **Shader implementation in the browser is real work.** Nine effects at v1 each need a fragment shader + parameter wiring. Manageable but not trivial.
- **LUT bank grows with the project.** Each new LUT needs metadata + license vetting + a thumbnail preview generation step. Similar discipline to the vocal sample bank.
- **Schema grows again.** After seven RFCs of growth, the `visual:` block adds another substantial section. Documentation has to land.
- **Camera as parameter touches every sketch.** Each existing sketch (field, particles, scatter) gains a `getCamera(frame)` API call. Mechanical work but it's diff weight.
- **Always-on drift is hidden by default but observable on inspection.** Authors looking at exported files will notice a 1% periodic shift. Document the behaviour clearly so it's not perceived as a bug.
- **Pipeline render time grows.** Each post-FX effect adds 5–50ms per frame in ffmpeg `filter_complex`. A 30s recipe at 30fps with 5 effects could add 5–10s of total render time. Acceptable for batch but worth measuring.

## Open questions

1. **Identity count.** Four identities at v1 (cinematic / minimalist / painterly / technical). Authors may push for more — naturalistic, documentary, datavis, etc. Recommendation: lock four at v1; add via small ADRs once the framework is stable.
2. **Effect catalogue extensibility.** Nine effects ship; new effects (kaleidoscope, halftone, posterize) are likely requests. Recommendation: project-shipped only at v1; user-defined effects via the same registry pattern as RFC-016's data features if demand emerges.
3. **LUT interpolation rule.** When `color_grade.lut` is an envelope referencing two LUTs over time, the implementation interpolates the 3D LUT volumes per-frame. Performance cost is non-trivial. Recommendation: cache interpolated LUTs per frame in the pipeline; browser uses GPU 3D texture interpolation natively.
4. **Camera motion presets — how many.** Five at the proposal (static / slow_pan_right / slow_orbit / push_in / breathe). The right number is unknown; recipes will inform. Recommendation: five at v1; add the most-requested as small follow-ups.
5. **Always-on drift on / off granularity.** Recipe-level switch is the proposal. Per-effect-stage drift (different drift on bloom vs. on grain) may matter for advanced authors. Recommendation: recipe-level at v1; per-stage as a future extension.
6. **SSIM threshold for cross-validation.** 0.98 is the proposed perceptual tolerance — high but not perfect. Real-world testing may want 0.95 (more tolerant) or 0.99 (stricter). Recommendation: ship 0.98, adjust based on first cross-validation runs.
7. **HDR / color-space considerations.** Current renders are sRGB. LUTs and post-FX may want to operate in linear color for correctness. Decision point — adopt linear-light internally with sRGB encode at the end, or stay in sRGB throughout? Recommendation: stay in sRGB at v1; linear-light is a follow-up RFC if HDR delivery becomes relevant.

## How this closes

- **ADR-044 — Visual identity + post-FX chain.** Locks the identity switch (four named identities), the post-FX chain schema, the initial effect catalogue, the always-on drift convention, the camera-as-parameter primitive, the pipeline-canonical / browser-preview architecture, the perceptual-tolerance cross-validation contract.
- **ADR-045 — LUT bank + provenance.** Locks the `visual/luts/<name>/metadata.yaml` convention, the license gate (open licenses only), the BOM regeneration model, and the LUT lifecycle policy (versioning, deprecation, CI cross-reference).

Closure trigger: Phase 1 implementation forces the schema decision once the pipeline, the browser, and the cross-validation fixture set all produce identity-consistent post-FX'd output end-to-end for at least one recipe per identity.

## Links

- **Source** — RFC-012 *Atmospheric audio* (audio counterpart) · Native Instruments / TouchDesigner / Notch / Resolume design analyses motivating the visual identity gap closure
- **TA** — components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-012 Atmospheric audio · RFC-013 Editor controls · RFC-014 Modulation graph · RFC-017 Recipe macros · RFC-018 Recipe morphing · RFC-020 Layer compositing (paired)
- **Related ADRs** — ADR-027 · ADR-032 · ADR-033 · ADR-034 · ADR-035 · ADR-036
