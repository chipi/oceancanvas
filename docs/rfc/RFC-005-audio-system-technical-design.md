# RFC-005: Audio System Technical Design

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-009-audio-enrichment.md`
- **Related ADRs**: `docs/adr/ADR-011-ffmpeg-video-assembly.md`, `docs/adr/ADR-012-generative-music-api.md`

## Abstract

This RFC designs the audio generation system for the video editor's audio enrichment track. Audio is generated at export time via a generative music API (Mubert or Beatoven.ai), using stem-based mixing to evolve the music with the ocean data scalar time series. The result is muxed into the MP4 export via ffmpeg.

**Architecture Alignment:** Audio is export-time only (ADR-012). The generative music API handles instrumentation and licensing. ffmpeg handles muxing (ADR-011).

## Problem Statement

The audio system must produce professional-quality music that genuinely reacts to data — not background music that plays regardless of what the ocean is doing. The music should swell when anomalies peak, intensify as records approach, and calm during stable periods. It must do this through editorial controls (theme, energy arc) rather than audio engineering parameters.

## Design & Implementation

### 1. API evaluation — Mubert vs Beatoven.ai

| Criterion | Mubert | Beatoven.ai |
|---|---|---|
| API type | REST — generate by mood/duration | REST — generate by mood/duration |
| Stem support | Yes — generates at multiple intensities | Limited |
| Theme vocabulary | Broad — 200+ tags | Curated moods |
| Licensing | Royalty-free for commercial use | Royalty-free |
| Latency | ~5–15s per generation | ~10–30s per generation |
| Free tier | Limited | Limited |

**Recommendation**: Mubert for Phase 1 — broader stem support, lower latency, better API documentation. Beatoven.ai as fallback if Mubert API changes pricing.

### 2. Stem generation strategy

Rather than generating one continuous track, generate three stems per theme:
- **calm stem** — for periods where data is stable (z-score < 1)
- **building stem** — for periods where anomaly is growing (1 ≤ z-score < 2)
- **peak stem** — for statistical peaks and records (z-score ≥ 2)

```python
def generate_stems(theme: str, duration_seconds: int, api_key: str) -> dict:
    stems = {}
    for intensity in ['calm', 'building', 'peak']:
        stems[intensity] = mubert_generate(
            tags=THEME_TO_TAGS[theme][intensity],
            duration=duration_seconds,
            api_key=api_key
        )
    return stems  # dict of WAV file paths
```

### 3. Scalar-to-intensity mapping

```python
def get_intensity_at_frame(scalar_values: np.ndarray, frame_idx: int) -> float:
    """Returns 0.0 (calm) to 1.0 (peak) intensity for a given frame."""
    mean = np.mean(scalar_values)
    std = np.std(scalar_values)
    z = (scalar_values[frame_idx] - mean) / std if std > 0 else 0
    return min(1.0, max(0.0, z / 3.0))  # normalise z-score to 0–1
```

### 4. Stem crossfading

```python
def mix_stems(stems: dict, intensities: list[float], fps: int) -> str:
    """Crossfades between calm/building/peak stems based on per-frame intensities."""
    calm = AudioSegment.from_wav(stems['calm'])
    building = AudioSegment.from_wav(stems['building'])
    peak = AudioSegment.from_wav(stems['peak'])
    
    output = AudioSegment.silent(duration=len(intensities) * (1000 // fps))
    
    for i, intensity in enumerate(intensities):
        ms = i * (1000 // fps)
        if intensity < 0.33:
            segment = calm[ms:ms + (1000 // fps)]
        elif intensity < 0.66:
            segment = building[ms:ms + (1000 // fps)]
        else:
            segment = peak[ms:ms + (1000 // fps)]
        output = output.overlay(segment, position=ms)
    
    output_path = f"/tmp/audio_{uuid4()}.wav"
    output.export(output_path, format="wav")
    return output_path
```

### 5. ffmpeg muxing

```bash
ffmpeg -i renders.mp4 -i audio.wav -c:v copy -c:a aac -shortest output.mp4
```

### 6. Caching

Generated stems are cached by `(theme, duration_seconds)`. A 30-second Ocean theme stem is generated once and reused for all exports with that theme and duration. Cache stored in `data/audio_cache/`.

## Key Decisions

1. **Mubert as primary API**
   - **Decision**: Use Mubert for Phase 1
   - **Rationale**: Best stem support, lowest latency, broadest theme vocabulary

2. **Three stems per theme rather than per-frame generation**
   - **Decision**: Generate calm/building/peak stems and crossfade
   - **Rationale**: Generating one stem per frame (365 API calls for a year of data) is too slow and expensive. Three stems + crossfading produces a continuously evolving track with two API calls.

## Alternatives Considered

1. **Per-frame API generation**
   - **Why Rejected**: 365 API calls for a 1-year timelapse. Too slow and too expensive.

2. **Raw Python synthesis (scipy)**
   - **Why Rejected**: Produces robotic-sounding tones. ADR-012 decided against this.

## Open Questions

1. What is the API rate limit for Mubert? Does it support concurrent requests for generating calm/building/peak stems simultaneously?
2. Should the audio system support offline/API-free operation with a bundled stem library?

## References

- ADR-012: Generative music API for audio generation
- PRD-009: Audio enrichment
