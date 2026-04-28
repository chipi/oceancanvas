"""Tests for Task 04 — Build Payload."""

import json
import shutil
from pathlib import Path

import pytest

from oceancanvas.tasks.build_payload import (
    _build_one_payload,
    _find_latest_date,
    _load_recipe,
    build_payload,
)
from oceancanvas.tasks.process import _process_oisst

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


@pytest.fixture()
def processed_data(tmp_path: Path) -> Path:
    """Process a fixture NetCDF into tmp_path so payload builder can read it."""
    nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
    if not nc_path.exists():
        pytest.skip("fixture not generated")
    output = tmp_path / "processed" / "oisst"
    _process_oisst(nc_path, output, "2026-01-15")
    return tmp_path / "processed"


class TestLoadRecipe:
    def test_loads_valid_recipe(self):
        recipe = _load_recipe(FIXTURES_DIR / "recipes" / "test-field.yaml")
        assert recipe["name"] == "test-field"
        assert recipe["render"]["type"] == "field"
        assert recipe["render"]["seed"] == 42

    def test_rejects_invalid_recipe(self, tmp_path: Path):
        bad = tmp_path / "bad.yaml"
        bad.write_text("name: BAD NAME WITH SPACES\n")
        with pytest.raises(Exception):
            _load_recipe(bad)


class TestFindLatestDate:
    def test_finds_latest(self, processed_data: Path):
        date = _find_latest_date(processed_data, "oisst")
        assert date == "2026-01-15"

    def test_returns_none_when_no_source(self, tmp_path: Path):
        assert _find_latest_date(tmp_path, "nonexistent") is None

    def test_ignores_meta_files(self, processed_data: Path):
        """meta.json files should not be picked up as data files."""
        date = _find_latest_date(processed_data, "oisst")
        assert "meta" not in date


class TestBuildOnePayload:
    def test_produces_valid_payload(self, processed_data: Path, tmp_path: Path):
        recipe = _load_recipe(FIXTURES_DIR / "recipes" / "test-field.yaml")
        output = tmp_path / "payload.json"
        _build_one_payload(recipe, processed_data, "2026-01-15", output)

        assert output.exists()
        payload = json.loads(output.read_text())

        assert payload["version"] == 1
        assert payload["recipe"]["id"] == "test-field"
        assert payload["recipe"]["render_date"] == "2026-01-15"
        assert payload["recipe"]["render"]["type"] == "field"
        assert payload["region"]["lat_min"] == 25
        assert payload["region"]["lat_max"] == 65
        assert payload["output"]["width"] == 1920
        assert "data" in payload["data"]["primary"]

    def test_raises_on_missing_data(self, tmp_path: Path):
        recipe = _load_recipe(FIXTURES_DIR / "recipes" / "test-field.yaml")
        output = tmp_path / "payload.json"
        with pytest.raises(FileNotFoundError):
            _build_one_payload(recipe, tmp_path / "empty", "2026-01-15", output)


class TestBuildPayload:
    def test_builds_payloads_for_recipes(self, tmp_data_dir: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            pytest.skip("fixture not generated")

        # Set up source + processed data
        src_dir = tmp_data_dir / "data" / "sources" / "oisst"
        src_dir.mkdir(parents=True)
        shutil.copy(nc_path, src_dir / "2026-01-15.nc")

        processed = tmp_data_dir / "data" / "processed" / "oisst"
        _process_oisst(nc_path, processed, "2026-01-15")

        # Copy test recipe
        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        shutil.copy(FIXTURES_DIR / "recipes" / "test-field.yaml", recipes / "test-field.yaml")

        result = build_payload.fn(tmp_data_dir / "data", recipes, tmp_data_dir / "renders")

        assert len(result) == 1
        assert result[0].exists()
        payload = json.loads(result[0].read_text())
        assert payload["recipe"]["id"] == "test-field"

    def test_skips_invalid_recipes(self, tmp_data_dir: Path):
        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        (recipes / "bad.yaml").write_text("name: BAD NAME\n")

        result = build_payload.fn(tmp_data_dir / "data", recipes, tmp_data_dir / "renders")
        assert result == []

    def test_returns_empty_when_no_recipes(self, tmp_data_dir: Path):
        result = build_payload.fn(
            tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders"
        )
        assert result == []
