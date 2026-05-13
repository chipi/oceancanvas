# RFC-012 — Atmospheric audio: from data-sonification to ambient backdrop

> **Status** · Draft v0.1 · 2026-05-13
> **TA anchor** · components/render-system · contracts/recipe-yaml · contracts/render-payload · constraints
> **Related** · PRD-006 The piece · RFC-006 Audio system · RFC-010 Generative audio composition · RFC-011 Tension arc · ADR-027 · ADR-028 · RFC-013 Editor controls (paired companion)
> **Closes into** · ADR-032 (audio identity + atmosphere bus), ADR-033 (vocal sample bank + provenance)
> **Why this is an RFC** · The current four-layer engine sonifies data successfully but produces percussive transients over a foreground drone — closer to minimalist electronica than to an ambient backdrop. Shifting the identity to atmospheric requires reordering the layer hierarchy, adding an FX bus whose granular component is non-deterministic by design, and introducing a vocal layer whose sample provenance has to clear license gates. Multiple plausible architectures exist, each with real trade-offs in determinism, sample-bank weight, and how the new atmosphere primitive relates to the existing tension arc.

---

## The question

PRD-006 frames the audio as a *bed* the visuals breathe over. The system as built — drone at `presence: 0.7`, pulse ticks on `|Δdata|`, accent samples on flagged moments — produces something articulate and rhythmic, but the silence between events is dry silence. There is no room. A long-form video plays as a sequence of audio gestures over a held tone, not as an atmosphere a viewer can settle into.

The technical question is **how to evolve the four-layer engine into an atmospheric backdrop without discarding the cross-validated determinism, the recipe-as-source-of-truth contract, or the shared tension-arc primitive that ADR-028 just locked in.** Three sub-questions sit underneath:

- **Where does atmosphere live?** A new wet-FX bus (long reverb + granular shimmer) is the natural answer, but its granular component is randomised by design — colliding with the byte-identical-render constraint unless the randomness is seeded.
- **How is human warmth introduced?** Moments-style wordless vocal texture is the aesthetic anchor the user has identified. Either as a new fifth layer with its own envelope and routing, or by repurposing the drone slot into a sample-driven sustain. The two architectures imply very different schemas.
- **How does the sample bank stay legible?** Ocean-inspired vocal sources (whale song, sustained human "ahh") have to ship with provenance, license terms, and integrity hashes. The existing `audio/ATTRIBUTION.md` is one paragraph; the model has to grow without ad-hoc accretion.

This RFC proposes a specific answer to all three, paired with **RFC-013** for the editor-side control surface that the new parameters need.

## Use cases

1. **Long-form ambient backdrop.** A five-minute video of slow SST drift plays as a continuous atmospheric piece — long reverb tails, a held whale-song fragment under the surface, a sustained vocal "ahh" swelling on annual cycles. Pulse and accent are present but recessed; the silences are full, not dry.
2. **Data-driven ocean piece with vocal anchor.** A whale-shark tracks video uses the vocal layer as its emotional centre — a humpback song sample modulated by track density, the drone reduced to a quiet sub-bass bed, accents reduced to soft bell-like punctuation on record events.
3. **Identity recovery from the editor.** An author opens an existing recipe in the new Video Editor, finds it sounds harsh, and shifts a single `identity:` knob from `synthetic` (legacy) to `ambient` — the default behaviour of every layer changes coherently, presets re-snap, the preview audibly resolves toward atmosphere without per-parameter editing.
4. **Provenance audit.** A maintainer asks "where did the vocal sample come from?" The answer is one line in `audio/ATTRIBUTION.md`: source URL, license, attribution string, SHA256. The audit takes seconds, not investigation.

## Goals

- **Identity shift made explicit.** The audio system's primary purpose changes from sonification to atmosphere. The new identity is the default; the existing minimalist behaviour is available but no longer chosen by accident.
- **Atmosphere as primitive.** A wet FX bus (algorithmic reverb + seeded granular shimmer) is addressable as a single recipe macro — one knob, multi-effect underneath. Moments-style hidden complexity.
- **Vocal layer as new emotional anchor.** A sustained wordless vocal texture, sample-driven, with its own envelope and `presence` knob. Sourced from open-license ocean-inspired recordings (whale, choral, water-adjacent).
- **Drone demoted.** Default `presence` reduced from 0.7 to 0.25; default routing through low-pass + atmosphere bus; new `filtered_noise` waveform option that reads as a sub-bass bed rather than a foreground oscillator.
- **Pulse and accent softened.** Existing tick samples replaced with mallet/bell-leaning sources with longer release tails. Events remain audible but recede from the foreground.
- **Determinism preserved.** Granular FX uses a per-recipe seeded RNG so that the same recipe + same date + same data → byte-identical audio output. ADR-027's "perceptually identical" tolerance is *not* spent on the new bus.
- **Provenance hardened.** A `audio/vocal/<name>/metadata.yaml` convention plus a consolidated BOM in `audio/ATTRIBUTION.md`. CC0, CC-BY, NOAA-PD only; CC-BY-NC, CC-BY-ND, CC-BY-SA explicitly rejected.
- **Clean break on legacy recipes.** The 11 existing recipes are deleted, replaced by a small new set built for the ambient identity (target: five recipes initially). No pre-release audience to preserve.

## Constraints

- **Recipe YAML as source of truth** (TA constraints). All new parameters land in the `audio:` block. No sidecar files for per-recipe audio config.
- **Deterministic rendering** (TA constraints). Audio is "perceptually identical" per ADR-027 tolerance, but the new granular bus must remain *byte-identical* within a recipe — randomness has to be seeded, not free.
- **Cross-validated TS ↔ Py engines** (ADR-027). Browser `SynthEngine` / `AmbientEngine` and pipeline `audio.py` continue to produce parity outputs. The atmosphere bus and the vocal layer extend both.
- **Self-hostable** (TA constraints). No external audio services. The vocal sample bank ships with the repo or installs to a known local path. Granular FX runs locally in the browser (AudioWorklet) and in the pipeline (numpy).
- **Tension arc remains shared primitive** (ADR-028). The new layers and bus are gain-modulated by the arc identically to the existing ones — no parallel curve introduced.
- **License gate.** CC0, CC-BY, NOAA-PD only. Each sample carries its `metadata.yaml`; the BOM is generated from those, not hand-maintained.

## Proposed approach

### Identity shift

A new top-level key in the `audio:` block declares identity:

```yaml
audio:
  identity: ambient           # ambient (default) | synthetic (legacy presets)
```

`identity` is the master switch the editor exposes most prominently. It changes layer defaults coherently (drone presence, pulse sensitivity, atmosphere wet mix, vocal presence) rather than requiring per-parameter editing. `synthetic` reproduces the v0.4.0-pre defaults for backward reproducibility in case any external work references them; the eleven existing recipes are deleted regardless.

### Layer hierarchy (five layers, reordered)

The engine grows from four layers to five, with the new hierarchy ordered by perceptual prominence in `ambient` identity:

1. **atmosphere** (NEW) — long reverb + granular shimmer bus. Always present at moderate wet level.
2. **vocal** (NEW) — sustained wordless vocal sample, slow swells. The emotional centre.
3. **drone** (DEMOTED) — sub-bass bed via `filtered_noise` waveform or quiet oscillator. Optional.
4. **pulse** (SOFTENED) — bell/mallet ticks on `|Δdata|`. Recessed.
5. **accent** (SOFTENED) — moment-triggered bell samples with longer tails.

In `synthetic` identity the order inverts back to v0.4.0-pre (drone foreground, no atmosphere, no vocal).

### Recipe schema

```yaml
audio:
  identity: ambient

  atmosphere: 0.6                     # 0–1 wet send to reverb+granular bus
  atmosphere_reverb_size: 0.7         # 0–1 reverb tail length (~3–10s)
  atmosphere_shimmer: 0.4             # 0–1 granular send within the bus

  vocal:
    presence: 0.4                     # 0–1 master gain over the entire stack
    swell_rate: slow                  # slow | medium | fast (default for stack entries)
    stack:                            # parallel vocal layers — Moments "choral" architecture
      - { sample: humpback_song_v1,      gain: 0.7, pan: -0.2 }
      - { sample: soprano_ahh_cc0,       gain: 0.5, pan:  0.0 }
      - { sample: distant_wave_field_v1, gain: 0.3, pan:  0.1 }

  drone:
    presence: 0.25                    # was 0.7
    waveform: filtered_noise          # filtered_noise (new) | sine | triangle | sawtooth
    glide: 0.5

  pulse_sensitivity: 0.30             # default softened from 0.40
  accent_style: bell                  # bell (new) | chime | tone | inflection
  texture_density: 0.20               # default softened from 0.35

  tension_arc:                        # unchanged from RFC-011
    preset: classic
    peak_position: 0.65
    peak_height: 1.0
```

Backward compatibility: the flat `drone_waveform` / `drone_glide` keys are replaced by the nested `drone:` block. Migration is not needed because the eleven existing recipes are deleted in this RFC's landing commit.

### Atmosphere bus

A new post-mix bus between the five dry layers and the master output:

```
[atmosphere, vocal, drone] → atmosphere_bus → master
[pulse, accent]            → master                     (dry, for event clarity)
```

The bus chains:

1. **Long reverb** — algorithmic (browser: `ConvolverNode` with a generated IR; pipeline: numpy IR convolution). Tail length controlled by `atmosphere_reverb_size`, range ~3–10 seconds.
2. **Granular shimmer** — grain size 80–200ms, randomised pitch (±2 semitones), randomised position (±50ms), feedback 0.3. Browser: `AudioWorklet`. Pipeline: numpy grain scheduler with `np.random.default_rng(seed)`.
3. **Cloud Filter (spectral motion)** — a slow, low-depth always-on filter modulation on the bus output. Implementation defers to RFC-014: a project-shipped default envelope (`subtle_breath` archetype, period ~20s, depth ±10% of cutoff) drives the filter cutoff continuously. The point is that held tones never sit perfectly still — there is always a gentle drift. Until RFC-014 lands, this is a fixed sine LFO at 0.05Hz with ±10% cutoff modulation.

The single recipe macro `atmosphere` controls wet send. `atmosphere_shimmer` controls how much of the wet path is granular vs. plain reverb. One knob hides multi-effect complexity — Moments philosophy.

Pulse and accent route around the bus by default to keep transient events legible. The `atmosphere_pulse_send` parameter (default 0.0, lifted to ~0.2 automatically when `atmosphere > 0.8`) controls how much of the pulse + accent layers send into the wet bus — so very wet recipes can still place events in the same room while dry recipes keep them crisp.

### Vocal sample bank

Bank layout:

```
audio/
  vocal/
    humpback_song_v1/
      source.wav
      metadata.yaml
    soprano_ahh_cc0/
      source.wav
      metadata.yaml
    distant_wave_field_v1/
      source.wav
      metadata.yaml
  ATTRIBUTION.md            # regenerated from metadata.yaml files
```

`metadata.yaml` schema:

```yaml
name: humpback_song_v1
source_url: https://www.fisheries.noaa.gov/...
source_organisation: NOAA Fisheries
license: NOAA-PD
attribution: "Humpback whale song recording, NOAA Fisheries, Public Domain"
sha256: 7f3a...
duration_seconds: 47.3
sample_rate: 44100
notes: "Trimmed from longer recording; loop-friendly start/end"
```

The vocal layer engine references samples by `name`. The build step regenerates `ATTRIBUTION.md` from all `metadata.yaml` files so the BOM is never hand-edited and never drifts.

License gate is enforced at build time: a CI check parses each `metadata.yaml`, asserts `license ∈ {CC0, CC-BY, NOAA-PD}`, and fails the build on violations. CC-BY-NC and CC-BY-SA are rejected explicitly: NC is commercial-incompatible with future project plans; SA would force OceanCanvas to inherit ShareAlike terms.

#### Sample lifecycle and versioning

Samples are versioned in the `name` field (`humpback_song_v1`, `humpback_song_v2`); the project never silently replaces a sample under an existing name. Retirement is two-phase: a sample marked `deprecated: true` in its `metadata.yaml` keeps working but emits a warning in pipeline logs; deletion happens in a separate commit after the deprecation has been visible for at least one release. A CI gate cross-references every recipe's `vocal.stack[*].sample` against the bank and fails the build on missing or deprecated-but-still-referenced samples. New samples ship at fixed format conventions — WAV 44.1kHz 16-bit, normalised to -3 dBFS peak — converted at bank-import time from the source recording's native format.

Initial bank ships with at least:

- One humpback whale song (NOAA-PD)
- One sustained soprano "ahh" (freesound CC0 or CC-BY)
- Optionally one quiet wave field-recording (freesound CC0)

### Determinism strategy

Granular FX is the only new non-deterministic element. The seed derives from the recipe's stable identity:

```
seed = sha256(recipe_id + "|" + dates[0])[:8] as uint64
```

Same recipe + same start date → same seed → same grains → byte-identical output. Browser `AudioWorklet` and pipeline numpy both consume the same seed and the same algorithm. The cross-validation fixture set (already established for `creative_mapping` and the tension arc) extends to cover the granular output.

ADR-027's "perceptually identical" tolerance remains in reserve. Nothing in this RFC spends it.

### Engines

Both `SynthEngine` and `AmbientEngine` extend their interface to add `setAtmosphere(params)`, `setVocal(sample, params)`, and the granular subgraph. The pipeline `audio.py` adds `_synth_atmosphere` and `_synth_vocal` peers to the existing `_synth_drone`, `_synth_pulse`, `_synth_accent`, `_synth_texture`. Engine consolidation (whether `SynthEngine` and `AmbientEngine` should collapse into one) is *not* decided here — see Open Questions.

### Migration

The eleven existing recipes are deleted in the landing commit. A small new set is authored built for the ambient identity — target five recipes, covering the existing data-source range (SST timelapse, Argo, OBIS tracks). The `synthetic` identity is retained as a code path so anyone with an external reference to a v0.4.0-pre recipe could in principle rebuild it; no recipe ships with `identity: synthetic` by default.

## Alternatives considered

### Alternative — vocal as an extension of the drone slot

Treat the new vocal layer as the drone slot accepting a sample source instead of an oscillator. One layer with two source modes: oscillator (filtered_noise / sine / etc.) or sample (`humpback_song_v1`, etc.).

Rejected. Drone semantics are "sub-bass bed, harmonic"; vocal semantics are "sustained mid-range emotional anchor." They want different envelopes, different routing depths into the atmosphere bus, different swell rates. Conflating them produces a layer that has to expose mode-dependent controls — exactly the parameter overload Moments-style macros are meant to defeat. A clean five-layer hierarchy is cheaper than a parametrically-overloaded four.

### Alternative — replace drone entirely with vocal

The drone is the source of harshness; deleting it removes the problem. Vocal becomes the primary bed.

Rejected. A `filtered_noise` drone at low presence (~0.2) provides a sub-bass shelf the vocal cannot. The two layers are complementary in spectrum: drone occupies 60–200Hz, vocal occupies 200Hz–2kHz. Removing drone loses the floor; the mix becomes top-heavy. The fix is to demote the drone, not to delete it.

### Alternative — granular FX with fresh RNG per render

Let the granular bus randomise without a seed. Each render of the same recipe produces a different (but stylistically equivalent) atmosphere.

Rejected. The deterministic-rendering constraint applies (audio gets the "perceptually identical" softening; visuals are byte-identical). Even within the audio tolerance, identical-recipe non-determinism is a debugging hazard — bug reports about "the recipe sounded different yesterday" become unanswerable. Seeded RNG keeps the door to reproducibility open at zero cost.

### Alternative — collapse `SynthEngine` and `AmbientEngine` into one

Both engines already exist and are 95% similar (the search result showed this directly). The new ambient identity is a natural moment to unify them, drop the parallel maintenance burden, and ship one clean engine.

Rejected for this RFC. Engine consolidation is a separate deliberation: it touches preset migration (every existing `AUDIO_PRESETS` entry would need to re-route), browser bundle size (one engine is smaller), and test coverage (the two engines' tests are independent today). Bundling it into RFC-012 would double the surface and the review burden. The new layers and bus extend *both* engines via shared interface signatures; consolidation is a clean follow-up RFC after the identity work lands.

### Alternative — preserve the eleven existing recipes via auto-pinned legacy defaults

When defaults shift, auto-rewrite each recipe to pin its old parameter values explicitly. The recipe sounds identical post-migration.

Rejected by directive. There is no pre-release audience. The point of the RFC is to escape the current sound; preserving every recipe of the current sound preserves what the work is trying to leave behind. Clean break is simpler and cheaper.

## Trade-offs

- **Sample bank weight.** Vocal samples are 30–60 seconds at 44.1kHz; three samples is ~10–20MB in the repo. Browser pre-fetch becomes a real concern. Mitigation: lazy-load vocal samples per recipe; cache aggressively.
- **Granular FX implementation cost.** AudioWorklet + numpy grain scheduler is genuinely new code in both engines, and the cross-validation fixture has to cover stochastic output. The seeded-RNG approach makes this tractable but it is not trivial.
- **Schema growth.** The `audio:` block gains `atmosphere*` keys, a nested `vocal:` block, and a nested `drone:` block (replacing flat `drone_waveform` / `drone_glide`). YAML grows by ~10 lines per recipe. Acceptable but no longer minimal.
- **License compliance discipline.** Every new vocal sample requires a `metadata.yaml` entry, an integrity hash, and clear-license sourcing. The CI gate makes this enforceable; the per-sample work is real.
- **ADR-027 tolerance becomes load-bearing differently.** The cross-validation surface grows to cover granular output. Until the new fixture set is comprehensive, audio parity bugs are easier to introduce.
- **Coupled with RFC-013.** The new parameters need a control surface (circular knobs, envelope-aware indicators) to be usable. RFC-012 lands incomplete without RFC-013 shipping in parallel.

## Open questions

1. **Engine consolidation timing.** Should `SynthEngine` and `AmbientEngine` collapse once this RFC lands, or after? A dedicated follow-up RFC seems right. Not blocking.
2. **Vocal pitch tracking.** Should the vocal sample respond to the tension arc as pitch modulation (shift up/down with arc value), or stay at fixed pitch with the arc only modulating gain? Pitch-tracking is more expressive but introduces formant artefacts on non-tonal samples (whale song). Recommendation: fixed pitch initially; revisit if recipes consistently want movement.
3. **Whale sample handling.** Pre-trim to a fixed loop-friendly length (e.g. 30s) and time-stretch to video duration, or keep full-length and play through? Pre-trim is cheaper at runtime; full-length preserves source integrity. Recommendation: pre-trim, document the trim metadata in `metadata.yaml`.
4. **New recipe count.** Target five recipes for the initial ambient set, or smaller (3) to ship faster? Trade-off between covering the data-source range and shipping speed. Recommendation: three initially, two more as fast-follow.
5. **Tension arc interaction with atmosphere bus.** Does `atmosphere` wet send vary with `arc[frame]` (more atmosphere as the piece climaxes), or stay constant? Recommendation: constant. The arc already modulates layer gains; modulating the bus too risks double-pumping.
6. **Default vocal stack depth.** Three parallel samples (whale + human + water-adjacent) is the proposed default for an ambient-identity vocal. Some recipes will want one sample (a focused humpback solo), some five or six (lush choral wash). Should the schema cap the stack depth, or trust authors to make sensible decisions? Recommendation: no hard cap, soft warning at >6 entries.
7. **Vocal stack per-entry envelopes.** Each stack entry currently has scalar `gain` and `pan`. Should those be envelope-able (so individual voices can swell at different times)? Recommendation: yes once RFC-014 lands — the polymorphic-parameter principle applies. Until then, scalars only.

## How this closes

- **ADR-032 — Atmospheric audio identity.** Locks the `identity` switch, the five-layer hierarchy, the atmosphere bus structure (reverb + granular), the seeded-RNG determinism strategy, and the demoted drone defaults.
- **ADR-033 — Vocal sample bank + provenance.** Locks the `audio/vocal/<name>/metadata.yaml` convention, the `audio/ATTRIBUTION.md` BOM-generation convention, the license gate (CC0 / CC-BY / NOAA-PD only), and the vocal layer interface signature.

Closure trigger: Phase 1 implementation forces the schema decision once the editor, the pipeline, and the cross-validation fixture set all read the new fields end-to-end.

## Links

- **Source** — OC-04 §audio · PRD-006 *The piece*
- **TA** — components/render-system · contracts/recipe-yaml · contracts/render-payload · constraints
- **Related RFCs** — RFC-006 Audio system · RFC-010 Generative audio composition · RFC-011 Tension arc · RFC-013 Editor controls: circular knobs (paired)
- **Related ADRs** — ADR-027 Generative audio composition · ADR-028 Tension arc as shared curve
