# RFC-002 — Render payload format

> **Status** · Draft v0.1 · April 2026
> **TA anchor** · §contracts/render-payload · §components/render-system · §constraints (shared payload)
> **Related** · RFC-001 Recipe YAML schema · RFC-004 Live preview architecture · ADR-008 Shared payload format
> **Closes into** · ADR (pending — schema details, distinct from ADR-008 which locks the principle)
> **Why this is an RFC** · The render payload is the contract between the pipeline (or live editor) and the p5.js sketch. Multiple plausible representations exist with real trade-offs around browser load time, server-side parity, and debuggability. The principle of "one payload format for both contexts" is locked (ADR-008); the actual schema is open.

---

## The question

Every render — whether in the Recipe Editor's live preview or in the daily Puppeteer pipeline — receives a payload through `window.OCEAN_PAYLOAD` that the p5.js sketch consumes to produce the canvas output. The payload contains the data arrays, region bounds, audio scalars, and metadata the sketch needs.

What goes in the payload, and how is it serialised? The question has three sub-questions:

1. **Format.** JSON object? Typed-array binary? Multi-file bundle? The choice affects browser load time, debuggability, and Puppeteer parity.
2. **Granularity.** One payload per render with all sources embedded, or separate payloads per source loaded by reference?
3. **Numeric precision.** Float32 (smaller, sufficient) or Float64 (larger, lossless)?

The same sketch reads this payload in the editor preview (live) and in the pipeline render (headless). Whatever schema is chosen, both contexts must produce byte-identical output. ADR-008 locks the principle. This RFC locks the schema.

## Use cases

1. **Editor live preview.** User adjusts the energy×presence point. The editor reassembles the payload and re-injects it into the preview iframe. The sketch redraws. This happens many times per second during interactive use.
2. **Pipeline render.** Daily, for each active recipe, the pipeline reads `data/processed/`, builds a payload for the recipe's region, and writes it to a temp file. Puppeteer launches Chromium, loads the sketch HTML, sets `window.OCEAN_PAYLOAD` from the temp file, waits for `window.__RENDER_COMPLETE`, screenshots.
3. **Sketch-override authoring.** A power user writes a custom p5.js sketch. They need to know what fields are guaranteed to exist on `window.OCEAN_PAYLOAD`. The schema is the documentation.
4. **Debugging a misrendered frame.** A render looks wrong. The artist opens the payload file in their editor. The schema must be human-readable enough that they can check whether the data is wrong or the sketch is wrong.

## Goals

- Same schema in both contexts (editor live preview and pipeline render). No conditional fields per context.
- Loadable in under 100ms for a typical regional payload (North Atlantic OISST + GEBCO).
- Human-readable enough to debug from the file alone.
- No dependency on a binary-format library beyond what's already in the stack (no msgpack, no protobuf, no NetCDF-in-browser).
- Forward-compatible: adding new fields doesn't break old sketches.

## Constraints

- *Shared payload format* — same shape for editor and Puppeteer (TA §constraints; locked by ADR-008).
- *Determinism* — same payload + same sketch = same render bytes (TA §constraints).
- *File-based storage in v1* — payload is a file on disk, not a database query result.

## Proposed approach

A single JSON file per render (or per preview) with a fixed top-level schema. Numeric arrays serialised as plain JSON arrays of float32 values. One file, loaded with a single `fetch`, parsed with `JSON.parse`. No separate context loading.

```javascript
// window.OCEAN_PAYLOAD shape

{
  "version": 1,
  "recipe": {
    "id": "north-atlantic-drift",
    "name": "North Atlantic Drift",
    "render_type": "particles",
    "render_date": "2026-04-25"
  },
  "region": {
    "lat_min": 30, "lat_max": 60,
    "lon_min": -50, "lon_max": -10
  },
  "canvas": {
    "width": 1200,
    "height": 900
  },
  "primary": {
    "source_id": "oisst",
    "data": [/* flat Float32Array, length = lat_count * lon_count */],
    "shape": [lat_count, lon_count],
    "min": 4.2,
    "max": 21.8,
    "lat_range": [30.0, 60.0],
    "lon_range": [-50.0, -10.0],
    "nan_value": -999.0,
    "fetched_at": "2026-04-25T06:14:22Z"
  },
  "context": {
    "bathymetry": { /* same shape as primary */ }
  },
  "audio_scalars": {
    "wave_height_mean": 2.4,
    "current_speed_mean": 0.31
  },
  "creative": {
    "mood_preset": "storm-surge",
    "colour_character": "thermal",
    "temporal_weight": "lingering"
  },
  "technical": {
    "colormap": "thermal-warm",
    "particle_count": 4000
  }
}
```

Numeric arrays as plain JSON arrays of float32 values. Yes, this is verbose. Modern JSON.parse handles a 100k-element float array in under 30ms in Chrome — well within the 100ms goal. The verbosity is the price of debuggability and zero binary-library dependency.

The `creative` and `technical` blocks mirror RFC-001's recipe schema, allowing the sketch to read either creative-state-driven or technical-parameter-driven decisions without duplicating logic.

## Alternatives considered

### Alternative: typed-array binary (Float32Array via ArrayBuffer)

Serialise numeric arrays as a base64-encoded binary block, decoded into a `Float32Array` in the sketch. Considerably smaller on the wire, faster to parse.

Rejected at this stage. The size and parse-time benefits are real but small for typical regional payloads (a 280×360 OISST grid is ~400KB as JSON, ~50ms parse). The cost in debuggability is large — you cannot eyeball a binary blob in a text editor when something looks wrong. Worth revisiting if payloads grow significantly (full-globe sources, multi-day stacks).

### Alternative: separate payload files per source, loaded by reference

The main payload references context layers by URL; the sketch loads them with additional fetches. More flexible (sketch decides which context to load); more I/O.

Rejected because it breaks the single-source-of-truth-per-render property. A render is defined by exactly one payload file. If the sketch makes additional fetches, the determinism guarantee gets harder to verify (was the bathymetry file the same on date X as on date Y?). Single payload, even if larger, is the cleaner contract.

### Alternative: NetCDF in the browser

Use `netcdfjs` or similar to read NetCDF directly in the browser, eliminating the JSON conversion step.

Rejected because it adds a non-trivial library dependency for browser code, and because NetCDF is the source format, not the consumption format. The processed JSON is already a reduction of NetCDF to what the sketch needs; introducing NetCDF parsing in the browser duplicates work and complicates the sketch contract.

## Trade-offs

- **JSON size.** A 280×360 region at float32 is ~400KB raw. JSON inflation makes it ~1.2MB on disk. Acceptable for v1; revisit if payloads commonly exceed 5MB.
- **Float32 throughout.** Loses precision vs. float64. For ocean data this is fine — most sources are themselves float32 at origin. Sketches that need more precision can request a float64 mode in a future schema version.
- **Schema versioning by `version` field.** Adds a field every payload pays for. Cheap; pays off the first time we add a new top-level field.
- **No streaming.** The entire payload is in memory before the sketch starts drawing. Acceptable at v1 sizes; would need rethinking for full-globe payloads.

## Open questions

1. Should `audio_scalars` be a flat object or a structured time series? Today's payload is for one render (one date); for video editor work the scalar time series matters. Probably a separate payload concern (RFC-006 Audio system territory) — keep flat-object here.
2. Should the payload include the source attribution string, or should the sketch hard-code attribution by source_id? Including it makes the payload self-describing for export; hard-coding is more compact but couples the sketch to source metadata.
3. Should the payload be validatable by JSON Schema? Useful for sketch authors writing overrides; adds a schema file to maintain.

## How this closes

- **ADR-NNN — Render payload schema v1.** Locks the field set, the array serialisation choice, and the version field convention.

## Links

- **TA** — §contracts/render-payload · §components/render-system · §constraints (shared payload format)
- **Related ADRs** — ADR-008 (shared payload format principle, already accepted)
- **Related RFCs** — RFC-001 Recipe YAML schema · RFC-004 Live preview architecture
