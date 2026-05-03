"""Tests for RFC-010 generative audio synthesis (oceancanvas.audio)."""

from __future__ import annotations

import wave
from pathlib import Path

import numpy as np
import pytest

from oceancanvas.audio import (
    AudioParams,
    _compute_intensity,
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
        p = AudioParams()
        a = _synth_drone(values, intensity, p, fps=12, n_samples=44100, sr=44100)
        b = _synth_drone(values, intensity, p, fps=12, n_samples=44100, sr=44100)
        assert np.array_equal(a, b)

    def test_drone_amplitude_scales_with_intensity(self):
        values = np.linspace(0.5, 0.5, 30)  # constant pitch
        zero = np.zeros(30)
        full = np.ones(30)
        p = AudioParams()
        quiet = _synth_drone(values, zero, p, fps=12, n_samples=44100, sr=44100)
        loud = _synth_drone(values, full, p, fps=12, n_samples=44100, sr=44100)
        # Loud must have larger RMS than quiet
        assert np.sqrt((loud**2).mean()) > np.sqrt((quiet**2).mean()) * 1.2

    def test_waveform_choice_changes_spectrum(self):
        values = np.full(30, 0.5)
        intensity = np.full(30, 0.5)
        sine = _synth_drone(values, intensity, AudioParams(drone_waveform="sine"),
                            fps=12, n_samples=44100, sr=44100)
        saw = _synth_drone(values, intensity, AudioParams(drone_waveform="sawtooth"),
                           fps=12, n_samples=44100, sr=44100)
        # Different waveforms produce different signals
        assert not np.allclose(sine, saw)


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
