"""Tests for tension arc expansion (oceancanvas.arc) — RFC-011.

Cross-validation against tests/cross-validation/tension_arc_fixtures.json
asserts that the Python implementation matches the TypeScript expansion
within tolerance for every fixture case.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from oceancanvas.arc import (
    TensionArcSpec,
    expand_arc,
    is_arc_preset,
)


FIXTURE_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "tests"
    / "cross-validation"
    / "tension_arc_fixtures.json"
)


def _load_fixture() -> dict:
    with FIXTURE_PATH.open() as f:
        return json.load(f)


class TestCrossValidationParity:
    """Each fixture case: Py expansion must equal expected_arc within tolerance."""

    fixture = _load_fixture()

    @pytest.mark.parametrize("case", fixture["cases"], ids=lambda c: c["name"])
    def test_matches_typescript_output(self, case: dict) -> None:
        spec = TensionArcSpec.from_dict(case["spec"])
        arc = expand_arc(spec, case["total_frames"], case["dominant_moment_frame"])
        expected = case["expected_arc"]
        assert len(arc) == len(expected), f"length mismatch in {case['name']}"
        tol = self.fixture["tolerance"]
        for i, (got, exp) in enumerate(zip(arc, expected, strict=True)):
            assert abs(got - exp) < tol, f"frame {i} diverged: got {got}, expected {exp}"


class TestExpandArc:
    def test_empty_for_zero_frames(self) -> None:
        assert expand_arc(TensionArcSpec(), 0) == []

    def test_none_preset_is_constant_one(self) -> None:
        arc = expand_arc(TensionArcSpec(preset="none"), 50)
        assert len(arc) == 50
        assert all(v == 1.0 for v in arc)

    def test_classic_peaks_at_peak_position(self) -> None:
        total = 101
        arc = expand_arc(TensionArcSpec(preset="classic", peak_position=0.5), total)
        peak_idx = arc.index(max(arc))
        assert peak_idx == 50
        assert abs(arc[50] - 1.0) < 1e-9

    def test_peak_height_caps_max(self) -> None:
        arc = expand_arc(TensionArcSpec(peak_height=0.5), 100)
        assert max(arc) <= 0.5 + 1e-9

    def test_pin_key_moment_relocates_peak(self) -> None:
        arc = expand_arc(
            TensionArcSpec(preset="classic", pin_key_moment=True),
            100,
            dominant_moment_frame=30,
        )
        peak_idx = arc.index(max(arc))
        assert peak_idx == 30

    def test_pin_with_null_moment_uses_default_peak(self) -> None:
        baseline = expand_arc(
            TensionArcSpec(preset="classic", peak_position=0.65), 100
        )
        pinned = expand_arc(
            TensionArcSpec(preset="classic", peak_position=0.65, pin_key_moment=True),
            100,
            None,
        )
        assert pinned == baseline

    def test_out_of_range_peak_position_clamps(self) -> None:
        high = expand_arc(TensionArcSpec(peak_position=1.5), 30)
        at_one = expand_arc(TensionArcSpec(peak_position=1.0), 30)
        assert high == at_one

    def test_drift_is_non_monotonic(self) -> None:
        arc = expand_arc(TensionArcSpec(preset="drift"), 100)
        increases = sum(1 for i in range(1, len(arc)) if arc[i] > arc[i - 1])
        decreases = sum(1 for i in range(1, len(arc)) if arc[i] < arc[i - 1])
        assert increases > 0
        assert decreases > 0

    def test_invert_sums_match_classic(self) -> None:
        classic = expand_arc(TensionArcSpec(preset="classic"), 100)
        invert = expand_arc(TensionArcSpec(preset="invert"), 100)
        assert abs(sum(classic) - sum(invert)) < 1e-6

    def test_deterministic(self) -> None:
        a = expand_arc(TensionArcSpec(), 50)
        b = expand_arc(TensionArcSpec(), 50)
        assert a == b


class TestSpecParsing:
    def test_from_dict_defaults(self) -> None:
        s = TensionArcSpec.from_dict(None)
        assert s.preset == "classic"
        assert s.peak_position == 0.65

    def test_from_dict_partial(self) -> None:
        s = TensionArcSpec.from_dict({"preset": "drift", "peak_height": 0.5})
        assert s.preset == "drift"
        assert s.peak_height == 0.5
        assert s.release_steepness == 0.7  # default preserved

    def test_from_dict_empty(self) -> None:
        assert TensionArcSpec.from_dict({}) == TensionArcSpec()


class TestIsArcPreset:
    @pytest.mark.parametrize("preset", ["classic", "plateau", "drift", "invert", "none"])
    def test_accepts_valid(self, preset: str) -> None:
        assert is_arc_preset(preset)

    def test_rejects_unknown(self) -> None:
        assert not is_arc_preset("made-up")
        assert not is_arc_preset(None)
        assert not is_arc_preset(42)
