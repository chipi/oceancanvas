"""Tests for creative-to-technical parameter mapping."""

import pytest

from oceancanvas.creative_mapping import MOOD_PRESETS, creative_to_technical


def _map_preset(name: str) -> dict:
    p = MOOD_PRESETS[name]
    return creative_to_technical(
        p["energy_x"], p["energy_y"], p["colour_character"], p["temporal_weight"]
    )


class TestCreativeToTechnical:
    def test_becalmed_preset(self):
        result = _map_preset("Becalmed")
        assert result["colormap"] == "arctic"
        assert result["smooth"] is True
        assert 0.5 < result["opacity"] < 0.8

    def test_storm_surge_preset(self):
        result = _map_preset("Storm surge")
        assert result["colormap"] == "thermal"
        assert result["smooth"] is False  # high energy = crisp
        assert result["speed_scale"] > 1.0

    def test_arctic_still_preset(self):
        result = _map_preset("Arctic still")
        assert result["colormap"] == "arctic"
        assert result["opacity"] > 0.8
        assert result["tail_length"] > 15

    def test_deterministic(self):
        """Same inputs always produce same outputs."""
        r1 = creative_to_technical(0.5, 0.5, 0.5, 0.5)
        r2 = creative_to_technical(0.5, 0.5, 0.5, 0.5)
        assert r1 == r2

    def test_extreme_calm(self):
        result = creative_to_technical(0.0, 0.0, 0.0, 0.0)
        assert result["smooth"] is True
        assert result["particle_count"] == 500
        assert result["speed_scale"] == 0.2

    def test_extreme_turbulent(self):
        result = creative_to_technical(1.0, 1.0, 1.0, 1.0)
        assert result["smooth"] is False
        assert result["particle_count"] == 5000
        assert result["speed_scale"] == 2.0

    def test_all_presets_produce_valid_output(self):
        for name, preset in MOOD_PRESETS.items():
            result = creative_to_technical(
                preset["energy_x"],
                preset["energy_y"],
                preset["colour_character"],
                preset["temporal_weight"],
            )
            assert "colormap" in result
            assert 0.0 <= result["opacity"] <= 1.0
            assert result["particle_count"] > 0
            assert result["tail_length"] > 0

    def test_colour_character_boundaries(self):
        assert creative_to_technical(0.5, 0.5, 0.0, 0.5)["colormap"] == "arctic"
        assert creative_to_technical(0.5, 0.5, 0.32, 0.5)["colormap"] == "arctic"
        assert creative_to_technical(0.5, 0.5, 0.34, 0.5)["colormap"] == "thermal"
        assert creative_to_technical(0.5, 0.5, 0.65, 0.5)["colormap"] == "thermal"
        assert creative_to_technical(0.5, 0.5, 0.67, 0.5)["colormap"] == "otherworldly"
        assert creative_to_technical(0.5, 0.5, 1.0, 0.5)["colormap"] == "otherworldly"


# ─── creative_to_audio (RFC-010) ───────────────────────────────────────────
from oceancanvas.creative_mapping import creative_to_audio  # noqa: E402


class TestCreativeToAudio:
    def test_becalmed_produces_sine_chime(self):
        audio = creative_to_audio(MOOD_PRESETS["Becalmed"])
        assert audio["drone_waveform"] == "sine"
        assert audio["accent_style"] == "chime"

    def test_storm_surge_produces_aggressive_pulse_ping(self):
        audio = creative_to_audio(MOOD_PRESETS["Storm surge"])
        assert audio["pulse_sensitivity"] == 0.9
        assert audio["accent_style"] == "ping"

    def test_arctic_still_produces_sine_drop(self):
        audio = creative_to_audio(MOOD_PRESETS["Arctic still"])
        assert audio["drone_waveform"] == "sine"
        assert audio["accent_style"] == "drop"
        assert audio["pulse_sensitivity"] < 0.2

    def test_drone_waveform_buckets(self):
        base = MOOD_PRESETS["Becalmed"]
        assert creative_to_audio({**base, "colour_character": 0.1})["drone_waveform"] == "sine"
        assert creative_to_audio({**base, "colour_character": 0.5})["drone_waveform"] == "triangle"
        assert creative_to_audio({**base, "colour_character": 0.9})["drone_waveform"] == "sawtooth"

    def test_deterministic(self):
        a = creative_to_audio(MOOD_PRESETS["Surface shimmer"])
        b = creative_to_audio(MOOD_PRESETS["Surface shimmer"])
        assert a == b

    def test_matches_typescript_output(self):
        """Cross-validation: Python and TS must produce identical audio block.

        TS output for Becalmed (verified manually):
          drone_waveform=sine, drone_glide=0.4, pulse_sensitivity=0.2,
          presence=0.72, accent_style=chime, texture_density=0.42
        """
        py = creative_to_audio(MOOD_PRESETS["Becalmed"])
        assert py["drone_waveform"] == "sine"
        assert py["drone_glide"] == 0.4
        assert py["pulse_sensitivity"] == 0.2
        assert py["presence"] == 0.72
        assert py["accent_style"] == "chime"
        assert py["texture_density"] == 0.42


# ─── Cross-validation fixtures (TS ↔ Py parity, ADR-027) ─────────────────

import json as _json
from pathlib import Path as _Path

_AUDIO_FIXTURE_PATH = (
    _Path(__file__).parent.parent.parent.parent
    / "tests"
    / "cross-validation"
    / "creative_audio_fixtures.json"
)
with _AUDIO_FIXTURE_PATH.open() as _f:
    _AUDIO_FIXTURES = _json.load(_f)


@pytest.mark.parametrize("case", _AUDIO_FIXTURES, ids=lambda c: c["name"])
def test_creative_to_audio_matches_typescript(case: dict) -> None:
    """ADR-027 cross-validation: Py creative_to_audio must produce
    byte-identical output to the shared fixture (generated from TS).
    Re-generate via ``node scripts/build-creative-audio-fixtures.mjs``."""
    result = creative_to_audio(case["input"])
    assert result == case["expected"], (
        f"audio mapping drift for {case['name']}: "
        f"got {result}, expected {case['expected']}"
    )
