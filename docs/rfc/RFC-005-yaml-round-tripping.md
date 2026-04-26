# RFC-005 — YAML round-tripping

> **Status** · Draft v0.2 · April 2026 · revised to match RFC-001 v0.2 flat schema
> **TA anchor** · §contracts/recipe-yaml · §components/web-frontend
> **Related** · PRD-003 Recipe Editor · UXS-003 Recipe Editor · RFC-001 Recipe YAML schema
> **Closes into** · ADR (pending)
> **Why this is an RFC** · The Recipe Editor's flip between Creative mode and YAML mode is a core artistic surface (PRD-003). Creative mode generates YAML; YAML mode allows direct edits. When a power user changes a value in YAML and flips back to Creative, what happens? The deliberation is not whether to support this — both modes must exist (PRD-003 sharpest threat) — but how the round-trip handles divergence between the two representations.

---

## The question

The editor maintains two representations of the same recipe:

1. **Creative state** — five values held in the editor's UI: `mood`, `energy_x`, `energy_y`, `colour_character`, `temporal_weight`.
2. **YAML representation** — the full recipe file with structural fields above the marker and creative state + technical params (`render`, `audio`) below the marker (per RFC-001 v0.2).

Going *creative state → YAML* is straightforward: the deterministic mapping function takes creative-state values and produces the `render` and `audio` blocks. The editor writes the creative-state values as YAML keys (`mood:`, `energy_x:`, etc.) and the derived blocks below them. All of these lines render amber in YAML mode.

Going *YAML → creative state* is harder. If a power user edits the YAML directly — changes `colormap` from `thermal-warm` to `arctic-cool`, or sets a particle-count override — what should the creative controls do when the user flips back to Creative mode?

There is no perfect answer. The mapping creative-state → technical-params is many-to-one (multiple creative states can produce similar technical values for some parameters), and the YAML edit may be a small tweak (still maps to a creative state) or a fundamental change (no creative state matches).

## Use cases

1. **Small tweak in YAML.** Power user changes `render.opacity` from `0.71` to `0.74`. Almost no effect on creative state — the energy×presence point would barely move. The creative controls should snap to the closest match.
2. **Large change in YAML.** Power user replaces the entire `render` block with hand-tuned values — different colormap, different blend mode, different particle behaviour. No nearby creative state exists.
3. **Round-trip preservation.** User opens an existing recipe, never edits YAML, just adjusts creative controls and saves. The YAML's `render`/`audio` blocks should match exactly what the creative-to-yaml-mapping would produce, preserving git diffs at minimum.
4. **Sketch override active.** Recipe has `sketch_override` set to a path. The technical block is ignored by the pipeline. What do creative controls show?

## Goals

- A pure creative-mode workflow produces stable YAML across sessions (no spurious diffs).
- A power user editing YAML never has their work silently overwritten by creative-mode interactions.
- The user can always tell, by looking at the editor, whether the current creative-control state matches the YAML or has diverged.
- The same mapping function generates creative-state → YAML in the editor and the pipeline (no separate "interpretation" of the YAML happens at render time).

## Constraints

- *Determinism* — creative-state-to-technical mapping must be a pure function. Same creative state always produces the same technical values (TA §constraints).
- *File-based storage* — recipes are flat YAML; the editor cannot rely on hidden metadata in a database (TA §constraints).
- *Flat schema with marker* — the schema (per RFC-001 v0.2) is flat; round-tripping operates on lines below the marker, not on a separate `creative:` block.
- *No editor-only sketch code* — the round-tripping logic lives in the editor, not in the sketch.

## Proposed approach

**Inverse-mapping with a "custom" indicator.** Two-way binding for clean cases; explicit "custom" marker when divergence is detected. The logic operates on lines below the comment marker (per RFC-001 v0.2).

The editor keeps a deterministic mapping function `creative_to_technical(creative_state) → technical_dict`. This function is the source of truth for forward conversion. It is pure, versioned, and identical in editor and pipeline.

For YAML → creative state, the editor parses the file and partitions it at the marker:

```
parsed_yaml.below_marker:
  creative_state C = (mood, energy_x, energy_y, colour_character, temporal_weight)
  technical_blocks T = {render: {...}, audio: {...}}

expected_T = creative_to_technical(C)

if T == expected_T:
    # Clean recipe. Creative controls show C exactly.
    state = "matched"
elif T differs from expected_T only in a small number of fields:
    # Power user tweaked some values. Creative controls show C.
    # Tweaked fields are highlighted in YAML view as user-edits (slightly brighter amber).
    state = "partially-custom"
else:
    # Major divergence. Creative controls show C but greyed out;
    # a "custom" badge appears.
    state = "custom"
```

The user can always:

- Click "Reset to creative" — overwrites the technical blocks with `creative_to_technical(C)`. Loses YAML edits; warns first.
- Click "Adopt YAML as creative" — finds the *closest* creative state that produces the current technical blocks (using a distance function on the mapping output) and updates `C` accordingly. May be lossy; warns first.
- Continue working in `custom` state — creative controls are read-only; YAML edits remain the source of truth.

The state (`matched`, `partially-custom`, `custom`) is editor-side only. It is *not* persisted in the YAML file. Reopening the recipe re-runs the comparison.

For sketch overrides (use case 4), the editor displays creative controls greyed out with a "sketch override active" message. The five creative-state YAML keys (`mood`, `energy_x`, etc.) and the technical blocks (`render`, `audio`) are preserved as-is but unused by the pipeline.

## Alternatives considered

### Alternative: hash-based detection (store creative state hash in YAML)

Embed a hash of the creative state as a field in the YAML; if it doesn't match the recomputed hash, mark as custom.

Rejected because it adds non-semantic state to the recipe file. The recipe is the artist's authored work; sticking a hash in there to support editor logic is the wrong concern in the wrong file. The inverse-mapping approach achieves the same detection from data already in the recipe.

### Alternative: never round-trip — YAML edits are one-way

Once a user edits YAML, the recipe is permanently in "custom" mode. Creative controls are disabled forever for that recipe.

Rejected because it punishes small tweaks. A user nudging one parameter shouldn't lose access to the creative surface. The `partially-custom` middle state is the right granularity.

### Alternative: full inverse mapping (always derive creative from technical)

When loading a YAML, recompute creative state from the `render`/`audio` blocks via an inverse function. Always show the closest creative state. Ignore the creative-state YAML keys (`mood:`, etc.) entirely.

Rejected because the mapping is many-to-one — there is no unique inverse. The closest creative state may not be what the user intended (they may have made deliberate technical-only choices). Better to preserve the user's stated creative state (the explicit `mood:` etc. keys) and detect divergence than to second-guess it.

### Alternative: lock the YAML mode behind a confirmation

Require a "Yes, I want to edit YAML directly" confirmation before allowing technical-block edits. Reduces accidental divergence.

Rejected because it makes the YAML mode feel hostile. PRD-003's sharpest threat is power users feeling infantilised; gating YAML edits behind a confirmation worsens that. The custom state already provides clarity without friction.

## Trade-offs

- **The "closest creative state" function for Adopt YAML as creative is lossy.** The user may end up with creative-control values they didn't choose. Mitigation: confirm before adopting.
- **Editor and pipeline must use the same mapping function.** This is a code-sharing constraint — the mapping logic lives in a module imported by both. Keeps logic synchronised; means a bug in the mapping affects both contexts at once.
- **State detection runs every time YAML is loaded.** Cheap (parse + comparison) but a non-zero startup cost per recipe.
- **The creative-state YAML keys (`mood:`, `energy_x:`, etc.) are duplicate sources of truth with the `render`/`audio` blocks.** They have to stay in sync — when out of sync, the state-detection algorithm picks up the difference and flags it as `partially-custom` or `custom`. This is the feature, not a bug, but it's worth being explicit that the editor must always update both the creative-state keys *and* the derived blocks together.

## Open questions

1. How small a divergence is `partially-custom` vs `custom`? A single field edit is clearly partially-custom; a complete rewrite is clearly custom. Where between? Probably a fixed threshold (e.g., >50% of fields differ).
2. Should there be a visible indicator in the gallery for recipes in `custom` state — a small marker that this is a power-user piece? Could enrich the gallery with a useful signal; could also be visual noise.
3. The mapping function will evolve (new presets, refined energy×presence behaviour). A recipe authored in v1 should still load correctly in v2. Versioning the mapping function with a `creative_mapping_version` field in the recipe? Probably worth it.
4. When the marker comment is missing (e.g., user deleted it accidentally), should the editor (a) restore it on save with the current mapping; (b) treat the entire file as custom; or (c) show a warning prompt? Probably (a) — restore silently, since the marker is editor-managed metadata.

## How this closes

- **ADR-NNN — Round-tripping and divergence handling.** Locks the matched/partially-custom/custom state model, the explicit user actions (Reset, Adopt), the no-hash policy, and the mapping-function-versioning approach.

## Links

- **TA** — §contracts/recipe-yaml · §components/web-frontend
- **Related PRDs** — PRD-003 Recipe Editor (this RFC was flagged in its open threads)
- **Related UXS** — UXS-003 Recipe Editor (visual contract for the YAML mode this RFC operates on)
- **Related RFCs** — RFC-001 Recipe YAML schema (the schema this RFC operates on)

## Changelog

- **v0.2 · April 2026** — Revised to match RFC-001 v0.2's flat schema. Replaced "loaded_yaml.creative / loaded_yaml.technical" partitioning with "lines below marker — creative-state keys + technical blocks (render, audio)". Added open question about marker-comment recovery on accidental deletion. Updated trade-offs to note the dual-source-of-truth between creative-state YAML keys and derived blocks.
- **v0.1 · April 2026** — Initial draft, written assuming the two-tier (`creative:` / `technical:`) schema from RFC-001 v0.1. Superseded by v0.2.
