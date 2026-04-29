"""Tests for creative-to-technical parameter mapping."""

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
