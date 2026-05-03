# ADR-026 — Audio stem system

> **Status** · Superseded by [ADR-027](ADR-027-generative-audio-composition.md)
> **Date** · 2026-05-03
> **TA anchor** · §components/render-system
> **Related RFC** · RFC-006 (closes)

## Context

The Video Editor exports timelapse MP4s. Silent exports lack emotional impact. RFC-006 explored stem-based crossfading, commercial APIs, and procedural generation.

## Decision

Stem-based crossfading with local pre-authored stems. Each audio theme provides 5 WAV stems at increasing intensity (calm → breathing → present → swelling → apex). The per-frame intensity signal from ADR-024 (key moment detection) selects which stem plays at each moment. ffmpeg concatenates 1-second stem segments into a single audio track mixed into the MP4.

Phase 1 ships with procedurally generated stems (ffmpeg pink noise + sine synthesis). No commercial API dependency. Future themes may source stems from Freesound.org (CC0/CC-BY).

## Rationale

Local stems ensure self-hostability and offline operation. Procedural generation avoids licensing complexity for v1. The intensity-to-stem mapping is simple (5 buckets) and deterministic. Commercial APIs (Mubert, Beatoven) deferred — add as optional enhancement when licensing terms are evaluated.

## Implementation notes

- Stems: `audio/themes/ocean/stem_{0-4}_{name}.wav`
- Audio builder: `pipeline/src/oceancanvas/video.py` `_build_audio_track()`
- Attribution: `audio/ATTRIBUTION.md`
- Key moments: `pipeline/src/oceancanvas/moments.py` (ADR-024)
