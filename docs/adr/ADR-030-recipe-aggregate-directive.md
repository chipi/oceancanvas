# ADR-030 — Recipe `aggregate` directive for point-source binning

> **Status** · Accepted
> **Date** · 2026-05-07
> **TA anchor** · contracts/recipe-schema, components/process-pipeline
> **Related issue** · #95 (biologging density-grid aggregation)
> **Parent** · #103 (whale-shark 4-variant comparison)

## Context

Point-format sources (OBIS biologging today, future point datasets) cannot be rendered as continuous fields because their processed JSON has shape `[n_points]` while `field.js` expects `[rows, cols]`. The whale-shark realm — fifty years of sightings — is fundamentally a *density* portrait that wants the field render type, not the scatter render type.

We needed a way for a recipe to declare that the source data should be aggregated into a grid before rendering, without inventing a new render type or duplicating the field sketch.

## Decision

Add an optional `render.aggregate` directive to the recipe schema, with a single value in v1 — `density` — and a companion `render.resolution` (degrees per bin).

When set, the process pipeline runs an aggregation pass that bins all observations across the source archive into a global lat/lon grid at the declared resolution, writing `data/processed/{source_id}/density-{resolution}.json` with the same shape contract as field-render data: row-major flat array, row 0 = lat_min, last row = lat_max.

`build_payload` checks for `render.aggregate` on the recipe and loads the density file in place of the per-date file. The render date for density recipes is the synthetic `aggregated`. The render type stays `field` — no sketch changes.

## Rationale

- **No new render type.** Density grids are mathematically fields; reusing `field.js` keeps the render-type catalog minimal.
- **No build_payload regression.** The 1D / 2D shape detection in `_crop_to_region` already handles both. Density just routes through the 2D path.
- **One aggregation per archive, not per date.** Density is time-aggregated by definition — recomputing nightly would be wasteful and the artefact is stable across the daily cadence.
- **Resolution in the path.** Lets multiple resolutions coexist on disk without conflict; recipe declares the resolution it wants and gets a deterministic file name.

## Alternatives considered

- **New render type `density`** — would duplicate 80% of `field.js`. Rejected.
- **Aggregation in `build_payload`** — would re-run on every render. Wasteful and non-deterministic across pipeline runs if archive changes. Rejected.
- **Aggregation as a separate top-level directive** outside `render` — confusing because `aggregate` and `resolution` shape what the renderer sees. Belongs under `render`. Rejected.

## Consequences

**Positive:**
- Sparse point sources can now produce field-grade artwork without sketch surgery.
- The directive is general — any future point source (NDBC buoys, future biologging species) can use it.
- Single static artefact per archive; cheap to render daily.

**Negative:**
- Recipes with `aggregate: density` opt out of the date scrubber — they render once with date `aggregated`. Acceptable for the editorial use case (the realm of a species is not a date-dependent thing) but a new shape in the gallery to be aware of.
- The aggregation step is currently OBIS-specific; generalising to other point sources requires similar per-source process functions.

## Implementation notes

- Schema: `pipeline/src/oceancanvas/schemas/recipe-schema.json` (`render.aggregate`, `render.resolution`)
- Pipeline: `pipeline/src/oceancanvas/tasks/obis.py::process_obis_density`
- CLI hook: runs after per-year processing in `oceancanvas fetch-historical -s obis-{species} --process`
- Build payload: `pipeline/src/oceancanvas/tasks/build_payload.py::_build_one_payload` (path branch on `aggregate == "density"`)
- First recipe: `recipes/whale-shark-density.yaml`
- Tests: `pipeline/tests/unit/test_obis.py::TestProcessObisDensity` (5 tests)
