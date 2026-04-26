# RFC-001: Recipe YAML Schema

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-003-recipe-system.md`, `docs/prd/PRD-006-recipe-editor-studio.md`
- **Related ADRs**: `docs/adr/ADR-004-no-database-v1.md`

## Abstract

This RFC defines the formal YAML schema for OceanCanvas recipes — the configuration files that define how ocean data becomes daily generative art. The schema must be human-readable, machine-parseable, and expressive enough to capture all creative and technical parameters without being intimidating to a non-developer user.

**Architecture Alignment:** Recipes are YAML files in `recipes/` committed to git (ADR-004). The schema defined here is what the pipeline reads (PRD-001), the recipe editor writes (PRD-006), and self-hosters edit directly.

## Problem Statement

The recipe is the core creative artifact of OceanCanvas. Its YAML format is the contract between the recipe editor (which writes it), the pipeline (which reads it), and the user (who may edit it directly). Without a formal schema, different parts of the system will interpret the format differently, leading to silent failures and difficult debugging.

## Goals

1. **Define all required and optional fields** with types, defaults, and validation rules
2. **Support all six render types** with their specific parameter sets
3. **Enable creative control round-tripping** — the recipe editor generates YAML from creative controls and parses YAML back to controls without information loss
4. **Be readable without documentation** — a human should understand what a recipe does by reading it

## Design & Implementation

### 1. Top-level structure

```yaml
name: north_atlantic_sst          # required — must match filename without .yaml
version: "1.0"                    # required — schema version
active: true                      # optional — default true; false pauses rendering

region:
  lat: [25, 65]                   # required — [south, north] in decimal degrees
  lon: [-80, 0]                   # required — [west, east] in decimal degrees

sources:
  primary: oisst                  # required — source_id from the sources catalog
  context: gebco                  # optional — default gebco (bathymetry context)
  audio: openmeteo                # optional — source_id for audio scalar

schedule: daily                   # required — daily | weekly | monthly

render:
  type: field                     # required — field | particles | contour | pulse | scatter | composite
  mood: Becalmed                  # optional — named preset; sets defaults for all style params below
  colormap: thermal               # optional — colormap name; overrides mood default
  opacity: 0.71                   # optional — 0.0–1.0; overrides mood default
  smooth: true                    # optional — boolean; overrides mood default
  clamp_percentile: [2, 98]       # optional — [low, high]; clips outliers
  energy: 0.14                    # optional — 0.0–1.0; maps to X axis of energy×presence
  presence: 0.28                  # optional — 0.0–1.0; maps to Y axis of energy×presence
  colour_character: 0.22          # optional — 0.0–1.0; Arctic cold → Thermal → Otherworldly
  temporal_weight: 0.28           # optional — 0.0–1.0; moment → epoch

audio:
  pitch: wave_height              # optional — scalar field from audio source
  tempo: wave_period              # optional — scalar field from audio source
  range: [60, 90]                 # optional — MIDI note range for pitch mapping
```

### 2. Per render type parameters

**field** (additional params):
```yaml
render:
  type: field
  overlay_contour: false          # optional — draw contour lines over the field
  overlay_levels: 8               # optional — number of contour levels if overlay_contour true
```

**particles** (additional params):
```yaml
render:
  type: particles
  particle_count: 800             # optional — generated from energy; exposed for power users
  speed: 1.2                      # optional — generated from energy
  tail_length: 25                 # optional — generated from temporal_weight
```

**contour** (additional params):
```yaml
render:
  type: contour
  levels: 12                      # optional — generated from energy
  weight: 0.45                    # optional — generated from presence
```

**pulse** (scalar source required):
```yaml
render:
  type: pulse
  ring_count: 8                   # optional — generated from energy
  amplitude: 1.4                  # optional — generated from energy
  decay: 0.82                     # optional — generated from presence
```

**scatter** (point source required):
```yaml
render:
  type: scatter
  dot_size: 4                     # optional — generated from presence
  dot_opacity: 0.7                # optional — generated from presence
```

### 3. Validation rules

- `name` must match the filename without `.yaml` (validated at pipeline start, not at save time)
- `region.lat[0]` must be less than `region.lat[1]`; same for `lon`
- `region` must fit within the processing region configured for `sources.primary`
- `render.type` must be one of the six valid types
- All float values in the `render` block must be within their documented ranges
- If `render.type` is `pulse`, `sources.primary` must be a scalar source (openmeteo, nsidc-extent, gmsl)

### 4. Creative control round-tripping

The recipe editor generates the `render.mood`, `render.energy`, `render.presence`, `render.colour_character`, and `render.temporal_weight` fields. When loading an existing recipe, the editor uses these fields to set the editorial controls. The generated technical parameters (colormap, opacity, particle_count, etc.) are derived from these creative fields — they do not need to be stored in the YAML unless the user has overridden them in YAML mode.

Priority: explicit technical parameter > generated from creative field > mood preset default > system default.

## Key Decisions

1. **Store both creative fields and technical parameters**
   - **Decision**: Store the creative fields (mood, energy, presence, colour_character, temporal_weight) in the YAML alongside the generated technical parameters
   - **Rationale**: This enables full round-tripping — the editor can reload any recipe and restore the exact creative control state. It also makes YAML mode educational: the user sees the relationship between creative choices and technical values.

2. **mood field is optional**
   - **Decision**: `render.mood` is optional — if absent, the editor uses the creative field values directly
   - **Rationale**: Power users who edit YAML directly may not want a mood preset. The creative fields are sufficient to reconstruct the editor state.

## Alternatives Considered

1. **Store only technical parameters (no creative fields)**
   - **Pros**: Simpler schema, no redundancy
   - **Cons**: Editor cannot restore creative control state from an existing recipe. YAML mode loses its educational value.
   - **Why Rejected**: Round-tripping is a core requirement of the recipe editor.

2. **Store only creative fields (no technical parameters)**
   - **Pros**: Cleaner, no parameter duplication
   - **Cons**: Pipeline would need to run the creative-to-technical translation at render time, adding complexity and a potential source of drift.
   - **Why Rejected**: Technical parameters in the YAML make the pipeline simpler and the output predictable.

## Open Questions

1. Should `version` be a schema version (for migration) or a recipe version (for change tracking)?
2. Should the recipe support multiple regions (e.g. North Atlantic + Mediterranean composite)?
3. What is the maximum allowed region size before the processing step refuses to process it?

## References

- OC-04 Technical Architecture: Recipe YAML schema section
- PRD-003: Recipe system
- PRD-006: Recipe editor studio
