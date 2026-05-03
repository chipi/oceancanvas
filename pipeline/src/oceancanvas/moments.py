"""Key moment detection for timelapse exports.

Produces a per-frame intensity signal [0.0–1.0] from a time series
of values. The signal drives both audio crossfading and overlay markers.

Four detectors combined with configurable weights:
- peaks: statistical peaks (2σ above mean)
- records: highest value seen so far
- threshold: crossing user-defined boundaries
- inflection: rate-of-change reversals

Implements RFC-007.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class MomentEvent:
    """A detected key moment in the time series."""

    frame: int
    score: float
    label: str
    type: str  # "peak", "record", "threshold", "inflection"


@dataclass
class MomentSignal:
    """Per-frame intensity signal + detected events."""

    intensity: list[float]
    events: list[MomentEvent]
    frame_count: int


@dataclass
class DetectorWeights:
    """Relative weights for each detector."""

    peaks: float = 0.4
    records: float = 0.3
    threshold: float = 0.2
    inflection: float = 0.1


def detect_moments(
    values: list[float],
    weights: DetectorWeights | None = None,
    smoothing_window: int = 3,
    event_threshold: float = 0.7,
    thresholds: list[float] | None = None,
) -> MomentSignal:
    """Detect key moments in a time series.

    Args:
        values: Per-frame data values (e.g., monthly mean SST).
        weights: Relative weights for each detector.
        smoothing_window: Gaussian smoothing window (frames).
        event_threshold: Score above which an event is labelled.
        thresholds: User-defined value boundaries for threshold detector.

    Returns:
        MomentSignal with per-frame intensity and labelled events.
    """
    if not values:
        return MomentSignal(intensity=[], events=[], frame_count=0)

    w = weights or DetectorWeights()
    n = len(values)

    peaks = _detect_peaks(values)
    records = _detect_records(values)
    thresh = _detect_thresholds(values, thresholds or [])
    inflections = _detect_inflections(values)

    # Combine weighted scores
    raw = []
    for i in range(n):
        score = (
            w.peaks * peaks[i]
            + w.records * records[i]
            + w.threshold * thresh[i]
            + w.inflection * inflections[i]
        )
        raw.append(max(0.0, min(1.0, score)))

    # Temporal smoothing (Gaussian-ish: simple weighted average)
    smoothed = _smooth(raw, smoothing_window)

    # Extract labelled events
    events = _extract_events(
        smoothed, peaks, records, thresh, inflections,
        event_threshold, values,
    )

    return MomentSignal(
        intensity=smoothed,
        events=events,
        frame_count=n,
    )


def _detect_peaks(values: list[float]) -> list[float]:
    """Statistical peaks: score based on z-score (2σ = 1.0)."""
    n = len(values)
    if n < 3:
        return [0.0] * n

    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    std = math.sqrt(variance) if variance > 0 else 1.0

    scores = []
    for v in values:
        z = (v - mean) / std if std > 0 else 0.0
        # Map z-score: 0 at mean, 1.0 at 2σ, clamped
        score = max(0.0, min(1.0, z / 2.0))
        scores.append(score)
    return scores


def _detect_records(values: list[float]) -> list[float]:
    """Records: 1.0 when a new all-time high is set, decaying after."""
    n = len(values)
    scores = [0.0] * n
    if not values:
        return scores

    running_max = float("-inf")
    for i, v in enumerate(values):
        if v >= running_max:
            running_max = v
            scores[i] = 1.0
        else:
            # Decay: how close to the record
            if running_max != 0:
                ratio = v / running_max
                scores[i] = max(0.0, min(1.0, (ratio - 0.8) / 0.2))
            else:
                scores[i] = 0.0
    return scores


def _detect_thresholds(
    values: list[float], thresholds: list[float]
) -> list[float]:
    """Threshold crossings: 1.0 when value crosses a boundary."""
    n = len(values)
    if not thresholds or n < 2:
        return [0.0] * n

    scores = [0.0] * n
    for i in range(1, n):
        for t in thresholds:
            crossed = (values[i - 1] < t <= values[i]) or (
                values[i - 1] > t >= values[i]
            )
            if crossed:
                scores[i] = 1.0
                break
    return scores


def _detect_inflections(values: list[float]) -> list[float]:
    """Inflection points: rate-of-change reversals."""
    n = len(values)
    if n < 3:
        return [0.0] * n

    # Compute first derivative (rate of change)
    diffs = [values[i] - values[i - 1] for i in range(1, n)]

    scores = [0.0] * n
    for i in range(1, len(diffs)):
        # Sign change in derivative = inflection
        if diffs[i - 1] * diffs[i] < 0:
            # Magnitude of the reversal
            magnitude = abs(diffs[i] - diffs[i - 1])
            max_diff = max(abs(d) for d in diffs) if diffs else 1.0
            scores[i + 1] = min(1.0, magnitude / (2 * max_diff)) if max_diff > 0 else 0.0
    return scores


def _smooth(values: list[float], window: int) -> list[float]:
    """Simple moving average smoothing."""
    if window <= 1 or len(values) <= window:
        return list(values)

    half = window // 2
    smoothed = []
    for i in range(len(values)):
        start = max(0, i - half)
        end = min(len(values), i + half + 1)
        smoothed.append(sum(values[start:end]) / (end - start))
    return smoothed


def _extract_events(
    intensity: list[float],
    peaks: list[float],
    records: list[float],
    thresh: list[float],
    inflections: list[float],
    threshold: float,
    values: list[float],
) -> list[MomentEvent]:
    """Extract labelled events from detector scores."""
    events = []
    for i in range(len(intensity)):
        if intensity[i] < threshold:
            continue

        # Find the dominant detector
        scores = {
            "peak": peaks[i],
            "record": records[i],
            "threshold": thresh[i],
            "inflection": inflections[i],
        }
        dominant = max(scores, key=scores.get)  # type: ignore[arg-type]
        val = values[i] if i < len(values) else 0

        labels = {
            "peak": f"Anomaly peak ({val:.1f})",
            "record": f"Record high ({val:.1f})",
            "threshold": f"Threshold crossing ({val:.1f})",
            "inflection": "Trend reversal",
        }

        events.append(MomentEvent(
            frame=i,
            score=round(intensity[i], 3),
            label=labels[dominant],
            type=dominant,
        ))
    return events
