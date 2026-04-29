# RFC-001 — Recipe YAML schema

> **Status** · Decided · closed 2026-04-30 → [ADR-018](../adr/ADR-018-recipe-yaml-schema.md)
> **TA anchor** · §contracts/recipe-yaml · §components/pipeline · §components/render-system
> **Related** · PRD-001 Recipe · PRD-003 Recipe Editor · UXS-003 Recipe Editor · RFC-002 Render payload format · RFC-005 YAML round-tripping
> **Closes into** · [ADR-018](../adr/ADR-018-recipe-yaml-schema.md)
> **Why this is an RFC** · The recipe YAML is the durable artefact of authorship. Its shape determines whether recipes feel like authored works or like configurations, and whether the editor's creative-parameters surface can round-trip cleanly. Multiple plausible schemas exist; the deliberation is genuine.

---

## The question

A recipe is a YAML file in `recipes/`. Every day the pipeline reads it, fetches data, builds a payload, and produces a render. The Recipe Editor authors it through a creative-control surface (mood preset, energy×presence, colour character, temporal weight) and through a YAML view where amber-highlighted lines are the parameters set by creative work and dim teal lines are structural.

The question: what is the schema? Specifically, how do we structure the file so that:

1. The creative parameters (the artistic intent) are visually and semantically distinct from the structural fields, supporting the editor's amber/teal colour-coding (per UXS-003).
2. Power users editing YAML directly can round-trip cleanly back to creative controls (RFC-005 depends on this).
3. The pipeline (RFC-002) can read the file and produce a render payload without ambiguity.
4. Recipes remain readable by humans years after authoring — version-control diffs should be legible.

The schema is the contract between the editor, the pipeline, and the artist. Getting it wrong contaminates all three.

## Use cases

1. **Authoring a new recipe in the editor.** User picks a mood preset, drags energy×presence, selects colour character. The editor serialises this into YAML and writes the file. The schema must capture the creative state in a form the editor can re-read.
2. **Editing the YAML directly.** A power user opens the file in their editor of choice. They tweak `colormap` from `thermal` to `thermal-soft`. The editor reads the change and snaps the colour-character control to the closest match (or marks it as "custom" — see RFC-005).
3. **Extending a recipe with a sketch override.** A user wants to push beyond what the render type system allows. They write a custom p5.js sketch. The recipe references it by path. The pipeline loads the override sketch instead of the template.
4. **Reviewing a year-old recipe.** The artist returns to a recipe they wrote a year ago. The YAML must be self-describing enough that they understand what they made without consulting the editor.

## Goals

- Creative and structural sections are visually separated in the file (supporting the editor's amber/teal rendering).
- Round-trip from creative controls → YAML → creative controls is lossless when no manual YAML edits have been made.
- The schema supports all six render types (field, particles, contour, pulse, scatter, composite) without conditional fields per type bleeding into the top level.
- A reasonable default exists for every technical parameter, so a minimal recipe has only creative fields and a source.
- The file is human-editable in any text editor without tooling.
- Schema is **flat** — no `creative:` / `technical:` nested blocks — and the editor's amber/teal distinction is communicated by a comment marker, not by document structure.

## Constraints

- *File-based storage in v1* — recipes are flat files under version control (TA §constraints).
- *Determinism* — same recipe + same data = same render (TA §constraints). The schema cannot contain implicit time-dependent fields.
- *Shared payload format* — whatever the pipeline produces from a recipe must work for both browser preview and Puppeteer render (TA §constraints).

## Proposed approach

A **flat schema with a comment-marker delimiter**. All keys live at the top level. A single line comment — `# ⊓ creative controls ⊓` — divides the file into two sections: above it, structural fields (the recipe's identity, region, sources, schedule); below it, creative state and the technical parameters derived from creative state. The editor renders lines below the marker in `editor-creative` (amber) and lines above in `editor-structure` (teal).

```yaml
# recipe: north_atlantic_sst
name: north_atlantic_sst
created: 2026-04-25
author: chipi

region:
  lat: [25, 65]
  lon: [-80, 0]

sources:
  primary: oisst
  context: gebco
  audio: openmeteo

schedule: daily

# ⊓ creative controls ⊓
mood: Becalmed
energy_x: 0.30
energy_y: 0.42
colour_character: thermal
temporal_weight: lingering

render:
  type: field
  colormap: thermal
  opacity: 0.71
  smooth: true
  clamp_percentile: [2, 98]
  overlay:
    levels: 5
    weight: 0.29

audio:
  feature: wave_height
  intensity_mapping: anomaly
  smoothing: 3

# optional escape hatch
sketch_override: null
```

**The marker comment.** The recognised pattern is a YAML comment line starting with `# ` followed by `creative controls` (case-insensitive), optionally bracketed by decorative characters (the `⊓` glyphs in the prototype are box-drawing characters used as visual horizontal-rule decoration). The editor matches against the regex `^# .*creative controls.*$`. Any line matching this is the marker; everything below it (until end of file) is the creative section.

**Above the marker** — structural fields. Identity (`name`, `created`, `author`), spatial bounds (`region`), data sources (`sources`), schedule (`schedule`). The pipeline reads these to know *what* to fetch and *when*. The editor renders these in teal.

**Below the marker** — creative state and derived technical params. The five creative-control values (`mood`, `energy_x`, `energy_y`, `colour_character`, `temporal_weight`) live as top-level keys. The technical blocks (`render`, `audio`) sit below them as the parameters those creative values drive. The editor renders all of this in amber.

**The `sketch_override` field.** Optional. Path to a custom p5.js sketch file. When present, the pipeline loads that sketch instead of the render-type template. The technical block is preserved but unused by the renderer when override is active.

**Rendering and round-tripping.** RFC-002 specifies how the pipeline turns this YAML into a render payload — only the lines below the marker (plus `region` and `sources` from above) are needed for rendering. RFC-005 specifies how the editor detects creative-state divergence: it computes `creative_to_technical(mood, energy_x, energy_y, colour_character, temporal_weight)` and compares against the actual `render` and `audio` blocks to decide if the recipe is matched, partially-custom, or custom.

## Alternatives considered

### Alternative: two-tier schema (`creative:` / `technical:` blocks)

The original v0.1 proposal: nested blocks with `creative:` holding the five creative-control values and `technical:` holding the render/audio params.

```yaml
creative:
  mood: Becalmed
  energy: [0.3, 0.42]
  ...
technical:
  colormap: thermal
  opacity: 0.71
  ...
```

Rejected because the prototype shows the design uses a flat schema with a comment marker, not nested blocks. The flat approach is cleaner: power users edit any line without nesting; the file reads more like a recipe and less like a configuration object. The two-tier shape also forced an artificial split of `audio:` (does it go in creative or technical?) — flat avoids that.

### Alternative: flat schema, no marker

All keys at top-level, no marker comment, no visual delimiter. The editor would identify creative-controlled lines by hard-coded list (e.g., "lines starting with `mood`, `energy_x`, … and lines under `render:` or `audio:`").

Rejected because the editor needs to know which lines to render in amber. A hard-coded list works *initially* but couples the editor to the schema — any new creative-driven field requires updating both the schema and the editor's list. The marker comment is content-driven: any line below the marker is creative, no list needed.

### Alternative: creative-only schema with technical fields inferred at runtime

The recipe stores only the five creative-control values. The pipeline computes `render` and `audio` parameters from creative state at render time using a deterministic mapping function.

Rejected because power users lose the ability to override individual technical parameters. This was a real consideration — the simplicity is appealing — but it eliminates the YAML-mode escape valve that PRD-003's "sharpest threat" argument depends on.

### Alternative: marker delimiters as paired tokens (`# CREATIVE_BEGIN` / `# CREATIVE_END`)

Use bracketing comment markers to delimit the creative section, allowing structural content to appear *after* the creative section.

Rejected because it adds complexity for no clear benefit. The single-marker convention places creative content at the bottom of the file by convention; structural content goes at the top. This matches how recipes are *read* (start with what it is, end with how it looks) and how they're *authored* in the editor (mood/energy first, render details below).

## Trade-offs

- **The mapping from creative state to technical params lives in the editor, not in the file.** This means the meaning of `mood: Becalmed` could drift across editor versions. Mitigation: version the preset definitions (`creative_mapping_version: 1` could be added to the marker line in a future revision; deferred).
- **Per-render-type technical fields means the `render:` block has variable shape.** A schema validator needs to know the render type before it can validate the block. Acceptable; the render type is the first key inside `render:`.
- **The marker comment is parser-relevant.** YAML treats comments as ignorable, so the pipeline doesn't care about the marker. But the editor *must* preserve it on save. Documentation must be explicit that the marker is meaningful.
- **A user who deletes the marker by accident loses the editor's amber highlighting.** The editor falls back to "all lines look the same" — no functional harm, but the visual cue is gone. The editor should restore the marker on save if it's missing.

## Open questions

1. Should the `region` block accept a named region (e.g., `region: north-atlantic`) as well as explicit lat/lon bounds? Cleaner for common cases; adds a region registry as another contract.
2. Should `created` and `author` be optional metadata or required? Required nudges good hygiene; optional keeps the minimal recipe minimal.
3. The `id` field is currently freeform (must be filesystem-safe). Should it be derived from `name` automatically, or stay as a separate field that humans pick? Auto-derivation is cleaner; manual gives more control over URLs.
4. Should the marker carry preset metadata (e.g., `# ⊓ creative controls ⊓ mood: Becalmed`) for redundancy, or is the `mood:` YAML key enough? The prototype shows the marker carries the mood — could be either decorative or load-bearing. v0.2 treats it as decorative (the `mood:` YAML key is the truth); a future revision could promote it to load-bearing if useful.
5. How are mood-preset definitions versioned? See trade-off above.

## How this closes

- **ADR-NNN — Recipe YAML schema v1.** Locks the flat-with-marker shape, the field set per render type, the marker convention, and the structural-vs-creative section semantics.

## Links

- **TA** — §contracts/recipe-yaml · §components/pipeline · §components/render-system · §constraints
- **Related PRDs** — PRD-001 Recipe · PRD-003 Recipe Editor
- **Related UXS** — UXS-003 Recipe Editor (visual contract for the YAML mode this schema feeds)
- **Related RFCs** — RFC-002 Render payload format · RFC-005 YAML round-tripping

## Changelog

- **v0.2 · April 2026** — Revised against prototype mockup (OC-02 Fig 5). Replaced the two-tier (`creative:` / `technical:`) proposal with a flat schema delimited by a comment marker (`# ⊓ creative controls ⊓`). Updated rationale, alternatives, trade-offs, and open questions to match. Added explicit marker-detection regex.
- **v0.1 · April 2026** — Initial draft, proposing a two-tier schema with separate `creative:` and `technical:` blocks. Superseded by v0.2.
