"""Tension arc expansion — RFC-011.

Single shared primitive that drives audio dynamics and visual filter
keyframing in unison across a video's duration. The recipe authors a small
spec; the system expands it to a per-frame ``[0, 1]`` array consumed by the
audio engine, the pipeline synthesis, and the ffmpeg filter graph.

Mirrors ``gallery/src/lib/tensionArc.ts`` byte-for-byte. Cross-validation
fixtures live at ``tests/cross-validation/tension_arc_fixtures.json``.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

ArcPreset = str  # 'classic' | 'plateau' | 'drift' | 'invert' | 'none'

VALID_PRESETS = ("classic", "plateau", "drift", "invert", "none")


@dataclass(frozen=True)
class TensionArcSpec:
    """The recipe-level tension_arc: block as a typed object."""

    preset: ArcPreset = "classic"
    peak_position: float = 0.65
    peak_height: float = 1.0
    release_steepness: float = 0.7
    pin_key_moment: bool = False

    @classmethod
    def from_dict(cls, d: dict | None) -> "TensionArcSpec":
        if not d:
            return cls()
        return cls(
            preset=str(d.get("preset", cls.preset)),
            peak_position=float(d.get("peak_position", cls.peak_position)),
            peak_height=float(d.get("peak_height", cls.peak_height)),
            release_steepness=float(d.get("release_steepness", cls.release_steepness)),
            pin_key_moment=bool(d.get("pin_key_moment", cls.pin_key_moment)),
        )


def is_arc_preset(value: object) -> bool:
    return isinstance(value, str) and value in VALID_PRESETS


def expand_arc(
    spec: TensionArcSpec,
    total_frames: int,
    dominant_moment_frame: int | None = None,
) -> list[float]:
    """Expand a ``TensionArcSpec`` into a per-frame ``[0, 1]`` array.

    If ``dominant_moment_frame`` is provided and ``spec.pin_key_moment`` is true,
    the peak position is recomputed to align with that frame so the held-moment
    gesture lands on a real significant frame rather than the authored default.

    Pure function — same inputs always produce the same output.
    """
    if total_frames <= 0:
        return []
    if spec.preset == "none":
        return [1.0] * total_frames

    peak_position = _clamp(spec.peak_position, 0.0, 1.0)
    if spec.pin_key_moment and dominant_moment_frame is not None and total_frames > 1:
        peak_position = _clamp(dominant_moment_frame / (total_frames - 1), 0.05, 0.95)
    peak_height = _clamp(spec.peak_height, 0.0, 1.0)
    release_steepness = _clamp(spec.release_steepness, 0.0, 1.0)

    result: list[float] = []
    for i in range(total_frames):
        t = i / (total_frames - 1) if total_frames > 1 else 0.0
        result.append(
            _curve_value(spec.preset, t, peak_position, peak_height, release_steepness)
        )
    return result


def _curve_value(
    preset: str,
    t: float,
    peak_position: float,
    peak_height: float,
    release_steepness: float,
) -> float:
    if preset == "classic":
        return _classic_curve(t, peak_position, peak_height, release_steepness)
    if preset == "plateau":
        return _plateau_curve(t, peak_position, peak_height, release_steepness)
    if preset == "drift":
        return _drift_curve(t, peak_height, release_steepness)
    if preset == "invert":
        return _classic_curve(1.0 - t, peak_position, peak_height, release_steepness)
    if preset == "none":
        return 1.0
    return 1.0  # unknown preset — silent fallback


def _classic_curve(
    t: float, peak_position: float, peak_height: float, release_steepness: float
) -> float:
    """Quadratic ease-in to the peak, ease-out after."""
    if peak_position <= 0:
        return peak_height * pow(1 - t, 1 + 2 * release_steepness)
    if peak_position >= 1:
        return pow(t, 2) * peak_height
    if t <= peak_position:
        return pow(t / peak_position, 2) * peak_height
    u = (t - peak_position) / (1 - peak_position)
    return peak_height * pow(1 - u, 1 + 2 * release_steepness)


def _plateau_curve(
    t: float, peak_position: float, peak_height: float, release_steepness: float
) -> float:
    """Quick ramp into a sustained plateau, then drop."""
    ramp_end = peak_position * 0.4
    plateau_end = peak_position + (1 - peak_position) * 0.4
    if t <= ramp_end:
        if ramp_end <= 0:
            return peak_height
        return pow(t / ramp_end, 2) * peak_height
    if t <= plateau_end:
        return peak_height
    if plateau_end >= 1:
        return peak_height
    u = (t - plateau_end) / (1 - plateau_end)
    return peak_height * pow(1 - u, 1 + 2 * release_steepness)


def _drift_curve(t: float, peak_height: float, release_steepness: float) -> float:
    """Undulating curve with no clear peak; release_steepness scales amplitude."""
    phase = t * 3 * math.pi - math.pi / 2
    value = 0.5 + 0.5 * math.sin(phase) * release_steepness
    return peak_height * value


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))
