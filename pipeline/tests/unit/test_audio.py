"""Tests for RFC-010 generative audio synthesis (oceancanvas.audio)."""

from __future__ import annotations

import wave
from pathlib import Path

import numpy as np
import pytest

from oceancanvas.audio import (
    AudioParams,
    _align_arc,
    _compute_intensity,
    _inject_hold,
    _interp_to_samples,
    _synth_drone,
    build_audio_track,
)


class TestAudioParams:
    def test_defaults(self):
        p = AudioParams()
        assert p.drone_waveform == "triangle"
        assert p.accent_style == "chime"
        assert 0 < p.presence <= 1

    def test_from_dict_partial(self):
        p = AudioParams.from_dict({"drone_waveform": "sawtooth", "presence": 0.42})
        assert p.drone_waveform == "sawtooth"
        assert p.presence == 0.42
        # Defaults preserved for missing keys
        assert p.accent_style == "chime"

    def test_from_dict_none_returns_defaults(self):
        assert AudioParams.from_dict(None) == AudioParams()
        assert AudioParams.from_dict({}) == AudioParams()


class TestSynthDrone:
    def test_drone_is_deterministic(self):
        values = np.linspace(0, 1, 30)
        intensity = np.linspace(0, 1, 30)
        arc = np.ones(30)
        p = AudioParams()
        a = _synth_drone(values, intensity, arc, p, fps=12, n_samples=44100, sr=44100)
        b = _synth_drone(values, intensity, arc, p, fps=12, n_samples=44100, sr=44100)
        assert np.array_equal(a, b)

    def test_drone_amplitude_scales_with_intensity(self):
        values = np.linspace(0.5, 0.5, 30)  # constant pitch
        zero = np.zeros(30)
        full = np.ones(30)
        arc = np.ones(30)
        p = AudioParams()
        quiet = _synth_drone(values, zero, arc, p, fps=12, n_samples=44100, sr=44100)
        loud = _synth_drone(values, full, arc, p, fps=12, n_samples=44100, sr=44100)
        assert np.sqrt((loud**2).mean()) > np.sqrt((quiet**2).mean()) * 1.2

    def test_waveform_choice_changes_spectrum(self):
        values = np.full(30, 0.5)
        intensity = np.full(30, 0.5)
        arc = np.ones(30)
        sine = _synth_drone(values, intensity, arc, AudioParams(drone_waveform="sine"),
                            fps=12, n_samples=44100, sr=44100)
        saw = _synth_drone(values, intensity, arc, AudioParams(drone_waveform="sawtooth"),
                           fps=12, n_samples=44100, sr=44100)
        assert not np.allclose(sine, saw)

    def test_arc_modulates_amplitude(self):
        """RFC-011: arc[frame] scales drone amplitude per-frame."""
        values = np.full(30, 0.5)
        intensity = np.full(30, 1.0)
        full_arc = np.ones(30)
        half_arc = np.full(30, 0.5)
        p = AudioParams()
        loud = _synth_drone(values, intensity, full_arc, p, fps=12, n_samples=44100, sr=44100)
        quiet = _synth_drone(values, intensity, half_arc, p, fps=12, n_samples=44100, sr=44100)
        # Half-arc should be roughly half RMS
        ratio = np.sqrt((quiet**2).mean()) / np.sqrt((loud**2).mean())
        assert 0.4 < ratio < 0.6


class TestInjectHold:
    def test_no_hold_returns_originals(self):
        v, d, a, m = _inject_hold(
            [1.0, 2.0, 3.0], ["a", "b", "c"], [0.5, 0.5, 0.5], [{"frame": 1}],
            fps=12, hold_at_frame=None, hold_duration_sec=0.0,
        )
        assert v == [1.0, 2.0, 3.0]
        assert d == ["a", "b", "c"]
        assert a == [0.5, 0.5, 0.5]
        assert m == [{"frame": 1}]

    def test_hold_extends_arrays(self):
        v, d, a, m = _inject_hold(
            [1.0, 2.0, 3.0], ["a", "b", "c"], [0.0, 1.0, 0.0], [{"frame": 0}],
            fps=12, hold_at_frame=1, hold_duration_sec=1.0,
        )
        # 12 hold frames inserted after index 1
        assert len(v) == 3 + 12
        assert v[1] == 2.0
        assert v[2:14] == [2.0] * 12  # held copies
        assert v[14] == 3.0  # original next frame

    def test_arc_held_at_value(self):
        v, d, a, _ = _inject_hold(
            [1.0, 2.0, 3.0], ["a", "b", "c"], [0.2, 0.7, 0.4], None,
            fps=12, hold_at_frame=1, hold_duration_sec=1.0,
        )
        assert a is not None
        # Hold copies the arc value at the held frame (0.7)
        assert a[2:14] == [0.7] * 12

    def test_moment_indices_shift(self):
        v, d, a, m = _inject_hold(
            [1.0, 2.0, 3.0, 4.0], ["a", "b", "c", "d"], None,
            [{"frame": 1}, {"frame": 3}],  # one before/at, one after the held frame
            fps=12, hold_at_frame=1, hold_duration_sec=1.0,
        )
        # Moment at frame 1 stays at frame 1 (it IS the held moment)
        assert m[0]["frame"] == 1
        # Moment at frame 3 shifts by hold_frames (12)
        assert m[1]["frame"] == 15

    def test_invalid_frame_returns_unchanged(self):
        v, d, a, m = _inject_hold(
            [1.0, 2.0], ["a", "b"], None, None,
            fps=12, hold_at_frame=99, hold_duration_sec=1.0,
        )
        assert v == [1.0, 2.0]


class TestAlignArc:
    def test_none_returns_ones(self):
        arr = _align_arc(None, 50)
        assert len(arr) == 50
        assert np.all(arr == 1.0)

    def test_empty_returns_ones(self):
        arr = _align_arc([], 30)
        assert np.all(arr == 1.0)

    def test_matched_length_returns_as_is(self):
        spec = [0.1, 0.5, 0.9, 0.3, 0.7]
        arr = _align_arc(spec, 5)
        assert np.allclose(arr, spec)

    def test_mismatched_length_interpolates(self):
        spec = [0.0, 1.0]  # ramp up
        arr = _align_arc(spec, 11)
        # Should interpolate to 0.0, 0.1, 0.2, ..., 1.0
        assert arr[0] == 0.0
        assert abs(arr[-1] - 1.0) < 1e-9
        assert abs(arr[5] - 0.5) < 1e-9


class TestComputeIntensity:
    def test_handles_empty_input(self):
        assert len(_compute_intensity(np.asarray([]))) == 0

    def test_records_at_monotonic_high(self):
        values = np.asarray([1.0, 2.0, 3.0, 4.0, 5.0])
        intensity = _compute_intensity(values)
        # Last frame should be the all-time high → high intensity
        assert intensity[-1] > intensity[0]


class TestInterpToSamples:
    def test_constant_input_yields_constant_output(self):
        per_frame = np.full(10, 0.7)
        samples = _interp_to_samples(per_frame, n_samples=4410, fps=12, sr=44100)
        assert np.allclose(samples, 0.7)


class TestBuildAudioTrack:
    @pytest.fixture
    def synthetic_samples_dir(self, tmp_path: Path) -> Path:
        """Write synthetic short WAV files masquerading as the sample bank."""
        samples_dir = tmp_path / "samples"
        samples_dir.mkdir()
        # Generate brief silent placeholders for each expected sample
        for name in [
            "pulse_tick_up.mp3", "pulse_tick_neutral.mp3", "pulse_tick_down.mp3",
            "accent_record_high.mp3", "accent_record_low.mp3", "accent_inflection.mp3",
            "texture_noise.mp3",
        ]:
            # We can't write MP3 directly, but the loader is robust to missing files
            # (returns zero-length arrays). For build_audio_track we only need it to not crash.
            pass
        return samples_dir

    def test_writes_wav_with_correct_duration(
        self, tmp_path: Path, synthetic_samples_dir: Path,
    ):
        out = tmp_path / "audio.wav"
        values = list(np.linspace(15, 25, 24))  # 24 frames = 2s at 12fps
        dates = [f"2020-{(i % 12) + 1:02d}" for i in range(24)]
        build_audio_track(
            out,
            values=values,
            dates=dates,
            moments=[{"frame": 12, "type": "record", "label": "All-time high"}],
            params=AudioParams(),
            fps=12,
            samples_dir=synthetic_samples_dir,  # samples missing -> drone-only
        )
        assert out.exists()
        with wave.open(str(out), "rb") as w:
            assert w.getframerate() == 44100
            assert w.getnchannels() == 2
            duration_sec = w.getnframes() / w.getframerate()
            assert 1.9 < duration_sec < 2.1

    def test_same_inputs_same_output(
        self, tmp_path: Path, synthetic_samples_dir: Path,
    ):
        """Determinism — same recipe + same data = byte-identical synthesised mix."""
        out1 = tmp_path / "a.wav"
        out2 = tmp_path / "b.wav"
        kwargs = dict(
            values=list(np.linspace(15, 25, 24)),
            dates=[f"2020-{(i % 12) + 1:02d}" for i in range(24)],
            moments=[{"frame": 6, "type": "peak", "label": "Hottest year: 2020"}],
            params=AudioParams(drone_waveform="sawtooth", pulse_sensitivity=0.7),
            fps=12,
            samples_dir=synthetic_samples_dir,
        )
        build_audio_track(out1, **kwargs)
        build_audio_track(out2, **kwargs)
        assert out1.read_bytes() == out2.read_bytes()

    def test_empty_values_raises(self, tmp_path: Path):
        with pytest.raises(ValueError):
            build_audio_track(
                tmp_path / "x.wav",
                values=[], dates=[], moments=[], params=AudioParams(), fps=12,
            )

    def test_arc_changes_synthesis_output(
        self, tmp_path: Path, synthetic_samples_dir: Path,
    ):
        """RFC-011: passing an arc with a peak should change the synthesised WAV."""
        common = dict(
            values=list(np.linspace(15, 25, 24)),
            dates=[f"2020-{(i % 12) + 1:02d}" for i in range(24)],
            moments=[{"frame": 12, "type": "record", "label": "All-time high"}],
            params=AudioParams(),
            fps=12,
            samples_dir=synthetic_samples_dir,
        )
        no_arc = tmp_path / "no_arc.wav"
        with_arc = tmp_path / "with_arc.wav"
        build_audio_track(no_arc, **common, arc=None)
        # Arc with a sharp peak at frame 12
        peaked = [0.1] * 12 + [1.0] + [0.1] * 11
        build_audio_track(with_arc, **common, arc=peaked)
        # Output should differ — arc materially shapes the mix
        assert no_arc.read_bytes() != with_arc.read_bytes()

    def test_arc_none_equals_arc_ones(
        self, tmp_path: Path, synthetic_samples_dir: Path,
    ):
        """Backwards-compat: arc=None must produce the same WAV as arc=[1,1,...]."""
        common = dict(
            values=list(np.linspace(15, 25, 24)),
            dates=[f"2020-{(i % 12) + 1:02d}" for i in range(24)],
            moments=[{"frame": 6, "type": "peak", "label": "Hottest"}],
            params=AudioParams(),
            fps=12,
            samples_dir=synthetic_samples_dir,
        )
        a = tmp_path / "none.wav"
        b = tmp_path / "ones.wav"
        build_audio_track(a, **common, arc=None)
        build_audio_track(b, **common, arc=[1.0] * 24)
        assert a.read_bytes() == b.read_bytes()
