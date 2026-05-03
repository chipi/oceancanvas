"""Creative-to-technical parameter mapping.

Maps creative state (mood, energy, presence, colour character, temporal weight)
to technical render parameters. Must produce identical outputs to the TypeScript
equivalent at gallery/src/lib/creativeMapping.ts.
"""

from __future__ import annotations

MOOD_PRESETS: dict[str, dict] = {
    "Becalmed": {
        "mood": "Becalmed",
        "energy_x": 0.2,
        "energy_y": 0.6,
        "colour_character": 0.3,
        "temporal_weight": 0.4,
    },
    "Deep current": {
        "mood": "Deep current",
        "energy_x": 0.4,
        "energy_y": 0.8,
        "colour_character": 0.4,
        "temporal_weight": 0.7,
    },
    "Storm surge": {
        "mood": "Storm surge",
        "energy_x": 0.9,
        "energy_y": 0.3,
        "colour_character": 0.5,
        "temporal_weight": 0.6,
    },
    "Surface shimmer": {
        "mood": "Surface shimmer",
        "energy_x": 0.5,
        "energy_y": 0.5,
        "colour_character": 0.6,
        "temporal_weight": 0.3,
    },
    "Arctic still": {
        "mood": "Arctic still",
        "energy_x": 0.1,
        "energy_y": 0.9,
        "colour_character": 0.0,
        "temporal_weight": 0.8,
    },
}


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def creative_to_technical(
    energy_x: float,
    energy_y: float,
    colour_character: float,
    temporal_weight: float,
) -> dict:
    """Map creative state to technical render parameters.

    Pure function — same inputs always produce same outputs.
    Must match creativeToTechnical() in gallery/src/lib/creativeMapping.ts.
    Accepts individual args for backward compat; use creative_state_to_technical()
    for dict input matching the TS signature.
    """
    if colour_character < 0.33:
        colormap = "arctic"
    elif colour_character < 0.66:
        colormap = "thermal"
    else:
        colormap = "otherworldly"

    opacity = _clamp(_lerp(0.3, 1.0, energy_y), 0.1, 1.0)
    smooth = energy_x < 0.5
    particle_count = round(_lerp(500, 5000, energy_y))
    tail_length = round(_lerp(3, 24, temporal_weight))
    speed_scale = _lerp(0.2, 2.0, energy_x)
    marker_size = round(_lerp(2, 8, energy_y))
    marker_opacity = _clamp(_lerp(0.3, 0.9, energy_y), 0.1, 1.0)

    return {
        "colormap": colormap,
        "opacity": round(opacity * 100) / 100,
        "smooth": smooth,
        "particle_count": particle_count,
        "tail_length": tail_length,
        "speed_scale": round(speed_scale * 100) / 100,
        "marker_size": marker_size,
        "marker_opacity": round(marker_opacity * 100) / 100,
    }


def creative_state_to_technical(state: dict) -> dict:
    """Dict-input wrapper matching the TS creativeToTechnical(state) signature."""
    return creative_to_technical(
        energy_x=state["energy_x"],
        energy_y=state["energy_y"],
        colour_character=state["colour_character"],
        temporal_weight=state["temporal_weight"],
    )


def creative_to_audio(state: dict) -> dict:
    """Map creative state to audio parameters.

    Mirrors creativeToAudio() in gallery/src/lib/creativeMapping.ts.
    Cross-validation fixture verifies parity with the TS implementation.
    """
    mood = state.get("mood", "custom")
    energy_x = state["energy_x"]
    energy_y = state["energy_y"]
    colour_character = state["colour_character"]
    temporal_weight = state["temporal_weight"]

    if colour_character < 0.33:
        drone_waveform = "sine"
    elif colour_character < 0.66:
        drone_waveform = "triangle"
    else:
        drone_waveform = "sawtooth"

    if mood == "Becalmed":
        accent_style = "chime"
    elif mood == "Deep current":
        accent_style = "bell"
    elif mood == "Storm surge":
        accent_style = "ping"
    elif mood == "Surface shimmer":
        accent_style = "ping"
    elif mood == "Arctic still":
        accent_style = "drop"
    elif energy_x > 0.6:
        accent_style = "ping"
    elif energy_y > 0.6:
        accent_style = "bell"
    elif energy_y < 0.3:
        accent_style = "drop"
    else:
        accent_style = "chime"

    return {
        "drone_waveform": drone_waveform,
        "drone_glide": round(_clamp(temporal_weight, 0.0, 1.0) * 100) / 100,
        "pulse_sensitivity": round(_clamp(energy_x, 0.0, 1.0) * 100) / 100,
        "presence": round(_clamp(_lerp(0.3, 1.0, energy_y), 0.1, 1.0) * 100) / 100,
        "accent_style": accent_style,
        "texture_density": round(_clamp(_lerp(0.15, 0.6, energy_y), 0.0, 1.0) * 100) / 100,
    }
