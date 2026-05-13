# RFC-015 — Bloom: generative recipe + audio variant generator

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/pipeline · components/web-frontend · contracts/recipe-yaml · constraints
> **Related** · RFC-001 Recipe YAML schema · RFC-012 Atmospheric audio · RFC-013 Editor controls · RFC-014 Modulation graph
> **Closes into** · ADR-034 (Bloom: seed format + sampling strategy), ADR-035 (Coherence rules + archetype library)
> **Why this is an RFC** · Authoring a recipe today is deep YAML editing — twenty-plus parameters across data sourcing, rendering, audio identity, and (after RFC-014) envelope authoring. The new five-layer audio identity and the envelope primitive widen that surface further. Bloom — a generator that takes a minimal seed and produces N fully-formed recipe variants — collapses that authoring cost, but the technical question of *how* it generates is genuinely open. Multiple plausible variation strategies exist (uniform random, anchored sampling, preset breeding, LLM-assisted), each with real trade-offs in determinism, output quality, and the self-hostable constraint. The seed format itself is open (YAML stub, reference recipe, natural-language prompt), as are persistence (materialise to disk vs. ephemeral preview), variety guarantees (independent samples vs. diversity rejection), and whether audio + visual should be sampled coherently or independently.

---

## The question

After RFC-012, RFC-013, and RFC-014, the recipe surface is richer than it has ever been — five audio layers, an atmosphere bus with macro controls, polymorphic parameter shapes (scalar | preset | envelope), per-breakpoint LFO authoring. Each new affordance is also a new authoring axis. The cost of starting a new recipe scales with the surface: an author with a data source and a region in mind faces twenty-plus parameter decisions before they hear or see anything.

The cost is asymmetric. *Refining* a recipe — moving an envelope breakpoint, adjusting atmosphere mix, swapping a vocal sample — is cheap and rewarding once a recipe exists. *Starting* a recipe is expensive and exploratory, and most of that exploration is wasted on parameter combinations that the editor cannot yet preview side-by-side.

Bloom is the generative gesture that addresses this: a seed plus a count produces N fully-formed recipe variants. The architectural question is **how the generator decides what each variant looks and sounds like, with enough determinism for reproducibility, enough variety for the five blooms to feel distinct, and the recipe schema integrity intact (every bloom is a valid stand-alone recipe).** Four sub-questions sit underneath:

- **Seed format.** A YAML stub with required fields and optional pins? A reference recipe whose parameters are perturbed? A natural-language prompt? Each implies a different parser, a different UI, and a different relationship to the schema.
- **Variation strategy.** Independent uniform sampling within parameter bounds, anchored sampling around preset midpoints with variance budgets, preset breeding (literal Mutator), or LLM-assisted authoring? The trade-offs run across determinism, self-hostability, and output quality.
- **Variety guarantees.** Five samples from a uniform distribution often cluster. Should the generator enforce minimum parameter-space distance between accepted blooms, or trust the sampling to spread on its own?
- **Coherence rules.** Should `data_source × audio_identity → palette_family` be a lookup table that constrains sampling, or should audio and visual sample independently and accept some mismatches as creative surprises?

This RFC depends on RFC-012, RFC-013, and RFC-014 being decided — Bloom samples over the parameter space those three RFCs define. Implementation can begin once RFC-012 + RFC-013 land; RFC-014's envelope sampling can be staged in as a fast-follow.

## Use cases

1. **Cold start.** An author opens a terminal, knows they want a whale-shark recipe over the Indian Ocean, runs `oceancanvas bloom seed.yaml --n 5`. Five YAML files appear in `recipes/blooms/whale-shark/`. They open the gallery's 5-up contact sheet, audition each, and promote the one they like to a real recipe.
2. **Variant exploration.** An author has an existing recipe they like but want to push. They run `bloom` with that recipe as the seed and `variance: high`. Five blooms come back, each anchored near the original but pushed on different axes (one with vocal foregrounded, one with atmosphere maximised, one with sparse envelope motion, etc.).
3. **Editor-driven bloom.** An author clicks the "Bloom" button in the Recipe Editor on a half-finished recipe. The 5-up contact sheet opens, each tile showing a preview of a bloom that respects the fields the author already pinned. The author picks one, the bloom replaces the half-finished recipe.
4. **Reproducible re-bloom.** A maintainer six months later runs `bloom seed.yaml --seed 42 --n 5` and gets *exactly the same five blooms* as the original author. Determinism makes Bloom reviewable across time.
5. **Promote and refine.** A bloom from any of the above paths is promoted via `oceancanvas promote bloom_003.yaml --name pacific-thermal-drift`. It moves out of `blooms/` into `recipes/`, gets a sensible name, and joins the normal recipe lifecycle.

## Goals

- **Minimal seed.** A short YAML stub (data source + region + optional pins) is sufficient to bloom. No required ceremony beyond what the author already knows.
- **Full-recipe output.** Every bloom is a valid stand-alone recipe — same schema, no diff-against-seed format, ready to render immediately.
- **Deterministic.** Same seed file + same `--seed` value + same N → byte-identical bloom set. Reproducible across time and machines.
- **Variety guaranteed.** Five blooms in one run are distinct in parameter space — diversity rejection enforces a minimum distance. Authors do not have to re-roll because the variants clustered.
- **Audio + visual coherence at a light touch.** A small set of pairing rules prevents the most jarring mismatches (e.g., a tracks recipe with a heat-map palette). Most parameters still sample independently.
- **CLI + UI parity.** The same generator backs both `oceancanvas bloom` (CLI, batch) and the Recipe Editor's Bloom button (UI, interactive). One implementation, two interfaces.
- **Promotable.** A bloom worth keeping becomes a real recipe with a single command or click — file move, renamed, indexed in the gallery's main recipe list.
- **Self-hostable.** No external services. The generator is pure Python in the pipeline and pure TypeScript in the browser, sharing a fixture-validated sampling spec.
- **Extensible.** New parameters added by future RFCs flow into Bloom's sampling automatically as long as the new parameter declares its sampling bounds; no per-parameter generator code.

## Constraints

- **Recipe YAML as source of truth** (TA constraints). Blooms are real recipe files in `recipes/blooms/<seed-stem>/`. No special schema, no in-memory-only state.
- **Self-hostable** (TA constraints). No LLM calls, no external generation services. The generator runs locally.
- **Deterministic** (TA constraints, ADR-027 spirit). The RNG is seeded by hash of `(seed_file_content, --seed_param, bloom_index)`. Re-runnable.
- **Cross-validated where applicable** (precedent: RFC-011, RFC-014). The sampling spec — distribution per parameter, bounds, coherence rules — lives in a shared fixture file consumed by both pipeline and browser implementations. Both produce identical output for the same inputs.
- **Recipe schema integrity** (RFC-001, ADR-018). Blooms validate against the recipe schema; CI gates the bloom output the same way it gates hand-authored recipes.
- **No regression on hand-authoring.** The recipe YAML format is unchanged; hand-authored recipes remain first-class. Bloom is an addition, not a replacement.

## Proposed approach

### Seed format — YAML stub with pins and sampling hints

```yaml
# seed.yaml
data_source: obis-whale-shark
region:
  bbox: [-180, -30, 180, 30]
  name: tropical
duration_seconds: 60
fps: 30

# Optional: pin fields to fixed values (these are not sampled)
pins:
  audio.identity: ambient
  render.palette: thermal

# Optional: narrow or widen sampling bounds for specific parameters
sampling:
  audio.atmosphere:
    distribution: normal
    mean: 0.6
    std: 0.15
  audio.vocal.presence:
    range: [0.3, 0.7]
  audio.drone.presence:
    range: [0.15, 0.35]            # keep drone recessed across all blooms
```

Required fields: `data_source`, `region`, `duration_seconds`, `fps`. Everything else is optional. Pins lock fields exactly; sampling hints override default sampling bounds.

A reference recipe can serve as a seed: passing a full recipe as the seed file is equivalent to passing every parameter as a pin. To bloom *around* a recipe (use it as anchor, not a lock), the author drops fields from the `pins:` block and re-introduces them as `sampling:` hints with narrow ranges.

### Sampling strategy — anchored sampling with diversity rejection

For each modulatable parameter `p` not in `pins`:

1. Determine the parameter's type from the recipe schema (numeric range, enum, envelope archetype).
2. Determine sampling distribution from `sampling[p]` (if present) or the default registered in `bloom_sampling_spec.yaml`.
3. Draw a candidate value using the seeded RNG.
4. Apply coherence rules (next section) — some draws are conditional on prior draws.

For numeric parameters: default to uniform sampling within `[param_min, param_max]`. Override with `distribution: normal` plus `mean`/`std` for anchored sampling, or `range: [lo, hi]` for tighter uniform.

For enum parameters (`audio.accent_style`, `render.palette`, etc.): uniform random pick from the enum's values, weighted by an optional default weight map.

For envelope parameters (per RFC-014): sample from an *archetype library*:

```
ARCHETYPES = {
  "slow_bloom":     Envelope(points=[(0, 0.2), (0.7, 0.8), (1.0, 0.5)]),
  "plateau":        Envelope(points=[(0, 0.3), (0.2, 0.7), (0.8, 0.7), (1.0, 0.4)]),
  "swell_decay":    Envelope(points=[(0, 0.2), (0.5, 0.9), (1.0, 0.3)]),
  "subtle_breath":  Envelope(points=[(0, 0.4), (0.5, 0.5), (1.0, 0.4)], lfo_depth=0.1, lfo_hz=0.2),
  ...
}
```

Pick an archetype, jitter the breakpoint values by ±10% and breakpoint times by ±5%, optionally enable embedded LFO. The archetype library is shipped in `pipeline/src/oceancanvas/bloom_archetypes.yaml` and mirrored in the browser bundle.

Diversity rejection: after each candidate is fully assembled, compute parameter-space distance to all previously-accepted blooms. Reject candidates whose minimum distance is below a threshold (`diversity_threshold: 0.15` default, exposed as a `bloom` CLI flag). Re-sample up to a budget (default 50 attempts per bloom) before giving up and accepting the best candidate. The distance metric is a weighted Euclidean over normalised parameter values; weights live in the sampling spec so the project decides which parameters count more for "feeling different" (atmosphere and vocal_presence weighted high; texture_density weighted low).

### Coherence rules — light touch

A small lookup table prevents the most jarring mismatches:

```yaml
# bloom_coherence.yaml
data_source_to_palette_family:
  obis-whale-shark:   [oceanic, cool, mono-teal]
  obis-leatherback:   [oceanic, cool, mono-teal]
  obis-elephant-seal: [oceanic, cool, mono-teal]
  oisst:              [thermal, diverging, warm]
  argo:               [muted, oceanic]

audio_identity_to_atmosphere_range:
  ambient:    [0.45, 0.85]
  synthetic:  [0.00, 0.30]

region_size_to_particle_density:
  large:  { range: [0.1, 0.4] }     # bbox > 60° → sparse
  medium: { range: [0.3, 0.7] }
  small:  { range: [0.5, 0.95] }     # bbox < 20° → dense
```

Rules are advisory in the sense that pins always win — an author who pins `render.palette: thermal` on a tracks recipe overrides the lookup and the result is the author's responsibility. With no pin, the rule constrains the sample space to the matching family, then samples uniformly within it.

The lookup tables are project-shipped and editable; a future RFC can extend them to handle phase 4 features (modal scales, ghost accumulation).

### Output layout

```
recipes/
  blooms/
    whale-shark-tropical-2026-05-14/
      seed.yaml                       # copy of input seed for provenance
      bloom_001.yaml
      bloom_002.yaml
      bloom_003.yaml
      bloom_004.yaml
      bloom_005.yaml
      manifest.yaml                   # generation parameters: --seed value, N, diversity_threshold, timestamp
```

The directory name is `<seed-stem>-<YYYY-MM-DD>` unless overridden with `--output-dir`. Each bloom is a full valid recipe YAML and renders standalone. The gallery indexes `recipes/blooms/**/*.yaml` separately from `recipes/*.yaml` so blooms are visible but not promoted by default.

Promotion via `oceancanvas promote recipes/blooms/whale-shark-tropical-2026-05-14/bloom_003.yaml --name pacific-thermal-drift` does three things: copies the file to `recipes/pacific-thermal-drift.yaml`, removes any `bloom_seed:` provenance block from the YAML (added by the generator for traceability), and triggers a re-index. The original bloom remains in place; promotion is non-destructive.

### Determinism

```
master_seed = sha256(read(seed_file) + str(seed_param) + str(N))[:8]   # 64-bit seed
per_bloom_seed[i] = sha256(master_seed + str(i))[:8]
```

Each bloom uses its own per-bloom seed, but the sequence of per-bloom seeds is fully determined by the master seed. Re-running `bloom seed.yaml --seed 42 --n 5` produces byte-identical YAML files in any order. Diversity rejection iteration is deterministic — same seed → same sequence of accept/reject decisions.

The `--seed` flag defaults to a stable value derived from the current date in production (a maintainer auditing yesterday's blooms gets the same ones); in CI, `--seed` is set explicitly for fixture parity.

### CLI

```
oceancanvas bloom <seed.yaml> [options]
  --n N                  number of blooms (default 5)
  --seed INT             RNG seed (default: stable hash of date)
  --output-dir PATH      override default output location
  --diversity FLOAT      minimum parameter-space distance (default 0.15)
  --dry-run              render but do not write files

oceancanvas promote <bloom-path> [--name NAME]
```

### UI (Recipe Editor)

A "Bloom" button in the Recipe Editor opens a seed-builder panel: required fields pre-populated from any current editor state, pins toggleable per parameter, sampling hints editable. "Generate 5" runs the bloom and opens the 5-up contact sheet — five preview tiles in a grid, each showing the bloom's name, a thumbnail render (key frame), an audio preview snippet, and a "Promote" button. Authors can click any tile to load the bloom into the Recipe Editor for further refinement.

The 5-up view is *the* generative gesture in the gallery. RFC-013's circular knobs reading a bloom feel like dialling in a found preset, not authoring from scratch.

### Cross-validation

A `tests/cross-validation/bloom/` fixture set carries (seed.yaml, --seed value, N) inputs and expected bloom YAML outputs. Browser `bloom.ts` and pipeline `bloom.py` both consume the same JSON, assert byte-identical output. Coverage:

- Each data source × audio identity combination (~10 cases)
- Pins-only vs. sampling-hints vs. mixed (3 cases)
- Reference-recipe-as-seed (1 case)
- Diversity rejection edge case (1 case where the candidate space is small and the generator hits the attempt budget)

Total target ~20 fixtures at v1. Recipe schema validation runs over every produced bloom in CI.

## Alternatives considered

### Alternative — LLM-assisted bloom

Send the seed to a hosted LLM (Claude, GPT-4), prompt it to produce N recipes conforming to the schema.

Rejected. Three reasons, any one sufficient. **Self-hostable constraint** — external service violates the TA constraint that the project run end-to-end on a single host with no third-party API dependency. **Determinism** — LLMs do not produce identical output for identical inputs at meaningful temperature. **Schema integrity** — recipes must round-trip through the YAML parser without revision; LLMs hallucinate field names and structural shapes; the rejection rate would push effective N down and authoring cost back up. A purely procedural sampler runs in milliseconds, is cross-validatable, and never produces invalid YAML.

### Alternative — uniform random sampling without diversity rejection

Sample N independent times within parameter bounds; accept whatever comes out.

Rejected. With N=5 and a 20-parameter space, uniform independent samples cluster more often than authors expect — two of five blooms end up with similar atmosphere mixes and similar palettes by coincidence. The cost of diversity rejection is negligible (one Euclidean distance computation per candidate; budget of 50 attempts per bloom is microseconds at most); the perceived variety gain is large. Reject this; ship diversity.

### Alternative — ephemeral blooms (preview-only, never written to disk)

Blooms exist in-memory in the editor; only persist when promoted.

Rejected. The gallery's existing model is file-system parity — recipes are files, the file system is the source of truth. Ephemeral blooms force a parallel state model in the gallery, make CLI bloom (no UI) impossible, and break the reproducibility story (a bloom you saw yesterday is unrecoverable today). Writing five YAML files is cheap; reading them in the gallery is free; sharing them is `git add`.

### Alternative — diff-against-seed bloom format

Each bloom stores only the parameters that differ from the seed; lazy-merge at render time.

Rejected. Adds a "seed reference" indirection that no other recipe has. Promotion becomes "materialise the diff" — a transformation step that hand-authored recipes do not need. Storage savings are trivial (each bloom is a few KB of YAML). Standalone full YAML is the cheaper model.

### Alternative — natural-language seed ("blue whale migration in the Pacific")

Parse a short prompt into the structured seed.

Rejected. NL parsing without an LLM is brittle for any vocabulary the project does not pre-define; LLM parsing is rejected on self-hosting grounds. A YAML stub with three required fields is no harder to author than a sentence and is unambiguous.

### Alternative — preset breeding (literal Absynth Mutator interpretation)

Pick two reference recipes A and B; the bloom generator produces offspring with characteristics from both via crossover and mutation.

Deferred to v2. Single-seed bloom is the v1 foundation and covers the most common use case (cold start, variant exploration). Breeding semantics are real questions (which fields cross over? mutation rate? sexual vs. asexual?) that deserve their own RFC once single-seed bloom has shipped and authors are asking for the next step. The single-seed path's archetype library and sampling spec are the same machinery breeding would extend, so v2 is not a rewrite.

### Alternative — sample audio and visual independently, accept all mismatches

Drop coherence rules. The author handles mismatches in promotion.

Rejected. The most jarring mismatches (cool palette on a thermal data source, vocal-heavy ambient over a frenetic visualisation) are exactly the cases authors will reject every time. Coherence rules cost a small lookup table; the rejection rate they save is high. The rules are advisory — authors can override via pins — so the surprise-discovery use case is preserved when it is wanted.

## Trade-offs

- **Coherence rules require maintenance.** New data sources, new palettes, new audio identities all extend the lookup tables. Acceptable — the tables are small and the cost of an out-of-date rule is "some blooms look off until the table updates."
- **Diversity threshold is a knob.** Set too low and blooms cluster; set too high and the generator hits the attempt budget often and falls back to the best candidate. Default `0.15` is a starting guess; adjustable per-bloom-run.
- **Output directory grows.** Five blooms per run × N runs × authors → many YAML files. Mitigation: blooms directory is git-tracked but most generated blooms are never committed (authors promote the keepers and the rest are local artifacts). A `.gitignore` rule on `recipes/blooms/**` is the recommended default; promotion writes to the tracked `recipes/` root.
- **Reference-recipe-as-seed loses author intent.** When a recipe with hand-tuned envelopes is used as a seed, the bloom may produce variants that drop the envelope authoring. Mitigation: envelopes are first-class in pins — `pins: { audio.atmosphere: <envelope-ref> }` keeps them.
- **Cross-validation surface grows.** Bloom's fixture set is larger than RFC-014's because the input space is larger. Mitigation: focus fixtures on coherence rules and edge cases; sample-by-sample parity over the full parameter space is not realistic and not needed (the per-parameter sampling distributions are validated separately).
- **CLI promotion is one-way.** A promoted bloom cannot be "unpromoted" — once it is a real recipe, it lives there. Acceptable; deletion is cheap.

## Open questions

1. **Diversity metric details.** Weighted Euclidean over normalised parameter values is the proposal; weights are project-shipped. Should weights be configurable per `bloom` invocation? Recommendation: not at v1; revisit once authors have used the tool.
2. **Default N value.** Five matches the contact-sheet metaphor. Some authors will want three (faster) or eight (more variety). Recommendation: default 5, CLI flag configurable, UI sticks to 5 for the contact-sheet UX.
3. **Bloom of blooms.** Can a bloom be a seed for another bloom run? Yes by construction (a bloom is a real recipe, real recipes work as seeds). Whether to surface this prominently in the UI is open. Recommendation: support it implicitly via CLI; UI gets a "Bloom variants of this" affordance only after the base flow is stable.
4. **Envelope archetype library extensibility.** Ship 6–10 archetypes at v1. Authors who want to add their own — via a project-tracked YAML edit, or via the editor saving favourites into a `~/.config/oceancanvas/archetypes.yaml`? Recommendation: project-tracked at v1; user-local archetypes can wait.
5. **Audio + visual coherence depth.** The proposed coherence rules are advisory. Should they be tightened (some combinations forbidden) or loosened (sample independently with a soft penalty)? Recommendation: advisory at v1; adjust based on observed bloom quality.
6. **Promotion naming.** Manual `--name pacific-thermal-drift` is the proposal. Authors will want auto-generated evocative names. Recommendation: manual at v1; auto-naming is a follow-up that does not block the foundation.
7. **Provenance block.** Each bloom YAML gets a `bloom_seed:` provenance block (seed file path, --seed value, bloom index, timestamp) for traceability. Promotion strips it. Should the promoted recipe retain a lighter `derived_from: bloom_003` reference for archaeology? Recommendation: yes; cheap and useful.
8. **Scope flag — bloom audio only / visual only.** Authors sometimes want to keep a visual fixed and bloom only the audio (or vice versa) — currently achievable via verbose pinning. A `--scope audio | visual | all` flag (default `all`) is cheap to add. Recommendation: ship at v1; the use case is real and the implementation is a single filter on which parameters get sampled.
9. **Clock sampling once RFC-016 closes.** RFC-016 introduces a clock primitive; Bloom's sampling spec extends to clock source / rate / wave / phase_offset. The cross-validation fixture grows. Sampling defaults should pick from musically-related rate values (`0.25, 0.5, 0.75, 1.0, 1.33, 2.0`) to keep polyrhythmic exploration coherent rather than chaotic.

## How this closes

- **ADR-034 — Bloom: seed format + sampling strategy.** Locks the seed YAML schema (required fields, pins block, sampling hints), the sampling pipeline (per-parameter distribution selection, diversity rejection, attempt budget), the deterministic seeding scheme, the output directory layout, the CLI surface, and the cross-validation fixture protocol.
- **ADR-035 — Coherence rules + envelope archetype library.** Locks the coherence lookup table schema, the archetype library schema and initial entries, the precedence rules (pins win over coherence rules win over default sampling), and the maintenance protocol for adding new data sources / palettes / archetypes.

Closure trigger: Phase 1 implementation forces the schema decisions once the CLI, the UI Bloom button, and the cross-validation fixture set all produce identical blooms end-to-end for the initial RFC-012 ambient-identity recipe family.

## Links

- **Source** — RFC-012 *Atmospheric audio* and RFC-014 *Modulation graph* establish the parameter space Bloom samples over · the Absynth Mutator and Moments intelligent-randomization analyses motivate the gesture
- **TA** — components/pipeline · components/web-frontend · contracts/recipe-yaml · constraints
- **Related RFCs** — RFC-001 Recipe YAML schema · RFC-012 Atmospheric audio · RFC-013 Editor controls · RFC-014 Modulation graph
- **Related ADRs** — ADR-018 Recipe YAML schema · ADR-027 · ADR-029 · ADR-030 · ADR-031 · ADR-032 · ADR-033
