"""RFC-010 generative audio synthesis — pipeline export side.

Mirrors the browser AudioEngine (gallery/src/lib/audioEngine.ts) but renders
to a deterministic WAV instead of using Web Audio. Each layer is synthesised
as a numpy array; the four layers are mixed and clipped to [-1, 1].

Determinism: the synthesis is pure-Python/numpy, so the same inputs always
produce the same WAV. ffmpeg is used only to (a) decode pre-rendered MP3
samples for pulse/accent/texture and (b) encode the final WAV as AAC inside
the MP4 — neither affects the synthesis output of this module.
"""

from __future__ import annotations

import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from oceancanvas.log import get_logger

SAMPLE_RATE = 44100
GENERATIVE_DIR = Path(__file__).parent.parent.parent.parent / "audio" / "generative"

# Match the runtime asset locations the browser uses
SAMPLE_FILES = {
    "pulse_up": "pulse_tick_up.mp3",
    "pulse_neutral": "pulse_tick_neutral.mp3",
    "pulse_down": "pulse_tick_down.mp3",
    "accent_high": "accent_record_high.mp3",
    "accent_low": "accent_record_low.mp3",
    "accent_inflection": "accent_inflection.mp3",
    "texture_noise": "texture_noise.mp3",
}


@dataclass(frozen=True)
class AudioParams:
    """The recipe-level audio: block as a typed object."""

    drone_waveform: str = "triangle"
    drone_glide: float = 0.5
    pulse_sensitivity: float = 0.4
    presence: float = 0.7
    accent_style: str = "chime"
    texture_density: float = 0.35

    @classmethod
    def from_dict(cls, d: dict | None) -> "AudioParams":
        if not d:
            return cls()
        return cls(
            drone_waveform=str(d.get("drone_waveform", cls.drone_waveform)),
            drone_glide=float(d.get("drone_glide", cls.drone_glide)),
            pulse_sensitivity=float(d.get("pulse_sensitivity", cls.pulse_sensitivity)),
            presence=float(d.get("presence", cls.presence)),
            accent_style=str(d.get("accent_style", cls.accent_style)),
            texture_density=float(d.get("texture_density", cls.texture_density)),
        )


def build_audio_track(
    output_path: Path,
    *,
    values: list[float],
    dates: list[str],
    moments: list[dict] | None,
    params: AudioParams,
    fps: int,
    samples_dir: Path | None = None,
) -> Path:
    """Synthesise a four-layer audio track for one recipe export.

    Args:
        output_path: Destination WAV file (caller is responsible for cleanup).
        values: Per-frame data values (e.g. SST monthly means).
        dates: Per-frame dates as YYYY-MM strings (for seasonal texture phase).
        moments: Key moment events from moments.py — at least {frame, type}.
        params: Recipe AudioParams (RFC-010 audio: block).
        fps: Frames per second.
        samples_dir: Override for sample bank location (defaults to repo).

    Returns:
        Path to the written WAV.
    """
    logger = get_logger()
    if not values:
        msg = "build_audio_track: values is empty"
        raise ValueError(msg)

    sr = SAMPLE_RATE
    duration = len(values) / fps
    n_samples = int(duration * sr)

    # Normalise data into [0, 1] for drone pitch
    v_arr = np.asarray(values, dtype=np.float64)
    v_min = float(v_arr.min())
    v_max = float(v_arr.max())
    span = max(v_max - v_min, 1e-9)
    value_norm = (v_arr - v_min) / span

    # Compute moment intensity (smoothed) for drone amplitude — same as gallery moments.ts
    intensity = _compute_intensity(v_arr)

    # Load samples once
    bank = _load_samples(samples_dir or GENERATIVE_DIR)

    drone = _synth_drone(value_norm, intensity, params, fps, n_samples, sr)
    pulse = _synth_pulse(v_arr, params, fps, n_samples, sr, bank)
    accent = _synth_accent(moments or [], params, fps, n_samples, sr, bank)
    texture = _synth_texture(value_norm, dates, params, fps, n_samples, sr, bank)

    mix = drone + pulse + accent + texture
    mix = np.clip(mix * params.presence, -1.0, 1.0)

    _write_wav(output_path, sr, mix.astype(np.float32))
    logger.info(
        "Audio synthesised: %.1fs at %dHz (%s drone, %s accents, density=%.2f)",
        duration, sr, params.drone_waveform, params.accent_style, params.texture_density,
    )
    return output_path


# ── Layer synthesis ────────────────────────────────────────────────────────


def _synth_drone(
    value_norm: np.ndarray,
    intensity: np.ndarray,
    p: AudioParams,
    fps: int,
    n_samples: int,
    sr: int,
) -> np.ndarray:
    """Layer 1: continuous tone with data-driven pitch + amplitude."""
    sensitivity = float(p.pulse_sensitivity)
    presence = float(p.presence)
    glide = float(p.drone_glide)

    drone_span = _lerp(180, 320, sensitivity)
    drone_min = _lerp(110, 80, presence)
    f_min = drone_min
    f_max = drone_min + drone_span
    base_gain = _lerp(0.25, 0.5, presence)

    # Per-sample target frequency — interpolate between frames
    target_hz = f_min + value_norm * (f_max - f_min)
    target_amp = base_gain * (0.4 + 0.6 * intensity)
    hz_per_sample = _interp_to_samples(target_hz, n_samples, fps, sr)
    amp_per_sample = _interp_to_samples(target_amp, n_samples, fps, sr)

    # Smooth glide: simple one-pole low-pass on the frequency target
    glide_tau = _lerp(0.05, 1.5, glide)
    alpha = 1.0 - np.exp(-1.0 / (glide_tau * sr))
    smoothed_hz = np.empty_like(hz_per_sample)
    h = hz_per_sample[0]
    for i in range(n_samples):
        h = h + alpha * (hz_per_sample[i] - h)
        smoothed_hz[i] = h

    # Phase accumulation — integral of frequency
    phase = 2 * np.pi * np.cumsum(smoothed_hz) / sr

    waveform = p.drone_waveform
    if waveform == "sine":
        wave_arr = np.sin(phase)
    elif waveform == "triangle":
        wave_arr = 2.0 * np.abs(2.0 * (phase / (2 * np.pi) - np.floor(phase / (2 * np.pi) + 0.5))) - 1.0
    elif waveform == "sawtooth":
        wave_arr = 2.0 * (phase / (2 * np.pi) - np.floor(0.5 + phase / (2 * np.pi)))
    elif waveform == "square":
        wave_arr = np.sign(np.sin(phase))
    else:
        wave_arr = np.sin(phase)

    # Lowpass-ish: damp high harmonics softly via a one-pole filter
    cutoff_hz = _lerp(1200, 3000, sensitivity)
    rc = 1.0 / (2 * np.pi * cutoff_hz)
    a = (1.0 / sr) / (rc + 1.0 / sr)
    filtered = np.empty_like(wave_arr)
    y = 0.0
    for i in range(n_samples):
        y = y + a * (wave_arr[i] - y)
        filtered[i] = y

    # Stereo: same signal both channels
    return _to_stereo(filtered * amp_per_sample)


def _synth_pulse(
    values: np.ndarray,
    p: AudioParams,
    fps: int,
    n_samples: int,
    sr: int,
    bank: dict,
) -> np.ndarray:
    """Layer 2: scheduled tap whose rate follows |Δ value|."""
    sensitivity = float(p.pulse_sensitivity)
    presence = float(p.presence)
    bpm_min = _lerp(50, 70, sensitivity)
    bpm_max = _lerp(110, 180, sensitivity)
    gain = _lerp(0.1, 0.5, sensitivity * presence)

    # Phase accumulator — fires when phase wraps
    out = np.zeros((n_samples, 2), dtype=np.float64)
    phase = 0.0
    frame_sec = 1.0 / fps
    span = float(values.max() - values.min()) or 1.0

    for frame in range(len(values)):
        prev = values[frame - 1] if frame > 0 else values[0]
        delta = abs(values[frame] - prev) / (span * 0.1)
        delta = min(1.0, max(0.0, delta))
        bpm = bpm_min + (bpm_max - bpm_min) * min(1.0, delta * sensitivity * 4)
        phase += (bpm / 60.0) * frame_sec
        if phase >= 1.0:
            phase -= int(phase)
            direction = (
                1 if values[frame] > prev else
                -1 if values[frame] < prev else 0
            )
            sample = (
                bank["pulse_up"] if direction > 0 else
                bank["pulse_down"] if direction < 0 else
                bank["pulse_neutral"]
            )
            offset_samples = int(frame * frame_sec * sr)
            _place_sample(out, sample, offset_samples, gain)

    return out


def _synth_accent(
    moments: list[dict],
    p: AudioParams,
    fps: int,
    n_samples: int,
    sr: int,
    bank: dict,
) -> np.ndarray:
    """Layer 3: one-shot sample at each key moment."""
    presence = float(p.presence)
    gain = _lerp(0.35, 0.65, presence)
    out = np.zeros((n_samples, 2), dtype=np.float64)

    for m in moments:
        frame = int(m.get("frame", -1))
        if frame < 0:
            continue
        accent_type = _classify_accent(m, p.accent_style, bank)
        offset_samples = int(frame * (1.0 / fps) * sr)
        _place_sample(out, accent_type, offset_samples, gain)

    return out


def _synth_texture(
    value_norm: np.ndarray,
    dates: list[str],
    p: AudioParams,
    fps: int,
    n_samples: int,
    sr: int,
    bank: dict,
) -> np.ndarray:
    """Layer 4: looping noise modulated by seasonal phase + timeline ramp."""
    density = float(p.texture_density)
    base_gain = _lerp(0.15, 0.4, density)

    noise = bank["texture_noise"]
    noise_len = len(noise)
    if noise_len == 0:
        return np.zeros((n_samples, 2), dtype=np.float64)

    # Loop the noise to fill the duration as a 1D mono signal
    repeats = (n_samples // noise_len) + 1
    looped_mono = np.tile(noise, repeats)[:n_samples]

    # Per-frame envelope: seasonal sine × yearly ramp × density
    n_frames = len(value_norm)
    env = np.empty(n_frames, dtype=np.float64)
    for f in range(n_frames):
        date = dates[f] if f < len(dates) else ""
        month = 0
        if len(date) >= 7:
            try:
                month = int(date[5:7])
            except ValueError:
                month = 0
        month_frac = (month - 1) / 12.0 if month > 0 else 0.0
        seasonal = 1 - 0.4 + 0.4 * (0.5 + 0.5 * np.cos(month_frac * np.pi * 2))
        year_ramp = 0.5 + 0.5 * (f / max(1, n_frames - 1))
        env[f] = base_gain * density * seasonal * year_ramp

    env_per_sample = _interp_to_samples(env, n_samples, fps, sr)
    return _to_stereo(looped_mono * env_per_sample)


# ── Helpers ───────────────────────────────────────────────────────────────


def _classify_accent(moment: dict, style: str, bank: dict) -> np.ndarray:
    """Pick which accent buffer to fire — see audioEngine.ts pickAccentBuffer."""
    if style == "bell":
        return bank["accent_inflection"]
    if style == "ping":
        return bank["accent_high"]
    if style == "drop":
        return bank["accent_low"]
    # chime (default) — choose by event type
    label = str(moment.get("label", "")).lower()
    mtype = str(moment.get("type", ""))
    if mtype == "record":
        return bank["accent_low"] if "low" in label else bank["accent_high"]
    if mtype == "inflection":
        return bank["accent_inflection"]
    if mtype == "peak":
        return bank["accent_low"] if "cold" in label else bank["accent_high"]
    return bank["accent_inflection"]


def _place_sample(out: np.ndarray, sample: np.ndarray, offset: int, gain: float) -> None:
    """Mix a sample into the output buffer at the given sample offset."""
    if offset >= len(out) or len(sample) == 0:
        return
    end = min(offset + len(sample), len(out))
    take = end - offset
    if sample.ndim == 1:
        out[offset:end, 0] += sample[:take] * gain
        out[offset:end, 1] += sample[:take] * gain
    else:
        out[offset:end] += sample[:take] * gain


def _interp_to_samples(per_frame: np.ndarray, n_samples: int, fps: int, sr: int) -> np.ndarray:
    """Linear-interpolate per-frame values to per-sample resolution."""
    n_frames = len(per_frame)
    if n_frames == 0:
        return np.zeros(n_samples)
    frame_xs = np.arange(n_frames) * (sr / fps)
    sample_xs = np.arange(n_samples)
    return np.interp(sample_xs, frame_xs, per_frame)


def _compute_intensity(values: np.ndarray, smooth_window: int = 5) -> np.ndarray:
    """Smoothed peak/record intensity matching gallery moments.ts (default weights)."""
    n = len(values)
    if n == 0:
        return np.zeros(0)

    mean = values.mean()
    std = values.std() or 1.0
    peaks = np.clip((values - mean) / (2 * std), 0, 1)

    records = np.zeros(n)
    cur_max = -np.inf
    for i, v in enumerate(values):
        if v >= cur_max:
            cur_max = v
            records[i] = 1.0
        elif cur_max != 0:
            records[i] = max(0.0, min(1.0, (v / cur_max - 0.8) / 0.2))

    inflections = np.zeros(n)
    if n > 2:
        diffs = np.diff(values)
        max_d = np.max(np.abs(diffs)) or 1.0
        for i in range(1, len(diffs)):
            if diffs[i - 1] * diffs[i] < 0:
                inflections[i + 1] = min(1.0, abs(diffs[i] - diffs[i - 1]) / (2 * max_d))

    raw = 0.4 * peaks + 0.3 * records + 0.1 * inflections
    raw = np.clip(raw, 0, 1)

    # Box-smoothing window (matches gallery `smooth(values, window)`)
    if smooth_window > 1:
        half = smooth_window // 2
        smoothed = np.empty_like(raw)
        for i in range(n):
            lo = max(0, i - half)
            hi = min(n, i + half + 1)
            smoothed[i] = raw[lo:hi].mean()
        return smoothed
    return raw


def _load_samples(samples_dir: Path) -> dict:
    """Decode each MP3 sample to a mono float64 numpy array via ffmpeg."""
    bank: dict = {}
    for key, file in SAMPLE_FILES.items():
        path = samples_dir / file
        if not path.exists():
            # Tolerate missing samples — the layer just silently skips
            bank[key] = np.zeros(0, dtype=np.float64)
            continue
        bank[key] = _decode_to_array(path)
    return bank


def _decode_to_array(path: Path) -> np.ndarray:
    """Decode an audio file to mono float32 numpy array at SAMPLE_RATE via ffmpeg."""
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-i", str(path),
        "-ac", "1",
        "-ar", str(SAMPLE_RATE),
        "-f", "f32le",
        "-",
    ]
    result = subprocess.run(cmd, capture_output=True, check=True, timeout=30)
    return np.frombuffer(result.stdout, dtype=np.float32).astype(np.float64)


def _write_wav(path: Path, sr: int, data: np.ndarray) -> None:
    """Write a stereo float32 numpy array as 16-bit PCM WAV."""
    if data.ndim == 1:
        data = np.stack([data, data], axis=1)
    int16 = np.clip(data * 32767, -32768, 32767).astype(np.int16)
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(int16.tobytes())


def _to_stereo(mono: np.ndarray) -> np.ndarray:
    return np.stack([mono, mono], axis=1)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t
