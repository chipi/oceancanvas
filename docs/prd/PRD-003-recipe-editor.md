# PRD-003 — Recipe Editor

> **Status** · Draft v0.1 · April 2026
> **Sources** · OC-02 §Surface 2 · OC-04 §Recipe editor studio
> **Audiences** · artist (PA §audiences)
> **Promises** · *authored*, *grounded* (PA §promises)
> **Principles** · *aesthetic-traces-to-data*, *data-is-hero* (PA §principles)
> **Why this is a PRD** · The recipe-as-concept (PRD-001) requires an authoring surface. The argument for *how authoring should feel* — at the level of artistic intent rather than parameter manipulation — is product judgment, not interface design.

---

You think *storm*. You click *Storm surge*. The preview transforms — the field tightens, the particles speed up, the colour cools to an industrial blue. You drag a point on the energy×presence canvas toward turbulent-ghost. The preview responds. You never see a number.

## The problem

Creative software tends to expose its parameters. Photoshop has sliders for hue, saturation, brightness — three numerical knobs. After Effects has dozens of nested property panels. The convention works for technical users; it fails for creative users who think in moods, not values.

The OceanCanvas recipe is, technically, a YAML file with about thirty parameters: `render_type`, `colormap`, `particle_count`, `opacity`, `tail_length`, `contour_levels`, and so on. If the editor exposes those parameters as labelled controls, it has imported the failure mode of every parameter-driven creative tool: the user thinks *I want this to feel like a storm* and is asked to think *particle_count: 4000*.

The artist's mental model is mood, energy, character, weight. The system's mental model is parameters. Bridging those two is the whole problem of the editor — and getting it wrong does not produce a slightly worse experience. It produces a tool that reads as configuration.

## The experience

You open the editor with a region pre-selected from the dashboard. The preview takes the upper half of the screen with today's actual data already rendering. Below it, a control surface: five mood presets in a row, an energy×presence canvas, a colour-character spectrum, a temporal-weight scale. No labelled inputs. No sliders showing 0.4. No dropdowns named `colormap`.

You click *Becalmed*. The field smooths, the particles slow, the palette cools. You drag the energy×presence point gently up and to the right. The preview tightens. You move the colour character toward thermal. You watch the ocean become exactly what you wanted by adjusting feelings, not values.

You toggle to YAML. The control surface flips; the preview stays. You see the file your choices have generated. The lines that came from your creative work are amber; the structural fields are dim blue. You spot one parameter you would like to nudge directly — you change it. You toggle back. The creative controls have moved to match.

You save. The recipe enters the pipeline.

## Why now

PRD-001 asserts that recipes are authored works. Without an authoring surface that operates at the level of artistic intent, that assertion is empty — the only way to author a recipe would be to edit YAML, which is configuration work by definition. The whole frame collapses.

The Recipe Editor is also the surface that does the most to determine whether OceanCanvas attracts the artist audience at all. Generative-art-curious users either have a moment of *this is for me* in the first three minutes of the editor or they leave. The editor's first impression is the project's recruitment moment.

## Success looks like

- A user describes the piece they made by character (*"turbulent ghost, thermal, lingering"*) rather than by values.
- The YAML mode is used by power users *after* they have made a piece, not as the primary authoring path.
- A user learns what *Storm surge* means in technical terms by flipping to YAML and noticing the amber lines — not by being taught.
- The preview is treated as the canvas. Users move toward it, not toward the controls, when they are working.

## Out of scope

- The recipe-as-concept argument. PRD-001 holds that.
- The render execution. RFC and ADR territory.
- Sharing or publishing recipes between users. Phase 1 is local.
- Versioning a recipe across edits. Edit-in-place; no history. Versioning may come later.
- Templates and starter recipes beyond the five mood presets. Named starters (e.g. *Gulf Stream particles*) are deferred.
- The sketch editor's actual code-editing UX. Its own RFC and UXS hold that surface.

## The sharpest threat

**Power users feel infantilised.**

The creative-control surface is designed for artists thinking in moods. A power user — a developer, a generative-art veteran — opens the editor and sees five named presets and a 2D point. Their first reaction is *where are the actual controls?* If the YAML toggle and the sketch-editor escape hatch do not communicate clearly enough that the full parameter surface is one click away, this user concludes the tool is shallow and leaves.

The risk is highest in the first sixty seconds of someone's first session. The visibility, labelling, and prominence of the YAML and sketch-editor toggles in the flip bar carry the entire weight of communicating *the surface goes deeper than it looks*. If they read as buried, the failure mode is a permanent perception.

## Open threads

- **RFC — Mood preset definitions.** The five presets must be authored carefully — they set the tonal range artists work within. Each preset is a complete parameter snapshot; the snapshots themselves are creative work.
- **RFC — Energy×presence mapping.** Which parameters move with X, which with Y, and how — the semantics underlying the 2D space.
- **RFC — Live preview architecture.** Does the preview run the actual p5.js sketch or a fast approximation? Affects fidelity at edit time vs. responsiveness during exploration.
- **RFC — YAML round-tripping.** Power users edit YAML directly; the creative controls must snap back to the closest match. Algorithm for this.
- **UXS-003 — Recipe Editor.** Static visual contract.

## Links

- **Source** — OC-02 §Surface 2 · OC-04 §Recipe editor studio
- **PA** — §audiences · §promises · §principles
- **Related PRDs** — PRD-001 Recipe (the artefact this surface authors) · PRD-002 Dashboard (hands off the region) · PRD-004 Gallery (where the saved work appears)
