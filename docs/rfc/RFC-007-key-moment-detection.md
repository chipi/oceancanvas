# RFC-007 — Key moment detection

> **Status** · Draft v0.1 · April 2026
> **TA anchor** · §components/render-system · §contracts (audio scalars in payload)
> **Related** · PRD-005 Video Editor · RFC-006 Audio system
> **Closes into** · ADR (pending)
> **Why this is an RFC** · Audio swells and overlay markers must fire at the same frames — when the music swells, the record-flash appears, the anomaly bar peaks. PRD-005's sharpest threat (audio reads as decorative) is defeated specifically when the visual and audio events are demonstrably synchronised. They share a single per-frame intensity signal. The algorithm that produces that signal is open: multiple plausible approaches, each detecting different kinds of "moment."

---

## The question

Given a data scalar time series — say, daily SST anomaly for the North Atlantic over a year — produce a per-frame intensity signal that captures *moments worth marking*. The signal is consumed by:

- **Audio** (RFC-006): the per-frame intensity drives crossfading between musical stems.
- **Overlays**: the intensity threshold determines when a record-flash, anomaly-grow, or named-event annotation appears.

What constitutes "a moment worth marking"? Several plausible signals exist:

1. **Statistical peaks** — values exceeding the mean by more than 2 standard deviations.
2. **Record values** — values exceeding all prior values in the time series.
3. **Threshold crossings** — values crossing a user-defined or scientifically-meaningful boundary (e.g., bleaching threshold for SST).
4. **Inflection points** — moments where the rate of change reverses or accelerates significantly.

Each captures a different kind of moment. A complete system uses all four, combined into one intensity signal. The deliberation is the combination — how to weight, scale, and merge them into a single 0.0–1.0 value per frame.

## Use cases

1. **Year of SST anomaly.** Statistical peaks fire mid-summer (above-mean warming days). Records fire in late August (warmest day ever). Threshold crossings fire on the days exceeding the 1.5°C warming line. Inflection points fire at the start and end of heat-wave periods.
2. **Decadal sea-level rise.** Records fire constantly in recent years (every month is a new high). Statistical peaks barely fire (the trend dominates the noise). Threshold crossings on integer-cm marks. Inflection points on acceleration changes.
3. **Year of sea-ice extent.** Records fire at the September minimum. Statistical peaks rarely fire (seasonal signal dominates). Threshold crossings at scientifically-meaningful extents. Inflection points at freeze-up and break-up dates.
4. **A calm time series.** No records, few peaks, no significant inflections. Intensity stays low; audio remains calm; overlays don't intrude.

The four use cases want different relative weights on the four signals. A unified algorithm with sensible defaults plus per-recipe tuning is the goal.

## Goals

- One algorithm, one signal, both audio and overlays consume the same value for the same frame.
- The signal is deterministic — same time series produces the same per-frame intensities.
- The signal is calm-by-default — without significant events, intensity stays low.
- The signal scales gracefully across different data ranges (SST anomaly vs. sea-level vs. ice extent).
- The four signal types are inspectable individually (the editor can show which kind of moment was detected, for debugging and overlay labelling).

## Constraints

- *Determinism* — same time series + same parameters → same intensity signal (TA §constraints).
- *Single source of truth for moments* — audio and overlays compute from the same algorithm output. No separate moment-detection paths (TA §constraints).
- *No machine learning models in v1* — the algorithm must be classical (statistical, threshold-based). Trainable models are deferred.

## Proposed approach

**Four detectors, each producing an intensity contribution; a weighted sum, clamped to 0.0–1.0.**

For each frame *f* in a time series of values `v[0..N]`:

```
peaks_score(f)        = abs(v[f] - mean) / (k * stddev)        # k=2 for the 2σ convention
records_score(f)      = 1.0 if v[f] >= max(v[0..f-1]) else 0.0
threshold_score(f)    = 1.0 if v[f] crosses a defined threshold this frame else 0.0
inflection_score(f)   = abs(d²v/dt² at f) normalised to [0, 1]

intensity(f) = clamp(
  w_peaks      * peaks_score(f)      +
  w_records    * records_score(f)    +
  w_threshold  * threshold_score(f)  +
  w_inflection * inflection_score(f),
  0.0, 1.0
)
```

The weights `w_*` are configurable per recipe (or per export), with sensible defaults:

```yaml
# default key_moment weights
weights:
  peaks: 0.4
  records: 0.3
  threshold: 0.2
  inflection: 0.1
```

Records get higher weight than inflections because record events are the most viscerally meaningful in climate-communicator use cases.

The intensity signal is *temporally smoothed* with a small window (e.g., 3-frame Gaussian) before being consumed, so that a single anomalous frame produces a brief audio swell rather than a one-frame click.

Each detector also produces a *labelled event* when its score crosses a high threshold (>0.7). The overlay system uses the labels to choose annotation type:

- High peaks_score → "anomaly indicator grows"
- High records_score → "record flash" + label "highest [variable] ever measured"
- High threshold_score → "named event marker"
- High inflection_score → "trend change" subtle marker

Same signal drives audio crossfading; the labels drive overlay choice.

## Alternatives considered

### Alternative: just use anomaly directly

Define `intensity(f) = abs(anomaly(f))` normalised to [0, 1]. Skip the four-detector composition.

Rejected because anomaly alone misses records (a value 1.5σ above mean that is also a record is more meaningful than a 2σ value that is unremarkable in a long record). Records and anomalies are *different kinds* of significance, and the system should treat them differently. The composition is a small cost for a meaningful gain in expressiveness.

### Alternative: ML-based event detection

Train a model on labelled "interesting moments" in time series; use the model output as the intensity signal.

Rejected for v1. Adds a model-training pipeline, model versioning, dataset curation — entire infrastructure. The classical four-detector approach handles the use cases cleanly. Revisit if classical approach proves insufficient.

### Alternative: single threshold per recipe

Set one threshold; intensity is binary (event / no event).

Rejected because audio crossfading needs continuous values, not binary. Overlays could use binary, but coupling audio and overlays through a single signal forces continuous output.

### Alternative: data-source-specific algorithms

Different algorithms for SST, sea level, ice extent — tuned to each variable's typical statistics.

Rejected because the four-detector model with configurable weights handles per-source tuning at the weights level rather than the algorithm level. Keeps the algorithm uniform across sources; just the parameters change.

## Trade-offs

- **Default weights are a choice that won't be right for every recipe.** Mitigated by per-recipe overrides; documented as expected.
- **Smoothing window is a magic number.** 3-frame is conservative; longer smoothing makes audio mushier; shorter makes audio jittery. Tuneable.
- **The intensity signal is a single channel.** A more nuanced design might output multiple channels (peaks-channel, records-channel, etc.) to drive multi-instrument arrangements. Reserved for a future iteration.
- **Inflection detection is sensitive to noise.** Second derivatives amplify noise. Mitigated by smoothing the time series before computing the inflection score.

## Open questions

1. Is the threshold-crossing detector worth the complexity? It requires per-recipe configuration of meaningful thresholds. Default to "off" for recipes that don't define them?
2. How does this interact with multi-source recipes? Currently the algorithm assumes one scalar time series. A composite recipe with two sources may want to combine their signals — additively, multiplicatively, or pick the dominant one?
3. Should the algorithm produce its output once at export time, or per-frame on demand during preview? Probably once at export, cached. Preview can use a cheap approximation.
4. Storage: do we store the per-frame intensity signal as part of the export bundle, or recompute every time? Storing makes the export reproducible without re-running the algorithm; recomputing keeps the bundle small.

## How this closes

- **ADR-NNN — Key moment detection algorithm.** Locks the four-detector composition, the default weights, the smoothing window, and the per-recipe override mechanism.

## Links

- **TA** — §components/render-system · §contracts (audio scalars)
- **Related PRDs** — PRD-005 Video Editor
- **Related RFCs** — RFC-006 Audio system (consumes this signal)
