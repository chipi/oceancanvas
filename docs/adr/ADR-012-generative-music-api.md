# ADR-012: Generative Music API for Audio Generation

- **Status**: Accepted
- **Related RFCs**: `docs/rfc/RFC-005-audio-system-technical-design.md` *(to be written — API selection and integration design)*
- **Related PRDs**: `docs/prd/PRD-009-audio-enrichment.md`

## Context & Problem Statement

The video editor generates a music track that evolves with the ocean data scalar time series — swelling at anomaly peaks, intensifying at record-breaking frames. Audio is generated at export time only (not stored as daily pipeline output). The system must produce professional-quality music from theme and mood parameters without requiring audio engineering expertise from the user.

## Decision

Use a generative music API (Mubert or Beatoven.ai — final selection deferred to RFC-005) for audio generation. The API generates stems at multiple intensity levels. Python crossfades between stems as the data scalar changes across frames.

## Rationale

Generative music APIs produce high-quality, licensed music from theme and mood parameters. The user sets theme (Ocean, Ambient, Dramatic, etc.) and energy arc; the API handles instrumentation, production, and licensing. Stem-based mixing allows the audio to evolve with data without requiring a new API call per frame.

## Alternatives Considered

1. **Raw Python audio synthesis (scipy + soundfile)**
   - **Pros**: No external dependency, full control
   - **Cons**: Produces robotic-sounding tones, not music. Significant audio engineering work to produce anything listenable.
   - **Why Rejected**: The quality gap between synthesised tones and API-generated music is too large for a product whose visual quality is high.

2. **Pre-licensed stem library (local)**
   - **Pros**: No API dependency, works offline
   - **Cons**: Licensing complexity for distribution. Limited palette without ongoing curation.
   - **Why Rejected**: API approach is simpler and produces better variety.

## Consequences

**Positive:**
- Professional-quality music without audio engineering
- Licensed for use in exports
- Theme vocabulary maps directly to OceanCanvas's editorial voice

**Negative:**
- External API dependency at export time
- API cost per export (acceptable — exports are rare user actions)
- Requires internet connection to export video with audio

**Neutral:**
- Final API selection (Mubert vs Beatoven) deferred to RFC-005

## Implementation Notes

Audio generation in `pipeline/audio.py`. Called at export time from the video editor. Stem files cached locally after first generation for a given theme/duration combination.
