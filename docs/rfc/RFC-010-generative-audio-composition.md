# RFC-010 — Generative Audio Composition

> **Status** · Draft v0.1 · May 2026
> **TA anchor** · §components/render-system · §contracts (audio scalars in payload)
> **Related** · PRD-005 Video Editor · ADR-026 Audio stem system · ADR-024 Key moment detection
> **Closes into** · ADR (pending — supersedes ADR-026 if accepted)
> **Why this is an RFC** · ADR-026 shipped a stem-switching system that loops a single audio file for long stretches. The result is ambient wallpaper, not data-driven composition. The audio doesn't follow the video — it sits beside it. This RFC proposes a multi-layer generative approach where the data performs the music, borrowing from electronic composition techniques. The architecture is genuinely open: multiple plausible layer designs, synthesis methods, and mapping strategies exist.

---

## The question

How do we make audio that follows the data the way the video does — where a viewer feels the music respond to what they see, not merely accompany it?

The current stem system (ADR-026) crossfades between 5 intensity levels based on a per-frame intensity signal. In practice, SST data changes slowly across 534 monthly frames. One stem loops for hundreds of frames. The audio is static, decorative, disconnected from the visual rhythm.

The question is not whether audio should react to data — that's decided (PRD-005 sharpest threat). The question is how: what layers of audio respond to what aspects of the data, at what timescales, using what synthesis techniques.

---

## Design principles

Borrowed from electronic composition and generative music:

1. **Multiple timescales.** A composition has layers operating at different speeds — a pad evolving over minutes, a rhythm cycling every few seconds, accents firing on events. One data signal driving one audio parameter produces monotony. Multiple mappings at multiple speeds produce composition.

2. **The data performs.** The data values are not metadata about the music — they are the music's performer. Temperature maps to pitch. Rate of change maps to rhythm. Records trigger accents. The mapping is direct, not decorative.

3. **Tension and release.** Rising data should build tension (denser texture, higher pitch, faster pulse). Records and peaks are release points (accent + brief silence or drop). Falling data should relax (sparser, lower, slower). This is the emotional grammar that makes a viewer feel the connection.

4. **Surprise from the data, not the system.** The audio system is deterministic. Same data = same composition. Surprises come from the data's own structure — an unexpected spike, a record-breaking month, a sudden reversal. The system reveals these; it doesn't create them.

---

## Proposed architecture: four-layer generative mixer

### Layer 1 — Drone (timescale: entire timeline)

A continuous tonal layer whose pitch and brightness follow the data value.

**Mapping:**
- Data value (e.g., SST mean) → oscillator frequency
- Range: 80 Hz (coldest) → 400 Hz (hottest)
- Filter cutoff follows value — cold = dark/muffled, hot = bright/open
- Slow portamento (glide between frequencies over ~500ms)

**Synthesis:** Web Audio `OscillatorNode` (sawtooth, filtered) or pre-rendered drone stems pitch-shifted via `playbackRate`.

**What the viewer hears:** A low hum that rises and falls with the temperature. Over 45 years, the drone drifts upward as the ocean warms. The warming trend becomes audible.

### Layer 2 — Pulse (timescale: frame-to-frame change)

A rhythmic element whose speed and intensity follow the rate of change between consecutive frames.

**Mapping:**
- `|value[i] - value[i-1]|` → pulse rate (BPM)
- Stable periods (small delta): slow pulse, quiet (60 BPM, volume 0.1)
- Volatile periods (large delta): fast pulse, loud (180 BPM, volume 0.7)
- Direction of change: rising = higher click pitch, falling = lower click pitch

**Synthesis:** Short percussive samples (click, tick, drop) triggered at computed intervals via `setTimeout` or scheduled `AudioBufferSourceNode`. Three samples: tick-up, tick-neutral, tick-down.

**What the viewer hears:** A gentle heartbeat that quickens during El Niño events and calms during stable decades. The pulse literally accelerates when the data gets volatile.

### Layer 3 — Accent (timescale: key moments only)

Short, distinctive sounds fired at key moments — record highs, record lows, inflection points.

**Mapping:**
- Record high: ascending chime (3 notes up)
- Record low: descending tone (3 notes down)
- Inflection point (trend reversal): single bell tone
- Each accent plays once per event, not sustained

**Synthesis:** Pre-rendered samples (~1-2 seconds each). Three audio files:
- `accent_record_high.mp3`
- `accent_record_low.mp3`
- `accent_inflection.mp3`

**What the viewer hears:** Sparse, memorable moments — a chime rings when 2023 sets the all-time SST record. The viewer feels "something just happened" before they consciously read the data.

### Layer 4 — Texture (timescale: seasonal/cyclical)

An ambient layer that responds to the seasonal cycle and absolute position in the timeline.

**Mapping:**
- Month of year → texture type (winter = sparse/crystalline, summer = full/warm)
- Position in timeline (0% → 100%) → overall density buildup
- The texture grows denser as the timeline progresses, reflecting accumulation

**Synthesis:** Filtered noise with seasonal modulation. Brown noise for winter (low-pass at 200 Hz), pink noise for summer (low-pass at 800 Hz). Volume envelope follows a sine wave at 12-frame period (annual cycle).

**What the viewer hears:** An oceanic breathing rhythm — sparse and cold in winter months, fuller in summer — that gradually intensifies over the decades.

---

## Implementation approach

### Browser-side (preview playback)

All four layers synthesised in real-time using Web Audio API:

```
AudioContext
├── Layer 1: OscillatorNode → BiquadFilterNode → GainNode → destination
├── Layer 2: AudioBufferSourceNode (scheduled) → GainNode → destination
├── Layer 3: AudioBufferSourceNode (triggered) → GainNode → destination
└── Layer 4: AudioBufferSourceNode (noise loop) → BiquadFilterNode → GainNode → destination
```

Master gain node for overall volume control. Each layer has its own gain for independent mixing.

**Pre-rendered assets needed:**
- 3 pulse samples: tick-up.mp3, tick-neutral.mp3, tick-down.mp3 (~0.1s each)
- 3 accent samples: record-high.mp3, record-low.mp3, inflection.mp3 (~1.5s each)
- 1 noise loop: texture-base.mp3 (~10s, looped)

Total: ~500KB of audio assets.

### Server-side (export)

For MP4 export, the four layers are rendered to separate WAV tracks via ffmpeg synthesis, then mixed:

1. Drone: `ffmpeg -f lavfi -i "sine=f={freq}:d={duration}"` with frequency automation
2. Pulse: Concatenated tick samples at computed intervals
3. Accent: Samples placed at event frame times
4. Texture: Filtered noise with seasonal envelope

Mixed via `amix` filter into single AAC track in MP4.

### Data contract

The generative mixer reads:
- `values[]`: per-frame data values (from time-series JSON)
- `dates[]`: per-frame dates (for seasonal extraction)
- `events[]`: key moment events (from `detectMoments()`)
- `fps`: playback rate (determines real-time mapping)

All available in the Video Editor component already.

---

## Recipe as audio recipe

The recipe YAML already defines visual character (colormap, opacity, creative state). It should equally define audio character. The creative-to-technical mapping (ADR-018, ADR-021) extends naturally to audio:

### Creative state → audio parameters

| Creative control | Visual effect | Audio effect |
|---|---|---|
| **colour_character** (0=arctic, 1=otherworldly) | Palette selection | Drone waveform: 0=sine (pure), 0.5=triangle, 1=sawtooth (rich harmonics) |
| **temporal_weight** (0=moment, 1=epoch) | Tail length, contrast | Drone portamento: 0=instant pitch changes, 1=very slow glide |
| **energy_x** (0=calm, 1=turbulent) | Speed, smooth/rough | Pulse sensitivity: 0=very subtle pulse, 1=aggressive rhythmic response |
| **energy_y** (0=ghost, 1=solid) | Opacity, presence | Overall audio volume/density: 0=barely audible, 1=full presence |
| **mood preset** | Combined visual state | Combined audio character (see below) |

### Mood → audio character

| Mood | Drone | Pulse | Accent | Texture |
|---|---|---|---|---|
| **Becalmed** | Sine, slow glide, quiet | Very subtle, slow | Soft chimes | Sparse, crystalline |
| **Deep current** | Triangle, medium glide | Moderate, steady | Bell tones | Warm, flowing |
| **Storm surge** | Sawtooth, fast changes | Aggressive, loud | Sharp accents | Dense, turbulent |
| **Surface shimmer** | Triangle, medium | Light, dancing | Bright pings | Airy, shimmering |
| **Arctic still** | Sine, very slow | Near-silent | Deep, resonant | Icy, minimal |

### Recipe YAML extension

```yaml
# ⊓ creative controls ⊓
render:
  type: field
  colormap: thermal
  opacity: 0.8

audio:
  drone_waveform: triangle    # from colour_character
  drone_glide: 0.7            # from temporal_weight
  pulse_sensitivity: 0.3      # from energy_x
  presence: 0.6               # from energy_y
  accent_style: chime          # chime | bell | ping | drop
  texture_density: 0.4        # seasonal texture amount
```

The Recipe Editor's creative controls would generate both `render:` and `audio:` blocks from the same mood/slider state. The YAML round-trip (ADR-021) extends to include audio parameters.

---

## Alternatives considered

**Keep stem crossfading (ADR-026).** Simpler, already working. Rejected because it doesn't follow the data — stems loop statically for long periods. The audio is ambient decoration, not composition.

**Full MIDI synthesis.** Map data to MIDI events, render via SoundFont or synth engine. Rejected as overkill for v1 — requires a full synthesis engine, large sample libraries, and complex scheduling. The four-layer approach achieves similar expressiveness with minimal assets.

**Commercial generative music API (Mubert, Beatoven).** Generate per-export tracks via API call. Rejected for Phase 1 — adds API dependency, cost, and non-determinism. Revisit as Phase 2 enhancement for users who want more polished output.

**Single oscillator mapped to data.** The simplest possible approach — one tone that follows the data value. Rejected because it produces a whine, not music. Multiple layers at different timescales are what make it feel composed.

---

## Trade-offs

**Complexity.** Four layers with independent scheduling is more complex than stem switching. Mitigation: each layer is independent and can be developed/tested separately.

**Determinism.** Web Audio scheduling is inherently non-deterministic (timing depends on system load). Mitigation: for export, use ffmpeg offline rendering which is deterministic. Browser preview is "close enough" — same composition, slightly different timing.

**Asset size.** ~500KB of audio samples. Acceptable — smaller than the current stem system (3.5MB for 3 themes × 5 stems).

**Browser compatibility.** Web Audio API is supported in all modern browsers. OscillatorNode, BiquadFilterNode, and AudioBufferSourceNode are baseline features.

---

## Open questions

1. **Drone synthesis: oscillator vs. pitch-shifted sample?** Oscillator is smaller and more flexible but sounds synthetic. A pitch-shifted recording of a real instrument (bowed bass, organ drone) sounds richer but requires larger assets. Start with oscillator, upgrade if it sounds too digital.

2. **Pulse sample design.** What do the tick samples sound like? Water drops? Sonar pings? Synthesised clicks? This is an artistic choice that sets the emotional register. Propose: start with simple filtered clicks, iterate based on listening.

3. **Layer mixing ratios.** Default volumes for each layer? Propose: Drone 0.4, Pulse 0.3, Accent 0.5 (louder but sparse), Texture 0.2. User-adjustable per-layer volume in the UI.

4. **Seasonal texture vs. data-driven texture.** Layer 4 uses month-of-year for seasonal variation. Alternative: use the data's own variance (rolling standard deviation) instead. The seasonal approach is more predictable; the variance approach is more data-driven.

5. **Export determinism.** Can ffmpeg produce byte-identical audio from the same inputs? Need to verify with a determinism test. If not, accept "perceptually identical" for audio (visual renders are already byte-identical).

---

## How this closes

**ADR-027 — Generative audio composition.** Locks the four-layer architecture, Web Audio implementation for preview, ffmpeg rendering for export. Supersedes ADR-026 (stem switching) for the generative portion; ADR-026 remains as the fallback for offline/simple exports.

---

## Links

- PRD-005 — Video Editor (sharpest threat: audio reads as decorative)
- ADR-024 — Key moment detection (provides events for Layer 3)
- ADR-026 — Audio stem system (current implementation, to be superseded)
- RFC-007 — Key moment detection (per-frame intensity signal)
- Web Audio API specification — OscillatorNode, BiquadFilterNode
