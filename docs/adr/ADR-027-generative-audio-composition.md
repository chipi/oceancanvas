# ADR-027 — Generative audio composition

> **Status** · Accepted
> **Date** · 2026-05-03
> **TA anchor** · §components/render-system · §contracts/recipe-yaml
> **Related RFC** · RFC-010 (closes)
> **Supersedes** · ADR-026

## Context

ADR-026 shipped stem-based crossfading: each theme provided five pre-rendered MP3s; a per-frame intensity scalar from ADR-024 selected which stem played. In practice, SST data changes slowly across 534 monthly frames — one stem looped for hundreds of frames. The audio sat beside the video instead of following it. RFC-010 named the problem and proposed a multi-layer generative composition where the data values directly perform the music.

## Decision

Four-layer generative audio engine, deterministic, with synthesis on both ends:

1. **Drone** (timeline-scale): oscillator (sine / triangle / sawtooth, picked by `colour_character`) with pitch and lowpass cutoff driven by the per-frame data value, glide controlled by `temporal_weight`.
2. **Pulse** (frame-to-frame): scheduled tap whose BPM follows |Δ value| and `pulse_sensitivity`. Three pre-rendered click samples (up / neutral / down, ~0.1s each) selected by direction of change.
3. **Accent** (event): one-shot sample fired on key moments from `moments.py`. Three pre-rendered samples (record-high chime, record-low tone, inflection bell, ~1.5s each), selected by `accent_style` × event type.
4. **Texture** (seasonal/cyclical): looped brown-noise sample with envelope from month-of-year × timeline position × `texture_density`.

**Browser preview** uses the Web Audio API: `OscillatorNode` for drone, scheduled `AudioBufferSourceNode` taps for pulse, one-shot `AudioBufferSourceNode` for accent, looping `AudioBufferSourceNode` + `BiquadFilterNode` for texture. All four layers share a master `GainNode`.

**Pipeline export** uses pure-Python synthesis (`numpy` + stdlib `wave`) producing a deterministic stereo WAV; ffmpeg only decodes the pre-rendered MP3 samples and encodes the final mix as AAC inside the MP4. The synthesis math mirrors the browser engine so preview and export sound the same.

**Recipes author audio character** via the `audio:` block beneath the creative-controls marker. Six fields (`drone_waveform`, `drone_glide`, `pulse_sensitivity`, `presence`, `accent_style`, `texture_density`) are derived mechanically from the same creative axes that produce the visual params, per RFC-010 §"Creative state → audio parameters".

## Rationale

**The data performs.** Drone pitch literally rises with SST. Pulse accelerates during volatility. Records ring a chime. Texture breathes seasonally. A viewer feels the music respond to what they see, which was the sharpest threat in PRD-005.

**Self-hostable, no API.** All synthesis runs locally — Web Audio in the browser, numpy in the pipeline. No Mubert/Beatoven dependency; no licensing surface; no key management.

**Byte-budget.** Seven small MP3 samples (~210 KB total) replace the previous 3.5 MB of stem files. Drone is fully synthesised — no asset.

**Determinism, with one concession.** Visual renders remain byte-identical (preserves the §constraints rule). Audio synthesis is deterministic at the WAV level — same recipe + same data = byte-identical synth WAV (proven by `pipeline/tests/unit/test_audio.py::test_same_inputs_same_output`). However, AAC encoding through ffmpeg may produce non-byte-identical MP4 audio across ffmpeg versions, so the export-level guarantee is "perceptually identical" rather than byte-identical.

**Recipe parity.** The same `creative_to_audio` mapping runs in both TS (gallery) and Python (pipeline). Cross-validation tests assert identical outputs (`test_creative_mapping.py::TestCreativeToAudio::test_matches_typescript_output`).

## Implementation notes

- Browser engine: `gallery/src/lib/audioEngine.ts`, `audioPresets.ts`, hook `useGenerativeAudio.ts`
- Pipeline engine: `pipeline/src/oceancanvas/audio.py` (synthesis), `creative_mapping.py::creative_to_audio` (mapping)
- Sample assets: `audio/generative/{pulse_tick_*,accent_*,texture_noise}.mp3`
- Build script: `scripts/build-audio-assets.sh` (regenerates samples deterministically via ffmpeg lavfi)
- Recipe migration: `scripts/migrate-recipes-audio.mjs` (idempotent; back-fills `audio:` blocks from existing recipe creative state)
- Eight named presets (`audioPresets.ts`): three carry-overs from ADR-026 (`ocean`, `dramatic`, `deep`) ported to generative configs, plus the five RFC-010 moods (`becalmed`, `deep-current`, `storm-surge`, `surface-shimmer`, `arctic-still`)
- Video Editor picker offers `From recipe` (default) plus the eight named presets and Silent
- ADR-026 stems and the `useAudioPlayback` hook are removed when this ADR ships

## Open follow-ups

- **Drone timbre.** Oscillator-based drone may read as synthetic. RFC-010 §"Open questions" anticipated this. If reviewer feedback finds it cold, swap drone to pitch-shifted sample of a real bowed instrument (one extra ~50 KB asset). Not blocking.
- **Browser-export parity for preset overrides.** When the user picks an override preset (e.g. `storm-surge`) in the Video Editor, that override does not flow to the export — export reads the recipe's authored `audio:` block. Fine for v1; revisit if authors complain.
- **Audio attribution.** Synthesised drone + filtered noise + ffmpeg-lavfi samples are entirely procedural with no third-party audio. `audio/ATTRIBUTION.md` updated to reflect "synthesised with ffmpeg lavfi; no external audio sources" once stems are removed.
