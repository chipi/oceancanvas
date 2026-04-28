# Implementation — Phase 3 kickoff

> How Phase 1 gets built. What ships first, what gates the next slice, what order the rest follows.

This guide is the bridge between the documentation system and running code. It names three slices, the gates that justify moving from one to the next, and the rough order of what follows. It is not a roadmap. Roadmaps name dates; this guide names *gates*. A slice ships when it works end-to-end.

---

## The principle: each slice closes a complete loop

The instinct, faced with a complete documentation system, is to build everything in parallel — pipeline here, frontend there, recipes in a third place. Resist that.

Build slices that close. Each slice ends with a working end-to-end system that does *less* than the final product but does it *completely*. By the end of Slice 1, recipes render daily and someone can browse the results in the gallery. The system gets richer with each slice; it never sits half-built.

The reason is feedback. Documentation predicts; code teaches. The fastest way to learn where the documentation got something wrong is to make the system run.

Three slices, in order of increasing creative surface area:

1. **Pipeline + Gallery** — the daily loop, with renders accumulating in a public-facing gallery. Read-only.
2. **Recipe Editor + Dashboard** — authoring and reading. The full creative loop closes.
3. **Video Editor** — accumulation becomes film. Audio and overlays.

---

## Slice 1 — Pipeline + Gallery

The thinnest end-to-end slice that produces a daily-updating public artefact. Three recipes, three render types, three pipeline runs per day, a gallery that reads the manifest and shows the work.

### What ships

**Three recipes, one per render type.** Each is a hand-authored YAML file that exercises the relevant render type end-to-end:

- `north-atlantic-sst` — render type `field`. Source: NOAA OISST. The thermal heatmap canonical case.
- `gulf-stream-thermal` — render type `particles`. Source: NOAA OISST (primary) + GEBCO bathymetry (context). Particles flow along the SST gradient with bathymetry providing pathing context.
- `argo-scatter` — render type `scatter`. Source: Argo float daily index. Point data over the chosen region.

**Two data sources integrated:**

- NOAA OISST via ERDDAP — daily NetCDF, no authentication. Serves the SST recipes.
- Argo float daily index — daily JSON, no authentication. Serves the scatter recipe.

GEBCO bathymetry is one-time static data, fetched once and reused — not a daily integration.

**The full pipeline.** All six tasks: `discover` → `fetch` → `process` → `build_payload` → `render` → `index`. Runs daily at 06:00 UTC. Outputs:

- `data/sources/oisst/{date}.nc` and `data/sources/argo/{date}.json` — raw data
- `data/processed/oisst/{date}.{json,png,meta.json}` — processed format per ADR-015
- `data/processed/argo/{date}.json` — point-data processed format
- `renders/{recipe-id}/{date}.png` — daily PNG per recipe
- `manifest.json` — the gallery index, rebuilt by Task 06 each run

**The renderer.** Node 20 + Puppeteer + p5.js, with three sketch files in `sketches/` (repo root, mounted at `/sketches` in Docker):

- `field.js` — bitmap colour-mapped raster
- `particles.js` — flow particles seeded from data, with bathymetry context
- `scatter.js` — point markers with value-encoded colour

**The gallery.** React + Vite static build, served by Caddy. Per UXS-004 — but a deliberately reduced subset:

- ✅ The grid — 3 columns, one card per active recipe
- ✅ The 14-day strip — accumulated history of the focal recipe
- ✅ The source filter pills in the topbar
- ❌ The full-bleed hero — deferred to Slice 2
- ❌ Recipe and timelapse handoff actions on cards — deferred to Slices 2 and 3 (no editor or video editor exists yet to receive them)
- ❌ Click-into-recipe-page — deferred (no recipe page yet)

The grid and strip alone are enough to verify the accumulation promise. The hero is editorial polish that earns its place once there's something downstream to link from.

**The CI gate.** GitHub Actions workflow per ADR-013 + ADR-014:

- Lint and unit tests for Python and Node
- Build the gallery
- Build the pipeline Docker image
- Run a synthetic-data e2e test of the full pipeline (discover → render → manifest) using fixture data

**The deployment.** `docker compose up` brings up four containers per ADR-011: pipeline, prefect-server, postgres (Prefect state DB), gallery (Caddy). Volumes mount `data/`, `recipes/`, `renders/` from the host.

### What this proves

- **The architecture closes.** Pipeline produces what gallery reads. The contracts in TA §contracts (recipe.yaml, processed JSON, render payload, manifest.json) are real, not theoretical.
- **The shared payload format works for three render types.** The same payload structure feeds three different sketches. If the format is too field-centric, this slice exposes it.
- **The accumulation promise is visible.** The 14-day strip shows accumulated history. With three recipes running daily, the gallery starts looking like work after two weeks.
- **Determinism holds.** Re-running the pipeline produces byte-identical PNGs.
- **CI gates the pipeline.** Synthetic-data e2e in GitHub Actions catches regressions before they reach the daily run.
- **Self-hostable end-to-end.** Anyone with Docker can `git clone`, `docker compose up`, and have the system running on their own machine.

### Gate to Slice 2

The pipeline runs daily for **fourteen consecutive days** without manual intervention. Three recipes × fourteen days = forty-two PNGs accumulated. The gallery loads on a fresh `docker compose up` and shows:

- Today's renders in the grid
- A populated 14-day strip for the focal recipe
- Source filter pills that actually filter

CI is green on every commit. Re-running the pipeline produces byte-identical PNGs.

This is also when several RFCs close into ADRs:

- **RFC-001 (Recipe YAML schema)** — three hand-authored recipes parsed by both the pipeline and validated against the schema. Lock the schema.
- **RFC-002 (Render payload format)** — three render types consume the same payload structure. Lock the format.
- **RFC-003 (Recipe lifecycle on source unavailability)** — fourteen days of operation surface what happens when ERDDAP is slow or Argo's index is delayed. Decide and lock.

If the pipeline misses a day or the gallery breaks on a fresh deploy, fix that before adding anything. Daily cadence is sacred (TA §constraints).

---

## Slice 2 — Recipe Editor + Dashboard

The full creative loop closes. Authoring and reading — the surfaces a person uses to make and read the work. The hero from Slice 1's deferred gallery scope earns its place here, because there's now a Recipe Editor and a Recipe page (deferred or stubbed) to link to.

### What ships

**The Recipe Editor.** Per UXS-003. Preview canvas at the top, flip bar between Creative and YAML modes, the four creative-control surfaces (mood preset, energy×presence, colour character, temporal weight), the YAML mode with comment-marker amber highlighting, save/discard. Live preview running the same shared payload format the pipeline uses.

**The Dashboard.** Per UXS-001 (SST main view + editorial spread). Source rail with SST active, full-bleed thermal heatmap, three stacked stats cards, vertical legend, timeline scrubber, mini sparkline below. Editorial spread with 41-year trend chart and last-10-years anomaly bars.

**Gallery hero added.** The full-bleed hero per UXS-004 — today's featured render with metadata overlay and the now-real `recipe ↗` action. Cards in the grid also gain the `recipe ↗` action linking to the Recipe Editor at `/recipes/{id}`.

**Cross-surface state-passing.** Per IA §navigation:

- Dashboard "select region" mode passes lat/lon to `/recipes/new`
- Gallery `recipe ↗` actions pass recipe id to `/recipes/{id}`

**More recipes.** A handful of additional hand-authored recipes (likely 3–5 more) exercising different combinations of mood, energy, colour, and region. The recipe set grows from three to roughly eight, all using the three render types from Slice 1.

### What this proves

- **The shared payload format holds across editor and pipeline.** The editor's live preview is the canonical test — if the editor preview shows a result and the pipeline produces a different one from the same recipe, the system is broken.
- **The flat-with-comment-marker schema (RFC-001 v0.2) survives real authoring.** Power users edit YAML directly; round-tripping (RFC-005) operates on real recipes; the matched / partially-custom / custom states are real.
- **The mood-preset and energy×presence semantics are real.** Recipe authoring at the level of artistic intent works, or it doesn't.
- **Editorial-quality data reading is real.** The Dashboard is the surface that most directly tests OC-05's claims about treating scientific data with editorial dignity.
- **The creative loop closes.** Read the data on the Dashboard → select a region → author a recipe in the Editor → save it → see it in the Gallery the next morning.

### Gate to Slice 3

A recipe authored entirely in Creative mode produces a render byte-identical to what the pipeline produces from the same recipe file (the shared-payload-format constraint, verified). A power user editing YAML directly sees their changes reflected in the preview, and round-tripping back to Creative mode either preserves the state or honestly flags divergence.

The Dashboard loads with today's SST and the timeline scrubber works back to 1981. Region selection from the Dashboard passes lat/lon to the Recipe Editor.

The Gallery shows today's hero, the 14-day strip works, and `recipe ↗` actions navigate correctly.

UXS-001, UXS-003, and UXS-004 acceptance criteria all pass.

This is when the editor's RFCs close:

- **RFC-004 (Live preview architecture)** — the editor has run real recipes through the preview path. Lock the architecture.
- **RFC-005 (YAML round-tripping)** — power users have edited YAML and round-tripped back. Lock the algorithm.

---

## Slice 3 — Video Editor

Accumulation becomes film. By the time Slice 3 starts, the recipes from Slice 1 have months of accumulated frames. The Video Editor is the surface that turns that accumulation into something a person can show someone.

### What ships

**The Video Editor.** Per UXS-005. Preview area with sparkline, NEW RECORD banner, in-frame metadata, timeline ribbon with key-moment markers. Right panel with Sequence / Audio / Overlays sections. The ten overlays per UXS-005 (eight default-on, two deferred). Export to MP4.

**The audio system.** Per RFC-006. Stem-based crossfading driven by the per-frame intensity signal. The system generates the track at export time based on theme, energy arc, and sensitivity controls.

**Key moment detection.** Per RFC-007. The shared signal that audio and overlays both consume — peaks, records, threshold crossings, inflections — produced once per timelapse and consumed by both tracks.

**Gallery `timelapse ↗` actions wire up.** Cards in the grid and the hero gain the `timelapse ↗` action linking to `/timelapse/{recipe}`. The IA navigation graph closes.

### What this proves

- **The audio and overlays read as data, not decoration.** PRD-005's sharpest threat — that audio sounds like a soundtrack and overlays look like decoration — is finally testable at the artefact level. A viewer watching the export either feels the music swell at the same instant the anomaly indicator peaks, or doesn't.
- **The shared key-moment signal is the architecture's payoff.** RFC-007 produces the signal once; audio crossfades to it, the record-flash overlay fires on it, the timeline ribbon marks it, the anomaly indicator hits its highest contrast on it. One signal, four expressions.
- **The export carries the work elsewhere.** The MP4 plays anywhere a video plays. Citation, attribution, anomaly framing all baked into the frames. The work travels.

### Gate to Phase 1 ship

The Video Editor exports an MP4 from any recipe with at least 30 days of accumulated renders. Audio fires at detected key moments. Default overlays are on; pull quote and projection ghost are off (deferred per UXS-005). Export plays in any video player. Citation appears in every frame.

UXS-005 acceptance criteria pass. PRD-005's success markers can be honestly evaluated against the artefacts the editor produces.

This is when the audio and key-moment RFCs close:

- **RFC-006 (Audio system)** — closes into multiple ADRs: stem source choice (Mubert / Beatoven / local), crossfading approach, fallback policy.
- **RFC-007 (Key moment detection)** — closes into ADR with detector definitions and threshold defaults.

After Slice 3, Phase 1 ships.

---

## What gates a slice, what doesn't

A slice ships when:

- Its acceptance criteria pass — UXS acceptance criteria for surface slices, concrete artefact checks for backend slices
- CI is green
- The constraints in TA §constraints hold — determinism, daily cadence, no auth, file-based, self-hostable, shared payload, attribution baked in
- It runs on a fresh `docker compose up` from `git clone`

A slice does *not* ship when:

- "It's mostly working" — partial slices block the next slice from finding integration bugs
- "We can fix the gallery later" — the gallery loading correctly is the gate; deferring it means later slices find bugs that should have been caught earlier
- "The CI test is too strict" — the CI gate is the canary; loosening it means the system starts drifting silently

After Slice 1 ships, revisit this guide. Real implementation reveals patterns documentation can't predict. Update slice scope, gates, and ordering as evidence emerges.

---

## When to update which doc

Implementation produces feedback. Where that feedback lands depends on what kind of feedback it is.

| Implementation finding | Where it goes |
|---|---|
| RFC's proposed approach survives implementation cleanly | Close RFC into ADR; update TA §map and §stack |
| RFC's proposed approach needs adjustment | Revise RFC; bump the version; do *not* close yet |
| A constraint feels limiting in practice | This is the real test — most likely the constraint is right and the impulse is wrong. If genuinely wrong, write an ADR superseding the constraint |
| New audience surfaced through user testing | Update PA §audiences |
| New surface needed | Update IA §surfaces; write a new PRD; draft a UXS |
| New shared design token discovered | Add to IA §shared-tokens; remove any local definitions in UXSes |
| Surface contract changes (URL, navigation, shell) | Update IA first, then the affected UXS |
| New stack choice forced by implementation reality | Write an ADR; update TA §stack |

When you change one doc, ask which other docs read from it. Update them in the same commit when possible.

---

## The first commit

The first commit on the implementation branch is small and concrete: the bare repo skeleton.

```
pipeline/
  pyproject.toml
  src/oceancanvas/
    __init__.py
    flow.py
    deploy.py
gallery/
  package.json
  vite.config.ts
sketches/
  field.js
recipes/
  .gitkeep
data/
  .gitkeep
renders/
  .gitkeep
docker-compose.yml
.github/workflows/ci.yml
```

No code yet — just the structure. The structure itself is a commit because every subsequent commit anchors to it. Anchor it intentionally rather than letting it accrete.

The second commit starts Slice 1.

---

## References

- **CLAUDE.md** — project conventions for AI-assisted code work
- **`docs/adr/OC_TA.md`** — components, contracts, constraints, stack, state board
- **`docs/prd/OC_PA.md`** — audiences, promises, principles
- **`docs/uxs/OC_IA.md`** — surfaces, navigation, shared tokens
- **The PRDs** — `docs/prd/PRD-001..005.md`
- **The UXSes** — `docs/uxs/UXS-001..005.md`
- **The RFCs** — `docs/rfc/RFC-001..007.md`
- **The ADRs** — `docs/adr/ADR-001..017.md`
- **The concept package** — OC-00 through OC-05 at the project root
