# ADR-031 — Recipe `source_mode` directive for particles render type

> **Status** · Accepted
> **Date** · 2026-05-07
> **TA anchor** · contracts/recipe-schema, components/render-system
> **Related issue** · #98 (particles track-mode for point-array sources)
> **Parent** · #103 (whale-shark 4-variant comparison)

## Context

The particles render type was built for one input shape — gridded scalar fields whose spatial gradient produces flow vectors (used by `gulf-stream-thermal` and the other currents recipes). Point-archive sources (OBIS biologging) cannot use it because the gradient-perpendicular flowAt() expects a flat-indexed `[rows × cols]` array.

But the artistic intent of the whale-shark-currents recipe is exactly the particles aesthetic — animals as ocean sensors, paths as flow lines. We need a way to render point archives through the particles vocabulary without inventing a new render type.

## Decision

Add an optional `render.source_mode` directive to the recipe schema, with two values:

- `flow` (default) — the existing gridded-scalar interpretation. Particles initialised at random grid positions, advected through gradient-perpendicular flow.
- `tracks` — point-archive interpretation. Source data is a list of `{id, points}` objects (per-dataset chronological tracks). Each track renders as a coloured polyline, ordered by date — head bright, tail fading.

`process_obis_tracks` walks the OBIS source archive, groups observations by `datasetName` (each research program's sightings become one track), sorts each group chronologically, and writes the static artefact `data/processed/obis-{species}/tracks.json`. Tracks shorter than 5 points are dropped to suppress noise.

`build_payload` checks for `render.source_mode == "tracks"` and loads the static tracks file in place of per-date data; the render date becomes the synthetic `tracks`. `_crop_to_region` detects `points`-bearing list items and passes the data through unchanged — track projection happens in the renderer using the recipe region.

`particles.js` branches on `source_mode` at the top of `setup()` and dispatches to a `drawTracks` helper that renders each track as a sequence of `line()` segments with per-segment alpha and stroke weight (head→tail gradient).

## Rationale

- **Reuses the particles render type.** The aesthetic the recipe wants is what particles already deliver; only the data shape differs. A `source_mode` switch is cheaper than a new render type.
- **DatasetName as track grouping.** OBIS occurrence records do not carry per-animal IDs, so dataset is the best available proxy for "one observation programme's view of the ocean." Different research groups in different regions produce visually distinct threads.
- **Static artefact, not per-date.** Tracks describe an archive, not a moment. Recomputing per day is wasteful and the visual is stable.
- **Track passthrough in `_crop_to_region`.** The crop function already handles 1D and 2D shapes; a third path (point list with `points` key) keeps the change minimal.

## Alternatives considered

- **New render type `tracks`** — would duplicate ~70% of particles.js infrastructure (canvas setup, colormap, attribution). Rejected.
- **Per-animal tracks via animal IDs** — OBIS occurrence records do not generally carry these. Future biologging sources with telemetry tags could enable this; until then, dataset-level grouping is honest.
- **Continuous animation of particles along tracks** — violates determinism (clock-dependent) and would require a different output format than PNG. Static polyline rendering captures the visual idea faithfully.

## Consequences

**Positive:**
- The whale-shark-currents recipe now produces the intended aesthetic instead of falling back to scatter.
- Future point-archive sources (telemetry tags, citizen science records) can use the same lever.
- The visual reads in the same vocabulary as the gulf-stream currents — a unifying aesthetic across the catalog.

**Negative:**
- Track recipes opt out of the date scrubber (single render). Acceptable — tracks are archive views, not daily snapshots.
- Without per-animal IDs, a "track" is per-dataset, not per-individual. The editorial framing must reflect this; the recipe description names "research dataset's sightings" rather than "one shark's path".
- `min_track_length=5` filter is a magic number. Defensible — short tracks read as noise, not pattern — but adjustable via processor argument.

## Implementation notes

- Schema: `pipeline/src/oceancanvas/schemas/recipe-schema.json` (`render.source_mode` enum)
- Pipeline: `pipeline/src/oceancanvas/tasks/obis.py::process_obis_tracks`
- CLI hook: runs after density aggregation in `oceancanvas fetch-historical -s obis-{species} --process`
- Build payload: `pipeline/src/oceancanvas/tasks/build_payload.py::_build_one_payload` (path branch on `source_mode == "tracks"`); `_crop_to_region` (track passthrough)
- Renderer: `sketches/particles.js::drawTracks`
- Recipe: `recipes/whale-shark-currents.yaml` (was scatter fallback, now particles+tracks)
- Tests: `pipeline/tests/unit/test_obis.py::TestProcessObisTracks` (4 tests)
