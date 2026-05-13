# RFC-021 — Granular frame processing: Aetherizer for video

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · RFC-012 Atmospheric audio (Aetherizer audio counterpart) · RFC-019 Visual identity + post-FX · RFC-020 Layer compositing
> **Closes into** · ADR-048 (Granular frame primitive: frame_hold + interp_factor + pixel-level transforms)
> **Why this is an RFC** · The aesthetic research surfaced two operations that don't fit the per-frame post-FX model in RFC-019 or the per-layer compositing model in RFC-020 — they operate on the *time domain* of the render itself. Ikeda's stroboscopic cadence is `frame_hold: 1–3` (repeat each render output for 1–3 frames at output fps, producing a sub-100ms full-frame change rhythm). Viola's extreme time dilation is `interp_factor: 10–40×` (synthesise 9–39 intermediate frames between each rendered frame using optical-flow interpolation). Both are *granular* in the same sense Aetherizer is granular for audio — they chop the temporal stream into grains and reassemble. The architectural questions are real: how does this interact with the existing fps contract, with audio sync, with deterministic rendering, with the render-payload model? This is the most speculative of the visual-side RFCs — the aesthetic payoff is large but the implementation cost is real, especially for optical-flow interpolation. Ships as Draft v0.1 with a deliberately small v1; honest retirement if no recipe adopts it.

---

## The question

RFC-019 added a post-FX bus operating on each frame. RFC-020 added multi-source layer compositing with parameterised feedback. Neither addresses the temporal granularity that defines two of the three reference aesthetics in the research:

- **Ikeda's stroboscopic minimalism** depends on *holding* each rendered output for 1–3 frames at output fps. A 30fps export with `frame_hold: 2` produces 15 distinct "moments" per second, each visible for 67ms — the cadence that makes Ikeda look like Ikeda. Post-FX cannot produce this. Layer compositing cannot produce this. It is a temporal operation on the *output* of the renderer.
- **Viola's extreme time dilation** depends on *interpolating* between rendered frames. A 30fps export with `interp_factor: 20×` requires synthesising 19 intermediate frames between each rendered pair, producing the slowed-to-a-crawl feeling Viola gets from his 1000fps source footage. Optical-flow interpolation (RIFE-class) is the right tool; frame-blending (cross-dissolve) is wrong (it produces ghosting, not motion).

These are *granular* operations in the Absynth Aetherizer sense — chop the temporal stream into grains, reassemble. They sit between the renderer (which produces frames at recipe fps) and the encoder (which writes frames at output fps). The architectural question is **how to introduce a granular-temporal-processing primitive that operates between rendered-frame output and final encoding, preserves determinism, integrates with audio sync, and ships with a deliberately small v1 footprint given the speculative nature of the use case.** Three sub-questions sit underneath:

- **Granular operations at v1.** `frame_hold` (Ikeda) and `interp_factor` (Viola) are the obvious two. Datamosh, pixel sort, slit-scan are speculative — should they ship now or wait for demand?
- **Optical-flow implementation.** RIFE / FILM / Twixtor-class neural networks produce best results but conflict with the self-hostable constraint (model weights are heavyweight; some are commercially licensed). Classical optical flow (Farnebäck, TVL1 from OpenCV) is lighter but lower quality. Which path?
- **Audio sync under temporal manipulation.** `frame_hold: 2` produces 15 distinct frames per second; the audio still wants to play at real time. `interp_factor: 20×` slows the visual by 20× while the audio plays in real time. The audio-visual sync model needs explicit semantics.

This RFC is the most speculative of the visual trio. It ships as Draft v0.1 with a deliberately narrow v1 scope (frame_hold + classical-optical-flow interp_factor only); honest retirement if no recipe adopts it after 6 months. The aesthetic payoff is potentially large but unproven for ocean data.

## Use cases

1. **Ikeda-cadence minimalism.** A `minimalist` identity recipe (RFC-019) sets `granular: { frame_hold: 2 }`. Each rendered frame is held for two output frames; the visible cadence is 15 transitions per second at 30fps export. Combined with `threshold_binarize` post-FX, the result reads as Ikeda's stroboscopic data-as-pattern aesthetic.
2. **Viola-slow contemplation.** A `meditative` identity recipe sets `granular: { interp_factor: 20 }`. Each pair of rendered frames produces 19 interpolated intermediate frames at export fps. A 30-second video at recipe-fps 1.5 (recipe renders 45 frames) plays as a 30-second video at export-fps 30 with optical-flow smoothing between. The eye sees continuous, slowed motion — Viola's signature.
3. **Hybrid recipes.** An author uses `frame_hold: 0` (no holding) but `interp_factor: 4×` for a gentle 4× slow-down without stroboscopic cadence. Or `frame_hold: 1` (every frame held one extra) with no interpolation for an aliased but flowing feel.
4. **Datamosh as creative gesture (v2).** When the speculative effects are enabled, a `datamosh` block can corrupt I-frames at specific moments — a violent visual rupture on a key moment, immediately resolving back to clean rendering.
5. **Performance-bounded preview.** The browser preview applies a coarser version of the granular operation (no neural optical flow, classical Farnebäck only) for live editing. The pipeline export runs the full quality path.

## Goals

- **Granular temporal primitive.** A top-level `granular:` block declaring temporal operations between rendered frames and encoded frames.
- **Two operations at v1: `frame_hold` and `interp_factor`.** Both ship as core primitives. Frame hold is mechanically trivial; interpolation is the substantial implementation work.
- **Classical optical flow at v1.** OpenCV Farnebäck or TVL1 for the interpolation algorithm. Self-hostable, deterministic, no model weights. Quality lower than neural methods but adequate for ocean data which has gentle motion.
- **Neural optical flow as opt-in extension.** A `granular.interp_engine: classical | rife` switch with `rife` requiring a separate model installation step. Project ships classical only; users install RIFE if they want quality at the cost of self-host friction.
- **Deterministic.** Same recipe + same data + same engine → byte-identical output. Frame hold is trivially deterministic; classical optical flow is deterministic (no learned components).
- **Explicit audio sync model.** Audio plays at real time regardless of `frame_hold` or `interp_factor`. Documentation explains the relationship clearly. No audio modification by default; opt-in `granular.audio_sync: stretch` for synchronised audio time-dilation under interp_factor.
- **Renderer fps stays as authored.** The recipe author specifies `fps` (the recipe's authoring fps); `granular` modifies the *output* fps relationship. Audio synthesis uses the recipe fps; granular ops apply between.
- **Speculative effects as opt-in.** `datamosh`, `pixel_sort`, `slit_scan` declared in the schema as optional v2 effects. Available in the editor's "experimental" panel; not active by default.
- **Honest retirement contingency.** If no ambient-identity recipe demonstrably uses `granular` for six months after landing, the RFC retires rather than forces closure.

## Constraints

- **Recipe YAML as source of truth** (TA constraints).
- **Self-hostable** (TA constraints) — classical optical flow only at v1; RIFE/neural is opt-in extension.
- **Deterministic** (TA constraints, ADR-027 spirit). Classical algorithms are deterministic; neural is reproducible given same model + seed.
- **No regression on recipes without `granular:`.** Default behaviour is identity: rendered frame N becomes output frame N at the same fps. The whole RFC is opt-in.
- **Cross-validated TS ↔ Py at perceptual tolerance**. ADR-027 / RFC-019 tolerance extends.
- **Audio sync semantics preserved.** Audio renders at recipe-fps real-time; granular ops modify only the visual time domain by default.

## Proposed approach

### Granular primitive

```yaml
granular:
  frame_hold: 0                     # 0 (default) | 1 | 2 | 3 — repeat each rendered frame N additional times
  interp_factor: 1                  # 1 (default) | 2..40 — synthesise (factor-1) intermediates between each pair
  interp_engine: classical          # classical (default, ships) | rife (opt-in install)
  audio_sync: real_time             # real_time (default) | stretch | hold
```

Semantics:

- `frame_hold: N` — each rendered frame is repeated N+1 times in output. `frame_hold: 0` → identity (no repetition). `frame_hold: 2` → each frame appears 3 times.
- `interp_factor: M` — between each consecutive pair of rendered frames, M−1 interpolated frames are synthesised. `interp_factor: 1` → identity (no interpolation). `interp_factor: 20` → 19 intermediates per pair.
- The two operations compose: rendered-frame stream → frame_hold expansion → interp_factor interpolation → encoded output.
- `audio_sync: real_time` (default) — audio plays at real time; granular modifies only video. A 30-second recipe at `interp_factor: 20` plays as 30 seconds visually slowed.
- `audio_sync: stretch` — audio is time-stretched to match the slowed visual. A 30-second recipe at `interp_factor: 20` becomes a 600-second output. Requires audio time-stretching (pitch-preserving) infrastructure.
- `audio_sync: hold` — under `frame_hold` only, audio holds each "slice" matching the held visual frame. Mostly novelty; useful for some experimental cases.

### Frame hold implementation

Mechanically trivial. The pipeline duplicates each rendered frame N+1 times before encoding. ffmpeg's `setpts` filter or simple frame repetition handles this directly. Browser preview duplicates frame display in the playback loop. Determinism is automatic — frame N's output is exactly frame N's render.

### Interpolation implementation — classical

OpenCV's Farnebäck dense optical flow:

```
For each pair (frame_a, frame_b) of rendered frames:
    flow = cv2.calcOpticalFlowFarneback(frame_a, frame_b, ...)
    For k in 1..M-1:
        t = k / M
        warped_a = warp(frame_a, flow * t)
        warped_b = warp(frame_b, flow * -(1 - t))
        intermediate[k] = blend(warped_a, warped_b, t)
    Emit frame_a, intermediate[1..M-1], (frame_b comes from next pair)
```

Parameters: pyramid scale, levels, window size, iterations. Project-shipped defaults tuned for gentle ocean-data motion. Quality degrades on fast or chaotic motion — which is rare for our use case (SST drift, particle migration, slow tracks).

Cross-validation: same algorithm in TS (via opencv.js) and Python (cv2). Both produce byte-identical output for the same inputs given same OpenCV version. Pin OpenCV version in `requirements.txt` to avoid drift.

### Interpolation implementation — neural (opt-in)

RIFE (Real-time Intermediate Flow Estimation) is the most commonly-deployed open-source neural interpolator. License: MIT (favourable). Model weights: ~50MB per variant, downloadable.

`interp_engine: rife` triggers a runtime check for an installed RIFE model at `~/.config/oceancanvas/models/rife/`. If absent, recipe build fails with a clear instruction to install the model (separate from the OceanCanvas codebase, similar to how some users install ffmpeg).

Determinism: RIFE is deterministic given fixed model weights + fixed seed + fixed input pair. Cross-validation runs Python-side only (TS port of RIFE inference is impractical); browser preview always uses classical even when `interp_engine: rife` is set. Documented behaviour.

### Audio sync

Three modes, default `real_time`:

- **`real_time`** — audio plays at recipe fps in real time. If `frame_hold: 2 + interp_factor: 1`, the audio plays 1× speed while the video stutters. If `frame_hold: 0 + interp_factor: 20`, the audio plays 1× speed while the video plays slowed. Default and recommended.
- **`stretch`** — audio is time-stretched (pitch-preserving) to match the visual slow-down. Requires `librosa` or `rubberband` for pitch-preserving stretch. Computationally heavier; ship as opt-in only after profiling.
- **`hold`** — under `frame_hold > 0`, audio is held each frame-hold step. Produces "stutter" audio matched to visual stutter. Novelty mode.

### Speculative effects (v2)

Declared in the schema as opt-in, not active by default. Each has its own block under `granular:`:

```yaml
granular:
  experimental:
    datamosh:
      enabled: true
      strategy: i_frame_drop        # i_frame_drop | block_displacement | pixel_sort
      intensity: 0.4
      trigger: { on_moments: [record_high], duration: 1.5 }
    pixel_sort:
      enabled: true
      axis: horizontal              # horizontal | vertical
      threshold: 0.6                # brightness threshold
      duration_window: [0.4, 0.6]   # t range when active
    slit_scan:
      enabled: true
      direction: horizontal
      band_height: 4                # pixels
```

Implementation deferred to a later RFC revision or a follow-up. Schema reservation now prevents naming conflicts later.

### Determinism and seeding

Frame hold is trivially deterministic. Classical optical flow is deterministic given same OpenCV version. Neural optical flow (RIFE) is deterministic given same model weights + same seed. Datamosh / pixel sort (if implemented) require seeded RNG per recipe — same model as RFC-012's granular shimmer.

### Distribution — payload extension

```json
{
  "version": 3,
  "granular": {
    "frame_hold": 2,
    "interp_factor": 1,
    "interp_engine": "classical",
    "audio_sync": "real_time"
  }
}
```

The pipeline applies granular ops at encode time. Browser preview applies them at playback time (frame hold = trivial; classical flow via opencv.js = real-time at low resolution; RIFE neural = preview shows un-interpolated rendered frames with a "preview quality: classical" badge).

### Editor UX

A small "Granular" panel in the Video Editor visual section:

- **frame_hold** — discrete slider 0–3
- **interp_factor** — discrete slider 1 / 2 / 4 / 10 / 20 / 40
- **interp_engine** — dropdown (classical / rife — rife greyed if not installed)
- **audio_sync** — dropdown (real_time / stretch / hold)
- **Experimental panel (collapsed)** — datamosh / pixel_sort / slit_scan, each with a "speculative" badge

The editor shows real-time playback under granular settings using classical optical flow regardless of the engine choice — preview quality is acceptable for evaluation; final quality comes from the export.

### Cross-validation

`tests/cross-validation/granular/` fixtures cover:

- `frame_hold: 0 / 1 / 2 / 3` — sanity baseline (mechanical operation)
- `interp_factor: 1 / 2 / 4 / 10 / 20` with `interp_engine: classical`
- `audio_sync: real_time / stretch` — verify audio output duration matches video
- Composition: `frame_hold: 2 + interp_factor: 4`
- Default behaviour (no `granular:` block) — byte-identical to current rendering

Coverage at v1: ~15 fixtures. Smaller than other RFCs because the operations are well-bounded.

## Alternatives considered

### Alternative — neural optical flow (RIFE) as default

Ship RIFE as the default interpolation engine.

Rejected. RIFE requires model weights (~50MB), which conflict with the self-hostable spirit (project should run end-to-end with no external installs beyond what's in `requirements.txt`). Model licensing varies. The classical Farnebäck path is good enough for gentle ocean motion — neural is a quality upgrade for users who want it, not a default.

### Alternative — frame_hold and interp_factor as orthogonal layers, not granular ops

Treat each as a layer in the RFC-020 compositing stack.

Rejected. Frame hold operates on the *output stream* of the renderer, not on a layer. There is no compositional surface for it — it's a temporal operation between layer-composition output and encoder input. Putting it in `granular:` (between renderer and encoder) is correct.

### Alternative — ship granular only with classical optical flow; defer RIFE entirely

No `interp_engine` field; classical is the only option.

Considered. Counter-argument: documenting the rife path now sets the extension contract clearly, even if v1 ships classical only. Schema reservation is cheap. The `interp_engine: rife` path is a one-line addition once a user installs the model. Ship the field, default `classical`, RIFE handler bails clearly if model absent.

### Alternative — `granular.audio_sync: stretch` as default

Time-stretch the audio whenever `interp_factor > 1` so the experience feels naturally slowed.

Rejected. Pitch-preserving audio stretching is computationally expensive and adds a dependency (rubberband or librosa). Default behaviour should be the cheap one (real-time audio over slowed visual); authors opt into stretch when they explicitly want it.

### Alternative — speculative effects (datamosh / pixel_sort / slit_scan) shipped at v1

Wire all the speculative effects into v1.

Rejected for v1. The aesthetic research surfaces them as known primitives but ocean-data recipes don't have a clear-cut use case beyond novelty. Reserve the schema now, defer implementation until demand surfaces. Honest about the speculative nature.

### Alternative — defer the entire RFC

Don't ship granular at all; the existing post-FX + layer architecture is enough.

Considered seriously. Counter-argument: the aesthetic research explicitly named `frame_hold` (Ikeda) and `interp_factor` (Viola) as orthogonal controls in the granular stage. Without them, the `minimalist` and `meditative` identities in RFC-019 cannot fully express their reference aesthetics — they get the post-FX (binarize, two-tone grade) but miss the cadence. Bundle granular into the visual trio; mark it speculative; retire honestly if unused.

## Trade-offs

- **Optical flow implementation is real work.** Even classical Farnebäck via OpenCV is a non-trivial dependency to bind correctly in both TS and Py. RIFE is even more work and ships as opt-in for that reason.
- **Determinism contract narrows.** Classical optical flow's determinism depends on OpenCV version stability; CI must pin and verify. Neural opt-in further depends on model weight hashes.
- **Audio-video sync mental model.** Three modes (real_time / stretch / hold) is more concepts than authors may want. Documentation needs to clearly state the default and when each mode applies.
- **Render time impact is significant.** `interp_factor: 20` produces 20× the encoded frames; even at frame-hold speed (trivial), the encoder writes 20× the data. For long-duration recipes the cost is real.
- **Browser preview never matches export quality for neural.** Documented behaviour but a real authoring friction — authors of `interp_engine: rife` recipes preview at classical quality, accept that final export looks different (better).
- **Speculative effects schema reservation.** Naming `datamosh / pixel_sort / slit_scan` in the schema without implementation may invite confusion. Documentation makes the speculative status clear.
- **Honest retirement is on the table.** This is the most candidly speculative RFC of the entire arc. If no recipe uses `granular:` in six months, retire it cleanly.

## Open questions

1. **OpenCV version pinning policy.** Classical optical flow output is OpenCV-version-dependent. Lock to a major.minor and bump only with explicit re-validation. Already standard practice; codify in this RFC.
2. **Browser-side classical optical flow performance.** opencv.js Farnebäck at full resolution may be too slow for live preview. Fallback: preview at half-resolution and upscale, or skip interpolation in preview entirely. Decision deferred to first prototype.
3. **interp_factor maximum value.** 40× is the proposal (matches the Viola research). At 30fps export, 40× means rendering at 0.75fps — extreme. Hard cap at 40? Or 100? Recommendation: soft cap at 40 with warning; no hard cap.
4. **Audio sync `stretch` quality.** Pitch-preserving stretch at 20× sounds artefacted with most algorithms. The mode is useful for 2–4× stretches; degrades badly at 20×+. Recommendation: warn authors at high stretch factors.
5. **Speculative effects implementation path.** When (if ever) to implement datamosh / pixel sort / slit scan? Recommendation: hold the schema reservation; implement only if an authored recipe drives the demand.
6. **Combined `frame_hold + interp_factor` semantics.** Currently composes naturally (`hold` first, `interp` after). Reverse order would interpolate-then-repeat which is musically different. Confirm the natural composition is intuitive in editor; document.
7. **Determinism guarantee under model upgrades.** If RIFE ships v3 → v4 with different output, every recipe using `interp_engine: rife` produces different exports. Recommendation: model version is part of the determinism contract; recipes pin RIFE version explicitly.

## How this closes

- **ADR-048 — Granular frame primitive: `frame_hold` + `interp_factor` + temporal operations.** Locks the `granular:` schema, the frame_hold semantics, the interp_factor algorithm (classical Farnebäck via OpenCV at v1; RIFE as opt-in extension), the audio sync modes, the speculative effects schema reservation, and the determinism contract (OpenCV version pinned, neural engine version-pinned).

Closure trigger: Phase 1 implementation forces the schema decisions once at least one `minimalist`-identity recipe demonstrably uses `frame_hold ≥ 1` and at least one `meditative`-identity recipe demonstrably uses `interp_factor ≥ 4` with classical engine. If neither condition is met within six months of landing, retire the RFC honestly — the schema reservation is removed and the granular: block is dropped from the parser.

## Links

- **Source** — Ikeda's stroboscopic cadence and Viola's extreme time dilation as identified in the aesthetic research · Absynth Aetherizer as the audio analogue (chop temporal stream into grains, reassemble) · RIFE optical-flow paper for the opt-in neural extension
- **TA** — components/render-system · components/pipeline · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-012 Atmospheric audio (Aetherizer audio counterpart) · RFC-019 Visual identity + post-FX · RFC-020 Layer compositing
- **Related ADRs** — ADR-027 · ADR-044 · ADR-045 · ADR-046 · ADR-047
