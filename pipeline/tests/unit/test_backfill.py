"""Tests for the backfill module."""


import pytest
import yaml

from oceancanvas.backfill import _generate_dates, _parse_date, validate_backfill


class TestGenerateDates:
    def test_monthly_single_year(self):
        dates = _generate_dates("2026-01", "2026-06", "monthly")
        assert len(dates) == 6
        assert dates[0] == "2026-01-01"
        assert dates[-1] == "2026-06-01"

    def test_monthly_cross_year(self):
        dates = _generate_dates("2025-11", "2026-02", "monthly")
        assert len(dates) == 4
        assert dates == ["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"]

    def test_daily_short_range(self):
        dates = _generate_dates("2026-01-01", "2026-01-05", "daily")
        assert len(dates) == 5
        assert dates[0] == "2026-01-01"
        assert dates[-1] == "2026-01-05"

    def test_single_date(self):
        dates = _generate_dates("2026-03-15", "2026-03-15", "daily")
        assert dates == ["2026-03-15"]

    def test_swapped_dates(self):
        dates = _generate_dates("2026-06", "2026-01", "monthly")
        assert len(dates) == 6
        assert dates[0] == "2026-01-01"

    def test_unknown_cadence(self):
        with pytest.raises(ValueError, match="Unknown cadence"):
            _generate_dates("2026-01", "2026-02", "weekly")


class TestParseDate:
    def test_yyyy_mm(self):
        d = _parse_date("2026-03")
        assert d.year == 2026
        assert d.month == 3
        assert d.day == 1

    def test_yyyy_mm_dd(self):
        d = _parse_date("2026-03-15")
        assert d.year == 2026
        assert d.month == 3
        assert d.day == 15

    def test_invalid(self):
        with pytest.raises(ValueError):
            _parse_date("2026")


class TestValidateBackfill:
    @pytest.fixture()
    def backfill_env(self, tmp_path):
        data_dir = tmp_path / "data"
        recipes_dir = tmp_path / "recipes"
        renders_dir = tmp_path / "renders"

        data_dir.mkdir()
        recipes_dir.mkdir()
        renders_dir.mkdir()

        recipe = {
            "name": "test-recipe",
            "sources": {"primary": "oisst"},
            "region": {"lat": [25, 65], "lon": [-80, 0]},
            "render": {"type": "field"},
        }
        (recipes_dir / "test-recipe.yaml").write_text(yaml.dump(recipe))

        # Create processed data for some dates
        processed_dir = data_dir / "processed" / "oisst"
        processed_dir.mkdir(parents=True)
        (processed_dir / "2026-01-01.json").write_text("{}")
        (processed_dir / "2026-02-01.json").write_text("{}")
        # 2026-03-01 intentionally missing

        # Create existing render for one date
        render_dir = renders_dir / "test-recipe"
        render_dir.mkdir()
        (render_dir / "2026-01-01.png").write_bytes(b"png")

        return data_dir, recipes_dir, renders_dir

    def test_classifies_dates(self, backfill_env):
        data_dir, recipes_dir, renders_dir = backfill_env
        dates = ["2026-01-01", "2026-02-01", "2026-03-01"]

        to_render, already_done, missing = validate_backfill(
            "test-recipe", dates, data_dir, recipes_dir, renders_dir
        )

        assert already_done == ["2026-01-01"]
        assert to_render == ["2026-02-01"]
        assert missing == ["2026-03-01"]

    def test_missing_recipe(self, backfill_env):
        data_dir, recipes_dir, renders_dir = backfill_env
        with pytest.raises(FileNotFoundError):
            validate_backfill("nonexistent", ["2026-01-01"], data_dir, recipes_dir, renders_dir)
