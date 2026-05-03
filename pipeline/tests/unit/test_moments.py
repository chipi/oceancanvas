"""Tests for key moment detection."""

from oceancanvas.moments import (
    DetectorWeights,
    MomentSignal,
    _detect_inflections,
    _detect_peaks,
    _detect_records,
    _detect_thresholds,
    detect_moments,
)


class TestDetectPeaks:
    def test_high_values_score_higher(self):
        values = [10, 11, 12, 20, 12, 11, 10]
        scores = _detect_peaks(values)
        assert scores[3] > scores[0]
        assert scores[3] > 0.5

    def test_uniform_values_score_zero(self):
        scores = _detect_peaks([5.0] * 10)
        assert all(s == 0.0 for s in scores)

    def test_empty(self):
        assert _detect_peaks([]) == []


class TestDetectRecords:
    def test_new_records_score_one(self):
        values = [1, 2, 3, 2, 4, 3]
        scores = _detect_records(values)
        assert scores[0] == 1.0  # first value is always a record
        assert scores[1] == 1.0
        assert scores[2] == 1.0
        assert scores[4] == 1.0
        assert scores[3] < 1.0  # not a record

    def test_monotonic_all_records(self):
        values = [1, 2, 3, 4, 5]
        scores = _detect_records(values)
        assert all(s == 1.0 for s in scores)


class TestDetectThresholds:
    def test_crossing_detected(self):
        values = [10, 12, 14, 16, 14, 12]
        scores = _detect_thresholds(values, [15])
        assert scores[3] == 1.0  # crosses 15 going up
        assert scores[4] == 1.0  # crosses 15 going down

    def test_no_thresholds(self):
        scores = _detect_thresholds([1, 2, 3], [])
        assert all(s == 0.0 for s in scores)


class TestDetectInflections:
    def test_reversal_detected(self):
        values = [1, 2, 3, 4, 3, 2, 1]
        scores = _detect_inflections(values)
        # Inflection at index 4 (where rising turns to falling)
        assert scores[4] > 0.0

    def test_monotonic_no_inflection(self):
        scores = _detect_inflections([1, 2, 3, 4, 5])
        assert all(s == 0.0 for s in scores)


class TestDetectMoments:
    def test_returns_signal(self):
        values = [10, 11, 12, 20, 12, 11, 10]
        result = detect_moments(values)
        assert isinstance(result, MomentSignal)
        assert len(result.intensity) == 7
        assert result.frame_count == 7

    def test_peak_generates_event(self):
        # Big spike should generate an event
        values = [10] * 20 + [30] + [10] * 20
        result = detect_moments(values, event_threshold=0.3)
        assert len(result.events) > 0
        spike_events = [e for e in result.events if e.frame == 20]
        assert len(spike_events) > 0

    def test_empty_values(self):
        result = detect_moments([])
        assert result.intensity == []
        assert result.events == []
        assert result.frame_count == 0

    def test_custom_weights(self):
        values = [1, 2, 3, 4, 5]
        w = DetectorWeights(peaks=1.0, records=0.0, threshold=0.0, inflection=0.0)
        result = detect_moments(values, weights=w)
        assert len(result.intensity) == 5

    def test_deterministic(self):
        values = [10, 15, 12, 20, 11, 18, 14]
        a = detect_moments(values)
        b = detect_moments(values)
        assert a.intensity == b.intensity
        assert len(a.events) == len(b.events)

    def test_intensity_bounded(self):
        values = [1, 100, 1, 100, 1, 100]
        result = detect_moments(values)
        for v in result.intensity:
            assert 0.0 <= v <= 1.0
