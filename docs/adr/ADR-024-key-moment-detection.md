# ADR-024 — Key moment detection algorithm

> **Status** · Accepted
> **Date** · 2026-05-03
> **TA anchor** · §components/render-system
> **Related RFC** · RFC-007 (closes)

## Context

The Video Editor needs a per-frame intensity signal to drive audio crossfading and overlay markers. The signal must identify frames where something interesting happens in the data — anomalies, records, threshold crossings, trend reversals.

## Decision

Four-detector weighted model producing a per-frame intensity [0.0–1.0]:

- **Peaks** (w=0.4): z-score above mean, scaled to [0,1] at 2σ
- **Records** (w=0.3): 1.0 when new all-time high, decaying after
- **Threshold** (w=0.2): 1.0 on user-defined boundary crossing
- **Inflection** (w=0.1): rate-of-change reversals

Temporal smoothing via 3-frame moving average. Events labelled when combined score exceeds 0.7.

## Rationale

Records are weighted higher than peaks because they carry narrative meaning. Four detectors capture different aspects of "interesting" without over-relying on any one signal. Smoothing prevents single-frame jitter.

## Implementation notes

- Module: `pipeline/src/oceancanvas/moments.py`
- Tests: `pipeline/tests/unit/test_moments.py` (15 tests)
- Used by: Video Editor timeline ribbon + future audio crossfading
