# PRD-009: Audio Enrichment

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-005-audio-system-technical-design.md`, `docs/rfc/RFC-006-key-moment-detection-algorithm.md`
- **Related ADRs**: `docs/adr/ADR-011-ffmpeg-video-assembly.md`, `docs/adr/ADR-012-generative-music-api.md`
- **Source**: OC-02 Section 4 (Video editor — Track 2), design session audio decisions

## Summary

Audio enrichment adds a generative music track to the exported timelapse film. Audio exists only in the video editor at export time — it is not stored alongside daily renders. The user configures the musical character (theme, energy arc, sensitivity, key moment intensity); the system generates a track via a generative music API (Mubert or Beatoven) that evolves with the ocean data scalar time series. Audio and overlays (PRD-010) share the same key moment detection algorithm.

## Background & Context

The musical track is not background music — it genuinely reacts to the ocean data. When SST anomaly peaks, the music swells. When a record is broken, the music hits. The key moment detection algorithm finds statistically significant frames in the data time series; both audio and overlays respond to the same moments.

## Goals

- Generate a music track that evolves with the ocean data scalar through the timelapse
- Provide editorial controls (not audio engineering knobs) for the user to shape the character
- Sync musical peaks to the same key moments as data overlay annotations
- Generate audio at export time via API — not stored as daily pipeline output

## Non-Goals

- Audio generation during the daily pipeline run — export time only
- Custom audio upload or manual audio tracks
- Audio in the gallery or recipe editor — video editor only

## User Stories

- *As a user, I can select "Ocean" as the theme and hear the exported film score that feels like open water.*
- *As a user, I can set the energy arc to "builds throughout" and hear the music gradually intensify as anomalies grow.*
- *As a user, I can see the detected key moments marked on the timeline and confirm the music will swell at those frames before exporting.*

## Functional Requirements

### FR1: Theme selection

- **FR1.1**: Theme selector: Ambient · Ghost · Sea · Ocean · Dramatic · Ethereal · Minimal · Electronic
- **FR1.2**: Each theme is a distinct musical identity with its own instrumentation and atmosphere

### FR2: Editorial controls

- **FR2.1**: Energy arc: builds throughout / peaks in middle / meditative throughout / follows data directly
- **FR2.2**: Sensitivity: subtle → reactive (how much the music responds to data changes)
- **FR2.3**: Key moment intensity: whisper → swell → drop (how large the musical response is at detected key moments)

### FR3: Key moment detection

- **FR3.1**: The shared key moment detection algorithm (RFC-006) finds: statistical peaks (>2 SD), record highs, threshold crossings, inflection points
- **FR3.2**: Detected moments are displayed on the video editor timeline as dots
- **FR3.3**: Audio swells at the same frame numbers as overlay annotations (PRD-010)

### FR4: API generation and stem mixing

- **FR4.1**: At export time, call the generative music API with the configured theme and duration
- **FR4.2**: API returns stems at multiple intensity levels (calm, building, peak)
- **FR4.3**: Python crossfades between stems as the data scalar changes across frames
- **FR4.4**: The final audio track is passed to ffmpeg for muxing into the MP4

### FR5: Audio in the export

- **FR5.1**: Audio is an optional enrichment — the user can export without audio
- **FR5.2**: Audio is mixed into the MP4 by ffmpeg at export time
- **FR5.3**: Audio track duration matches the video duration exactly

## Success Metrics

- Audio track audibly responds to data changes across the timelapse
- Musical peaks occur at the same frames as overlay key moment markers
- Export with audio completes within 60 seconds for a 365-frame film

## Dependencies

- PRD-008: Video editor (audio is configured and exported within the video editor)
- RFC-005: Audio system technical design (API selection, stem mixing approach)
- RFC-006: Key moment detection algorithm

## Release Checklist

- [ ] RFC-005 completed and API selected (Mubert or Beatoven)
- [ ] Theme selection producing noticeably different musical characters
- [ ] Energy arc controls audibly shaping the track
- [ ] Key moments detected and marked on timeline
- [ ] Audio swelling at detected key moments
- [ ] Audio muxed correctly into MP4 export
