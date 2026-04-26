# ADR-011: ffmpeg for Video Frame Assembly and Audio Muxing

- **Status**: Accepted
- **Related RFCs**: `docs/rfc/RFC-005-audio-system-technical-design.md` *(to be written)*
- **Related PRDs**: `docs/prd/PRD-008-video-editor.md`

## Context & Problem Statement

The video editor assembles accumulated daily PNG renders into a timelapse MP4. The export must also composite SVG overlay annotations over each frame and mux in a generative audio track. All of this must happen without re-rendering the original p5.js sketches.

## Decision

Use ffmpeg for frame assembly, overlay compositing, and audio muxing. The pipeline reads PNGs in date order, renders overlay SVGs through Puppeteer, and uses ffmpeg to combine everything into an MP4.

## Rationale

ffmpeg is the standard tool for this exact operation — frame-to-video conversion, filter graphs for overlay compositing, and audio muxing in a single command. It is available on all target platforms, well-documented, and produces H.264 MP4 output compatible with all playback contexts. No re-rendering required — the frames already exist as PNGs.

## Alternatives Considered

1. **OpenCV**
   - **Pros**: Python-native, good for programmatic video operations
   - **Cons**: More code for the same output as ffmpeg. Less flexible for the overlay compositing filter graph.
   - **Why Rejected**: ffmpeg is more capable and better documented for this specific use case.

2. **MoviePy**
   - **Why Rejected**: Python wrapper around ffmpeg with additional overhead and less filter flexibility.

## Consequences

**Positive:**
- No re-rendering — export time is ffmpeg I/O only (seconds for 365 frames)
- H.264 MP4 plays everywhere
- GIF export also available for animated previews

**Negative:**
- ffmpeg must be present in the pipeline container (adds ~80MB to image)

## Implementation Notes

ffmpeg in the `pipeline` Docker container. Export reads PNGs from `renders/{recipe}/`, overlays SVGs via Puppeteer pre-render, muxes audio from API response, outputs to `exports/{recipe}/{date_range}.mp4`.
