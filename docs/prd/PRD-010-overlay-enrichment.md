# PRD-010: Overlay Enrichment

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-006-key-moment-detection-algorithm.md`
- **Related ADRs**: `docs/adr/ADR-008-p5js-puppeteer-rendering.md`, `docs/adr/ADR-011-ffmpeg-video-assembly.md`
- **Related UXS**: `docs/uxs/UXS-004-video-editor.md`
- **Source**: OC-02 Section 4 (Video editor — Track 3), design session overlay taxonomy

## Summary

Overlay enrichment adds data annotations composited over the visual frames in the exported timelapse. Overlays are SVG elements rendered by Puppeteer, updating each frame from the processed data time series, composited by ffmpeg. Overlays and audio (PRD-009) share the same key moment detection algorithm — when a record is broken, the annotation appears and the music swells at the same frame.

## Background & Context

The overlays transform the timelapse from a beautiful animation into an editorial film with a point of view. A "+1.8° above baseline" counter updating each frame, a record flash at the peak, a timeline ribbon tracking progress — these elements give the viewer context without replacing the art. The overlay system is designed with editorial taste: minimal, purposeful, data-driven.

## Goals

- Composite data annotations over the visual frames at export time
- Provide a curated set of overlay types covering counters, event markers, trend indicators, timeline, and editorial elements
- Sync overlay events to the same key moments as the audio track
- Default to an essential set that provides context without overwhelming the visual

## Non-Goals

- Custom overlay design or free-form text placement
- Overlays in the daily pipeline renders — export time only
- Real-time overlay preview in the video player (preview shows overlay positions but not per-frame updates)

## User Stories

- *As a user, I can see the SST value updating each frame as a counter floating in the corner of the film.*
- *As a user, I can see "NEW RECORD" flash on screen at exactly the frame where a record is broken, synced to the audio peak.*
- *As a user, I can toggle individual overlays on or off and see which are enabled before exporting.*

## Functional Requirements

### FR1: Essential overlays (on by default)

- **FR1.1**: Primary variable counter — the main data value updating each frame (e.g. SST: 14.2° → 15.1°), editorial scale, source palette colour
- **FR1.2**: Anomaly indicator — deviation from climatology baseline, grows visually as anomaly intensifies, coral when positive/teal when negative
- **FR1.3**: Named event labels — text annotations at detected or user-named events, appear for a few seconds then fade
- **FR1.4**: Record flash — bold visual marker when a frame exceeds all previous values, synced to audio peak
- **FR1.5**: Moving sparkline — tiny chart showing the last 30 frames as a moving window
- **FR1.6**: Timeline ribbon — thin strip at the bottom showing progress through the date range, event dots at key moments
- **FR1.7**: Date stamp — current frame's date at editorial scale ("14 Mar 2026"), updates each frame
- **FR1.8**: Source attribution — minimal footer ("NOAA OISST · North Atlantic · OceanCanvas"), on by default

### FR2: Optional overlays (off by default)

- **FR2.1**: Pull quote — contextual sentence generated at record frames ("The North Atlantic has never been warmer than this")
- **FR2.2**: Cumulative stat — running total accumulating across frames ("+20.4cm total sea level rise since 1993")
- **FR2.3**: Projection ghost — near the end of the timelapse, a faded continuation showing what the trend implies
- **FR2.4**: Comparative split — final frame showing first render next to latest, the visual difference across the full time range
- **FR2.5**: Rate of change — how fast the variable is changing at the current frame
- **FR2.6**: Year-over-year delta — today vs same day last year

### FR3: Key moment sync

- **FR3.1**: All overlays read from the same key moment detection output as the audio track (RFC-006)
- **FR3.2**: The video editor timeline shows overlay event markers below the frame strip, aligned to the same frame numbers as audio intensity markers
- **FR3.3**: The user can see the sync before exporting

### FR4: Rendering and compositing

- **FR4.1**: Overlays are rendered as SVG elements by Puppeteer, one render per frame for updating elements
- **FR4.2**: Static overlays (source attribution, date stamp) are rendered once and applied to all frames
- **FR4.3**: ffmpeg composites the overlay SVGs over the visual PNGs at export time
- **FR4.4**: All overlays styled consistently with the editorial design system (ADR-015) — dark canvas, source palette colours, numbers at display scale

### FR5: Toggle UI

- **FR5.1**: Toggle list in the video editor right panel — each overlay has a checkbox and a description
- **FR5.2**: Essential overlays checked by default, optional overlays unchecked
- **FR5.3**: "Which variable" selector for data-driven overlays — defaults to the recipe's primary source

## Success Metrics

- Essential overlays visible and correctly updating across a test 30-frame export
- Record flash appearing at the correct frame in a dataset with a known record
- Audio and overlay events aligned at the same frame numbers

## Dependencies

- PRD-008: Video editor (overlays configured and exported within the video editor)
- PRD-009: Audio enrichment (shares key moment detection)
- RFC-006: Key moment detection algorithm

## Release Checklist

- [ ] All 8 essential overlays rendering correctly
- [ ] Toggle UI showing correct default states
- [ ] Key moment markers appearing on timeline
- [ ] Record flash synced to audio peak at correct frame
- [ ] Overlay compositing via ffmpeg producing correct MP4
- [ ] Source attribution and date stamp correct for all frame dates
