# PRD-001 — Recipe (the authored work)

> **Status** · Draft v0.1 · April 2026
> **Sources** · OC-01 §Three layers (Layer 2 — Create) · OC-02 §The concept · §The creative loop · OC-04 §Recipe editor studio
> **Audiences** · artist, climate-communicator (PA §audiences)
> **Promises** · *authored*, *grounded*, *accumulation*, *citation-travels* (PA §promises)
> **Principles** · *aesthetic-traces-to-data*, *determinism*, *recipes-are-durable*, *attribution-baked-in* (PA §principles)
> **Why this is a PRD** · A recipe is the central creative artefact of OceanCanvas. The argument for what a recipe *is* — and what kind of relationship it creates between author and work — has to be made before any of the surface PRDs can land.

---

You name it *North Atlantic Drift*. You set the region — 30°N to 60°N, west of Ireland to Newfoundland. You pick the source — sea surface temperature, daily. You choose how it should look: thermal field, present temporal weight, slightly turbulent. You save the recipe. Tomorrow morning, while you are still asleep, the ocean will sit for it.

## The problem

Generative-art tools produce images. Data-visualisation tools produce charts. Both make output that is finite — a JPEG, a PNG, a frame. Once made, it stops.

The work OceanCanvas wants to make is different in kind. A piece of music is finite, but a piece of music *for piano* is not — it can be performed again and again, in different rooms, by different hands, and remain the same piece. What is the ocean equivalent? A piece authored once, performed daily by the data, that is recognisably itself across years even though no two days produce the same render.

There is no existing form for this. Generative art treats each render as the work; data dashboards treat each render as a snapshot. Neither gives an artist something they can author once and keep authoring.

## The experience

You have been watching the dashboard for weeks; the thermal anomaly in the North Atlantic has been growing. You decide to make a piece about it.

You open the recipe editor with that region pre-selected. You name the work *North Atlantic Drift*. You choose particles — what you want is the feeling of the current. You drag a single point in the energy×presence space toward turbulent-ghost. You pick a colour character — thermal, slightly otherworldly. The preview moves. You watch your piece appear with today's data.

You commit. The recipe is now a YAML file in a folder; the file is also a piece of work. Tomorrow at 06:00 UTC the pipeline reads it, fetches today's SST, runs the sketch, saves a PNG. Six months from now you will have a hundred and eighty frames. Each one is recognisably *North Atlantic Drift* — the same character, the same palette, the same composition logic. None are identical. The ocean has been sitting for the work, day by day.

The recipe persists. You did not generate an image. You composed a piece.

## Why now

Recipe-as-concept is the foundation under everything else. The Recipe Editor is the surface that authors them; the Gallery is where they live; the Video Editor is how they accumulate into film. None of those PRDs can argue their case until *what a recipe is* is settled.

The earlier OC documentation describes recipes as YAML configurations that the pipeline runs. That description is true at the file level and wrong at the conceptual level. The configuration is not the work. The work is the long-running performance of the data through the recipe's authored character. PRDs that treat recipes as configurations end up specifying configurations; PRDs that treat them as authored works end up specifying authoring experiences. The distinction is not academic. It changes every surface that follows.

## Success looks like

- Someone shows you a recipe they made and says "this is mine" with the tone of authorship, not configuration.
- A recipe runs for a year and the year of renders reads as one work in time, not three hundred and sixty-five unrelated images.
- Removing a recipe feels like a deliberate act, not a cleanup. No automatic expiry, no "stale" warnings, no nudges to delete. Recipes outlast attention.
- A user describes their recipe to someone else by name, character, and intent — *"North Atlantic Drift, particles, slightly turbulent"* — not by parameter values.

## Out of scope

- The authoring interface itself. PRD-003 (Recipe Editor) holds that.
- How recipes are presented to others. PRD-004 (Gallery) holds that.
- How recipes accumulate into time. PRD-005 (Video Editor) holds that.
- The render execution. RFC and ADR territory. The recipe describes the work; the pipeline performs it.
- The YAML schema specifically. RFC-001 holds that.
- Multiple authors per recipe. Phase 1 is single-author. Collaborative authorship is a later question.

## The sharpest threat

**Recipes feel like configurations.**

If users come to recipes through a configuration mental model — *I am setting up a render job* — every other promise unravels. Authorship dissolves into setup. Accumulation becomes output history. The Gallery becomes a render queue's display.

The whole frame depends on whether the recipe surface (editor, file format, gallery presence) successfully communicates that this is a creative work, not a job spec. The risk is highest at the YAML view in the editor — once you see field names like `colormap` and `particle_count` you are in configuration-land. The amber-highlighted-creative-fields convention from OC-04 is a partial defence; it has to work, or the frame breaks.

## Open threads

- **RFC-001 — Recipe YAML schema.** What fields, what types, how creative parameters serialise without leaking into configuration vocabulary.
- **RFC — Recipe lifecycle.** What happens when a source becomes unavailable mid-recipe-life. Pause, fail loudly, render NaN frames? Affects how durable a recipe really is.
- **RFC — Recipe naming and identity.** Are recipe IDs filesystem-safe slugs, freeform names with separate IDs, or both? Affects URL structure and Gallery linking.
- **ADR — Single-author Phase 1.** Confirm. Multi-author defers indefinitely.

## Links

- **Source** — OC-01 §Three layers (Layer 2 — Create) · OC-02 §The concept · §The creative loop · OC-04 §Recipe editor studio
- **PA** — §audiences · §promises · §principles
- **Related PRDs** — PRD-003 Recipe Editor (authoring) · PRD-004 Gallery (presentation) · PRD-005 Video Editor (accumulation in time)
