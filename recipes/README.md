# Authoring recipes

A recipe is a YAML file. It describes the region, the data source, the render character, the audio character, and the editorial shape of any timelapse made from it. Once authored, the pipeline reads it forever — every day at 06:00 UTC the data sits for the work that day.

This document is the field-by-field author reference. For *why* the schema looks the way it does, read [RFC-001](../docs/rfc/RFC-001-recipe-yaml-schema.md) and [ADR-018](../docs/adr/ADR-018-recipe-yaml-schema.md). For the visual contract of the Recipe Editor itself, see [UXS-003](../docs/uxs/UXS-003-recipe-editor.md).

For the philosophy of what a recipe *is*, see [PRD-001](../docs/prd/PRD-001-recipe.md).

---

## Anatomy of a recipe

```yaml
# north-atlantic-sst — the first OceanCanvas recipe
name: north-atlantic-sst
created: 2026-04-25
author: chipi
region:
  lat: [25, 65]
  lon: [-80, 0]
  name: North Atlantic
sources:
  primary: oisst
  context: gebco
schedule: daily

# ⊓ creative controls ⊓
render:
  type: field
  colormap: thermal
  opacity: 0.71
  smooth: true
  seed: 42
audio:
  drone_waveform: triangle
  drone_glide: 0.43
  pulse_sensitivity: 0.44
  presence: 0.62
  accent_style: chime
  texture_density: 0.36
tension_arc:
  preset: classic
  peak_position: 0.65
  peak_height: 1.0
  release_steepness: 0.7
  pin_key_moment: true
```

Two halves, separated by the `# ⊓ creative controls ⊓` marker:

- **Above the marker — structural.** Identity, region, sources, schedule. Edited rarely; locked once the recipe is in production.
- **Below the marker — creative.** Render character, audio character, tension arc. Edited freely; the recipe's authored voice lives here.

The Recipe Editor renders the two halves in different colours so you see what's structural at a glance.

---

## Structural fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | kebab-case slug | yes | Filesystem-safe, stable. Becomes the directory name in `renders/`. Must match the YAML filename. |
| `created` | ISO date | no | First-author date. Auto-set by the Recipe Editor. |
| `author` | string | no | Single author name. Phase 1 is single-author per ADR-016. |
| `region.lat` | `[min, max]` | yes | Latitude bounds. -90 to 90. |
| `region.lon` | `[min, max]` | yes | Longitude bounds. -180 to 180. |
| `region.name` | string | no | Human-readable region name. Shown on the gallery card. |
| `sources.primary` | source id | yes | The data source this recipe renders. See **Sources** below. |
| `sources.context` | source id | no | Optional secondary source layered underneath (e.g., `gebco` bathymetry under a `scatter` plot). |
| `schedule` | `daily` | yes | Phase 1 supports `daily` only. Other cadences would need an ADR. |

### Sources

| ID | What it is | Frequency |
|---|---|---|
| `oisst` | NOAA OISST sea surface temperature, 0.25° grid | Monthly composite |
| `argo` | Argo float density, gridded | Monthly |
| `obis-whale-shark` | OBIS whale shark observations | Monthly point counts |
| `obis-leatherback-turtle` | OBIS leatherback turtle observations | Monthly |
| `obis-elephant-seal` | OBIS elephant seal observations | Monthly |
| `gebco` | GEBCO bathymetry — context only | Static |

For the full data catalogue including deferred sources, see [OC-03 Data Catalog](../docs/concept/03-data-catalog.md).

---

## The render block

`render:` describes the visual character.

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | enum (see below) | required | Which p5.js sketch to use. |
| `colormap` | enum: `arctic` / `thermal` / `otherworldly` | `thermal` | Colour palette. Drives the visual "climate" of the piece. |
| `opacity` | 0–1 | `0.7` | Render opacity over the canvas background. |
| `smooth` | boolean | `false` | Bilinear vs nearest-neighbour upsampling. Calm pieces lean smooth; turbulent lean crisp. |
| `seed` | integer | `42` | Deterministic seed for any randomness in the sketch. Same seed + same data = byte-identical render. |
| `particle_count` | integer | varies | Particle/scatter point count. Driven by `energy_y` in the Recipe Editor. |
| `tail_length` | integer | varies | Trail length in frames for particle renders. Driven by `temporal_weight`. |
| `speed_scale` | number | varies | Particle/animation speed. Driven by `energy_x`. |
| `marker_size` | integer | varies | Scatter marker size in pixels. Driven by `energy_y`. |
| `marker_opacity` | 0–1 | varies | Scatter marker opacity. Driven by `energy_y`. |

### Render types — when to pick which

| Type | Best for | What it looks like |
|---|---|---|
| `field` | Continuous gridded data (SST, sea-level, anomaly) | Smooth temperature wash painted over the region. The default for SST recipes. |
| `scatter` | Point observations (biologging, Argo) | Coloured dots at observation locations, size and opacity authored. Used for whale-shark / leatherback / elephant-seal recipes. |
| `particles` | Flow / current data | Animated particles tracing flow lines. Heavier compute. |
| `contour` | Threshold-crossing visualisation | Iso-lines at specific values. Good for anomaly thresholds. |
| `pulse` | Event-driven data | Concentric rings emanating from event locations. |
| `composite` | Multi-layer renders | Two render types blended. Highest compute; reserve for editorial pieces. |

> **Power user note:** the Recipe Editor's *creative mode* sets every render field for you from four high-level dials (mood, energy_x, energy_y, colour_character, temporal_weight). The mapping lives in [`creativeMapping.ts`](../gallery/src/lib/creativeMapping.ts) / [`creative_mapping.py`](../pipeline/src/oceancanvas/creative_mapping.py) and is cross-validated TS↔Py. If you hand-author render fields, the editor will mark the recipe as *partially-custom* — both modes round-trip.

### The five mood presets

| Mood | energy_x | energy_y | colour_character | temporal_weight | Feel |
|---|---|---|---|---|---|
| `Becalmed` | 0.2 | 0.6 | 0.3 | 0.4 | Slow, cold, contemplative |
| `Deep current` | 0.4 | 0.8 | 0.4 | 0.7 | Sustained, deep, present |
| `Storm surge` | 0.9 | 0.3 | 0.5 | 0.6 | Turbulent, urgent, sharp |
| `Surface shimmer` | 0.5 | 0.5 | 0.6 | 0.3 | Light, dancing, ephemeral |
| `Arctic still` | 0.1 | 0.9 | 0.0 | 0.8 | Cold, almost frozen, very long |

The four axes:

- **`energy_x` (0 = calm, 1 = turbulent)** — drives `speed_scale`, smoothness. High energy = crisp + fast.
- **`energy_y` (0 = ghost, 1 = solid)** — drives `opacity`, `particle_count`, `marker_size`. High = dense and present; low = ephemeral.
- **`colour_character` (0 = arctic, 0.5 = thermal, 1 = otherworldly)** — picks the colormap.
- **`temporal_weight` (0 = moment, 1 = epoch)** — drives `tail_length`. Long trails = a piece that feels long.

---

## The audio block

`audio:` describes the generative audio character. Closed by [ADR-027](../docs/adr/ADR-027-generative-audio-composition.md). All fields optional; missing block = silent export.

| Field | Type | Default | Description |
|---|---|---|---|
| `drone_waveform` | `sine` / `triangle` / `sawtooth` / `square` | `triangle` | Pad oscillator type. `sine` = pure / cold. `sawtooth` = rich / urgent. |
| `drone_glide` | 0–1 | `0.5` | Pitch portamento. 0 = instant; 1 = very slow glide between data points. |
| `pulse_sensitivity` | 0–1 | `0.4` | How aggressively |Δ data| drives the rhythmic pulse. Calm recipes → 0.1–0.3. |
| `presence` | 0–1 | `0.7` | Overall mix presence. 0 = ghost; 1 = full. |
| `accent_style` | `chime` / `bell` / `ping` / `drop` | `chime` | Sample bank for key-moment events. `chime` = ascending C-major triad; `bell` = single A4; `ping` = bright record-high triad; `drop` = descending. |
| `texture_density` | 0–1 | `0.35` | Brown-noise texture amount. Atmospheric; think wave-wash bed. |

### From mood to audio

If you author via the Recipe Editor's creative mode, the audio block is derived mechanically from the same four creative-state axes:

| Mood preset | drone_waveform | accent_style | pulse_sensitivity | presence |
|---|---|---|---|---|
| Becalmed | sine | chime | 0.20 | 0.72 |
| Deep current | triangle | bell | 0.40 | 0.86 |
| Storm surge | triangle | ping | 0.90 | 0.48 |
| Surface shimmer | triangle | ping | 0.50 | 0.65 |
| Arctic still | sine | drop | 0.10 | 0.94 |

Direct mapping rules ([`creativeToAudio`](../gallery/src/lib/creativeMapping.ts)):
- `colour_character < 0.33` → `sine`; `< 0.66` → `triangle`; else `sawtooth`.
- `temporal_weight` → `drone_glide` directly.
- `energy_x` → `pulse_sensitivity` directly.
- `energy_y` → `presence` (lerped to 0.3–1.0 range) and `texture_density` (0.15–0.6).

---

## The tension arc block

`tension_arc:` shapes audio dynamics + visual filter values *together* across the video duration. Closed by [ADR-028](../docs/adr/ADR-028-tension-arc-shared-curve.md). Only consumed by the Video Editor and `oceancanvas export-video`; per-frame renders ignore it.

| Field | Type | Default | Description |
|---|---|---|---|
| `preset` | enum (see below) | `classic` | Curve shape. `none` = constant 1.0 = no arc effect (preserves v0.4.0 baseline). |
| `peak_position` | 0–1 | `0.65` | Where the arc peaks, as a fraction of duration. 0.5 = midpoint; 0.65 = classic two-thirds-of-the-way. |
| `peak_height` | 0–1 | `1.0` | Maximum arc value. Lower = subtler dynamics. |
| `release_steepness` | 0–1 | `0.7` | How sharply the arc drops after the peak. 0 = linear; 1 = cubic snap. |
| `pin_key_moment` | boolean | `false` | If true, the peak relocates to the dominant key-moment frame. The video lingers there for ~1 second; the audio drops to drone-only for that beat. The Record Moment gesture. |

### Preset shapes

| Preset | Shape | When to use |
|---|---|---|
| `classic` | Quadratic ease-in to peak, ease-out after | Default. Most stories. |
| `plateau` | Quick ramp, sustained plateau, late drop | Sustained anomalies, long-form pieces. |
| `drift` | Undulating, no clear peak | Ambient, no-build pieces (the Brian-Eno register). |
| `invert` | Classic mirrored — tense start, early release | Record-breaking pieces where the story is the opening reveal. |
| `none` | Constant 1.0 | Opt out. Audio + video stay flat across the video. |

### What the arc actually does

When the recipe carries a non-`none` arc:

- **Audio engine** multiplies per-frame layer gains (drone, pulse, accent, texture) by `arc[frame]`. Music swells toward the peak.
- **ffmpeg filter graph** keys per-second `eq=saturation = 1.0 − 0.35×arc` and `vignette=angle = π/5 − π/15×arc`. Image cools and tightens at the peak.
- When `pin_key_moment` is true and a moment exists: the video holds the moment frame for ~1 second; pulse + accent stop firing; texture mutes; drone holds full. The room goes quiet for a beat.

The single curve drives both dimensions in unison — that's [PRD-006](../docs/prd/PRD-006-piece.md)'s argument: a render-with-soundtrack becomes a piece.

---

## Authoring loop

```bash
# Author or edit a recipe
vim recipes/my-piece.yaml
# or visit http://localhost:8080/recipes/new

# Render it now (don't wait for 06:00 UTC)
make pipeline-run

# See it in the gallery
open http://localhost:8080

# Make a video of its accumulated history
open http://localhost:8080/timelapse/my-piece
```

---

## Validation

The pipeline validates recipes against [`recipe-schema.json`](../pipeline/src/oceancanvas/schemas/recipe-schema.json) on load. Invalid recipes are logged and skipped — they don't break the whole pipeline run. Common errors:

- Unknown `render.type` (must be one of: field / particles / contour / pulse / scatter / composite)
- `peak_position` outside 0–1
- Unknown `audio.drone_waveform` or `audio.accent_style`
- Lat/lon out of bounds
- Missing required fields (`name`, `region`, `sources.primary`, `schedule`, `render.type`, `render.seed`)

To validate without rendering: `uv run oceancanvas recipes --validate <name>`.

---

## See also

- **[`docs/concept/05-design-system.md`](../docs/concept/05-design-system.md)** — visual character of OceanCanvas as a whole. Helps before authoring the *creative* side.
- **[`docs/adr/ADR-018`](../docs/adr/ADR-018-recipe-yaml-schema.md)** — why the schema is flat with the comment marker.
- **[`docs/adr/ADR-027`](../docs/adr/ADR-027-generative-audio-composition.md)** — the audio engine in full.
- **[`docs/adr/ADR-028`](../docs/adr/ADR-028-tension-arc-shared-curve.md)** — the tension arc primitive.
- **[`docs/prd/PRD-001`](../docs/prd/PRD-001-recipe.md)** — *why* a recipe is the durable authored unit.
