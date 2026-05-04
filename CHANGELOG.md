# Changelog

All notable changes to OceanCanvas are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For prose-formatted release notes with full context, see [GitHub releases](https://github.com/chipi/oceancanvas/releases).

## [Unreleased]

### Added
- Audio "drop to drone only" gesture at the held moment — pipeline `_inject_hold` returns a `hold_mask`; pulse + accent skip new firings during hold; texture mutes; drone holds full. PRD-006's lede gesture now lands. Browser engines apply the same mask for the equivalent span during preview.

### Changed
- Cross-validation parity for `creativeToAudio` ↔ `creative_to_audio` — added shared fixture (13 cases) so the audio mapping has the same regression harness the visual mapping has had since v0.3.
- Recipe schema (`recipe-schema.json`) now validates `audio:` and `tension_arc:` blocks with enum + bounds; previously unknown keys were silently accepted.
- `ADR-019` (render payload schema) annotated with the v2 additions (`recipe.audio`, `recipe.tension_arc`).

## [0.5.0] — 2026-05-04 — The piece (tension arc as shared primitive)

### Added
- **Tension arc** (RFC-011 → ADR-028) — a single authored curve over the video duration shapes audio dynamics + visual filter values in unison. Recipes carry a `tension_arc:` block beneath the creative-controls marker (preset / peak_position / peak_height / release_steepness / pin_key_moment). Five preset shapes: `classic` / `plateau` / `drift` / `invert` / `none`.
- **Cross-validated TS↔Py expansion** — `gallery/src/lib/tensionArc.ts` and `pipeline/src/oceancanvas/arc.py` produce byte-identical arrays within 1e-9 across an 18-case fixture battery.
- **Audio engines consume arc per frame** — `setTensionArc(arc)` on `AudioEngineInterface`; both `SynthEngine` and `AmbientEngine` multiply per-frame layer gains by `arc[frame]`.
- **ffmpeg visual coupling** — `_build_arc_chain` emits 1Hz `sendcmd` keyframes for `eq=saturation = 1.0 − 0.35×arc` and `vignette=angle = π/5 − π/15×arc`. Image cools and tightens toward the peak.
- **Record Moment hold** — when `pin_key_moment: true` and a dominant moment exists, both video concat duration and audio `_inject_hold` extend the held frame for ~1 second. Image holds, audio holds, both at once.
- **`ArcEditor` component** — small SVG curve preview with five preset pills, draggable peak handle, and pin-to-record-moment toggle. Keyboard accessible.
- **Arc overlay** in `AudioWaveform` — paints the curve as a faint guide line over the visualizer canvas, plus a live indicator dot at `currentFrame`.
- **PRD-006 ("The piece")**, RFC-011, ADR-028, and a full UXS-005 update for the new components.

### Changed
- `OceanPayload` bumped to **v2**. `recipe.tension_arc` carries the spec (not the expanded array), mirroring how `recipe.audio` already worked. Each consumer expands at use time with its own `totalFrames` + dominant-moment-frame context. v1 payloads remain readable by v2 consumers.
- All 11 recipes migrated to `tension_arc: classic` with `pin_key_moment: true` via idempotent `scripts/migrate-recipes-arc.mjs`.
- Recipe schema (`recipe-schema.json`) gained `audio:` and `tension_arc:` blocks with enum + bounds.

### Quality
- 397 tests (133 gallery + 264 pipeline). +30 over v0.4.0.
- Cross-validation parity: 18 cases for arc, 13 cases for audio mapping.
- Determinism: same recipe + same data → byte-identical synthesised WAV (arc + hold included).
- CLI export-video arc-and-hold forwarding tests cover full + `--silent` paths.

## [0.4.0] — 2026-05-03 — Generative audio + multi-engine architecture

### Added
- **Generative four-layer engine** (RFC-010 → ADR-027, supersedes ADR-026 stems). Layers: drone (oscillator → filter), pulse (scheduled samples), accent (event one-shots), texture (noise loop with seasonal envelope). Browser via Web Audio; pipeline via numpy synthesis + ffmpeg AAC encode.
- **Recipe `audio:` block** — six creative-level fields (`drone_waveform`, `drone_glide`, `pulse_sensitivity`, `presence`, `accent_style`, `texture_density`) derived mechanically from creative state. Cross-validated TS↔Py.
- **JMJ-inspired ambient engine** (`AmbientEngine`) — three-voice detuned chord pad with LFO filter sweep, synthesized minor-pentatonic arpeggio, reverb send. Five JMJ-themed presets: Oxygène, Equinoxe, Magnetic Fields, Chronologie, Glacial drift.
- **Channel mixer + 3-band EQ** in the Video Editor — per-channel mute + volume sliders, bass / mid / treble shelves on the master.
- **Cross-surface navigation** — Recipe Editor, Video Editor, Gallery Detail, Gallery all share consistent nav link styling.
- **Video Editor download popup** — replaces the previous teal Export button. Click `download` in topbar; popup hosts overlay toggles + state-aware action button (Render & download → Rendering… → Download MP4).

### Changed
- ADR-026 (stem crossfading) marked Superseded by ADR-027.
- Audio assets: 7 small samples (~210 KB) in `audio/generative/` replace 16 MB of stems in `audio/themes/`.

### Removed
- `gallery/src/hooks/useAudioPlayback.ts` (old stem hook).
- `audio/themes/{ocean,dramatic,deep}/` directories.

## [0.3.0] — 2026-05-03 — Pipeline Infrastructure + Historical Data + Biologging

### Added
- **`oceancanvas` CLI** — 7 commands: `run`, `backfill`, `render`, `fetch-historical`, `status`, `recipes`, `index`.
- **Parallel rendering** — `ConcurrentTaskRunner` with per-recipe subtasks; `RENDER_CONCURRENCY=6` validated.
- **Persistent Chromium workers** — NDJSON protocol; eliminates 3–5s startup per frame.
- **Historical fetch** — retries + exponential backoff for OISST, Argo, OBIS.
- **Backfill flow** — `oceancanvas backfill --recipe --from --to [--fetch]`.
- **4,036 renders across 11 recipes** — OISST (6 recipes × 534 monthly), Argo (2 × 338), OBIS biologging (whale shark 50yr, leatherback 66yr, elephant seal 45yr).
- **GEBCO bathymetry** + Natural Earth coastline overlays on scatter renders.
- **Timeline scrubber, Observable Plot charts, Dashboard, Data Explorer** in the gallery.
- 222 tests (143 pipeline + 45 gallery + 34 e2e). Creative mapping cross-validation (Python ↔ TypeScript fixtures).

## [0.2.3] — 2026-04-29 — RFC Closures + CI Hardening

### Added
- E2E tests strengthened from smoke to real-data assertions.
- RFC-008 (parallelisation) and RFC-009 (CLI) decided.

## [0.2.2] — 2026-04-29 — Docs Redesign

### Changed
- Concept package, PRD/RFC/ADR system, CLAUDE.md conventions all stabilised. Cross-doc consistency rule established.

## [0.2.1] — 2026-04-29 — Gallery Redesign + UX Polish

### Changed
- Gallery navigation, Dashboard layout, design tokens — multiple polish passes.

## [0.2.0] — 2026-04-29 — Recipe Editor + Dashboard

### Added
- Recipe Editor surface with creative controls + YAML round-trip.
- Dashboard surface with source rail and per-source explorer.

## [0.1.0] — 2026-04-29 — Pipeline + Gallery

### Added
- Initial daily pipeline (six tasks: discover / fetch / process / build_payload / render / index).
- Static gallery surface reading `renders/manifest.json`.
- First locked stack: Prefect, dlt, xarray, p5.js, Puppeteer, deck.gl, MapLibre, Caddy, Docker Compose.
