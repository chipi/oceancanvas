# PRD-008: Video Editor

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-005-audio-system-technical-design.md`, `docs/rfc/RFC-006-key-moment-detection-algorithm.md`
- **Related ADRs**: `docs/adr/ADR-011-ffmpeg-video-assembly.md`
- **Related UXS**: `docs/uxs/UXS-004-video-editor.md`
- **Source**: OC-02 Section 4 (Surface 4), OC-04 Timelapse Editor

## Summary

The video editor assembles a recipe's accumulated daily renders into a timelapse film. The creative decisions are already made in the recipe — how each frame looks is fully determined. The video editor is assembly and enrichment: which frames, what pace, what music (PRD-009), and what data overlays (PRD-010) layered over the visual. Export produces an MP4 via ffmpeg.

## Background & Context

The daily renders are already a film strip. Each recipe accumulates one PNG per day — 365 renders is a year of the ocean as art. The video editor is the tool that assembles those frames into a film. It is intentionally simple: the creative decisions are already made in the recipe. The editor is assembly, not creation.

## Goals

- Assemble accumulated daily renders into a timelapse MP4 without re-rendering
- Enable date range trimming to focus on specific periods
- Provide frame rate control (6/12/24fps)
- Export as MP4 (H.264) and GIF

## Non-Goals

- Re-rendering frames — the video editor reads existing PNGs only
- Colour grading, transitions, or effects on the visual frames
- Real-time preview playback at full resolution — preview plays at reduced quality

## User Stories

- *As a user, I can open the video editor from the gallery for any recipe with accumulated renders and see the film already assembled.*
- *As a user, I can trim the date range to focus on the period around a specific anomaly event.*
- *As a user, I can set the frame rate and see the estimated film duration update instantly.*
- *As a user, I can export the assembled film as an MP4 in seconds — the frames already exist.*

## Functional Requirements

### FR1: Frame sequence

- **FR1.1**: Recipe selector shows all recipes with accumulated renders and their available date range
- **FR1.2**: Date range sliders trim the frame selection — start and end
- **FR1.3**: Frame rate selector: 6fps · 12fps · 24fps (default: 12fps — 365 frames = 30 seconds)
- **FR1.4**: Duration estimate updates instantly: frames ÷ fps = output duration

### FR2: Preview

- **FR2.1**: Full-width preview canvas shows the current frame at its actual render quality
- **FR2.2**: Transport controls: skip 10 frames · play/pause · skip 10 frames
- **FR2.3**: Play animates through frames at the selected fps
- **FR2.4**: Timeline strip at the bottom shows all frames as thumbnails — click any to jump
- **FR2.5**: Scrub bar allows dragging to any position in the sequence

### FR3: Export

- **FR3.1**: "Export MP4" assembles frames via ffmpeg in date order at the selected fps
- **FR3.2**: Audio track is mixed in if configured (PRD-009)
- **FR3.3**: Overlay SVGs are composited if configured (PRD-010)
- **FR3.4**: Output: H.264 MP4, compatible with all playback contexts
- **FR3.5**: "Export GIF" produces an animated GIF for embedding without a video player
- **FR3.6**: Export time for 365 frames: under 30 seconds on development hardware (ffmpeg I/O only, no re-rendering)

### FR4: Gallery entry point

- **FR4.1**: Each render in the gallery has a "timelapse ↗" action
- **FR4.2**: This opens the video editor pre-loaded with that recipe and the full available date range selected

## Success Metrics

- Video editor loads with correct frames for any recipe from the gallery timelapse link
- Export of 365 frames at 12fps completes in under 30 seconds
- Exported MP4 plays correctly in browser, macOS, and mobile

## Dependencies

- PRD-001: Data ingestion pipeline (produces the renders the video editor reads)
- PRD-009: Audio enrichment (audio track mixed into the export)
- PRD-010: Overlay enrichment (overlays composited into the export)
- RFC-006: Key moment detection algorithm (shared with audio and overlays)

## Release Checklist

- [ ] Recipe selector showing all recipes with render counts
- [ ] Date range sliders trimming correctly
- [ ] Preview playing at correct fps
- [ ] Timeline strip showing all frames with correct thumbnails
- [ ] MP4 export completing correctly with ffmpeg
- [ ] GIF export working
- [ ] Gallery timelapse link opening editor pre-loaded
