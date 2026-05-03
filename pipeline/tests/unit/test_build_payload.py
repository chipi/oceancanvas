"""Tests for Task 04 — Build Payload."""

import json
import shutil
from pathlib import Path

import pytest

from oceancanvas.tasks.build_payload import (
    _build_one_payload,
    _find_latest_date,
    _load_recipe,
    build_one_payload,
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

    def test_picks_latest_among_multiple_dates(self, tmp_path: Path):
        """When multiple dates exist, the latest (lexicographically) is returned."""
        source_dir = tmp_path / "oisst"
        source_dir.mkdir(parents=True)
        for d in ["2026-01-09", "2026-01-15", "2026-01-12"]:
            (source_dir / f"{d}.json").write_text("{}")
            (source_dir / f"{d}.meta.json").write_text("{}")
        date = _find_latest_date(tmp_path, "oisst")
        assert date == "2026-01-15"


class TestCropToRegion:
    def test_returns_unchanged_when_region_covers_data(self):
        """If recipe region >= processed region, return as-is."""
        from oceancanvas.tasks.build_payload import _crop_to_region

        data = {
            "data": [1, 2, 3, 4],
            "shape": [2, 2],
            "lat_range": [30, 60],
            "lon_range": [-50, -10],
            "source_id": "oisst",
            "date": "2026-01-15",
        }
        result = _crop_to_region(data, [20, 70], [-60, 0])
        assert result is data

    def test_crops_to_smaller_region(self):
        """Cropping a 4x4 grid to a subregion produces smaller output."""
        from oceancanvas.tasks.build_payload import _crop_to_region

        # 4x4 grid, lat 20-80, lon -80-0
        data = {
            "data": list(range(16)),
            "shape": [4, 4],
            "lat_range": [20.0, 80.0],
            "lon_range": [-80.0, 0.0],
            "source_id": "oisst",
            "date": "2026-01-15",
        }
        result = _crop_to_region(data, [35, 65], [-60, -20])
        assert result["shape"][0] <= 4
        assert result["shape"][1] <= 4
        assert len(result["data"]) == result["shape"][0] * result["shape"][1]
        assert result["lat_range"] == [35, 65]
        assert result["lon_range"] == [-60, -20]

    def test_caps_point_data_at_500(self):
        """Argo-style point data over 500 is deterministically subsampled."""
        from oceancanvas.tasks.build_payload import _crop_to_region

        points = [{"lat": 30 + i * 0.01, "lon": -50 + i * 0.01} for i in range(1000)]
        data = {
            "data": points,
            "shape": [1000],
            "lat_range": [30, 40],
            "lon_range": [-50, -40],
            "source_id": "argo",
            "date": "2026-01-15",
        }
        result = _crop_to_region(data, [20, 75], [-90, 10])
        assert result["shape"] == [500]
        assert len(result["data"]) == 500

    def test_empty_point_data_returns_as_is(self):
        """Empty point array should not crash."""
        from oceancanvas.tasks.build_payload import _crop_to_region

        data = {
            "data": [],
            "shape": [0],
            "lat_range": [0, 0],
            "lon_range": [0, 0],
            "source_id": "argo",
            "date": "2026-01-15",
        }
        result = _crop_to_region(data, [20, 75], [-90, 10])
        assert result["data"] == []


class TestBuildOnePayload:
    def test_produces_valid_payload(self, processed_data: Path, tmp_path: Path):
        recipe = _load_recipe(FIXTURES_DIR / "recipes" / "test-field.yaml")
        output = tmp_path / "payload.json"
        _build_one_payload(recipe, processed_data, "2026-01-15", output)

        assert output.exists()
        payload = json.loads(output.read_text())

        assert payload["version"] == 2
        assert payload["recipe"]["id"] == "test-field"
        assert payload["recipe"]["render_date"] == "2026-01-15"
        assert payload["recipe"]["render"]["type"] == "field"
        assert payload["region"]["lat_min"] == 25
        assert payload["region"]["lat_max"] == 65
        assert payload["output"]["width"] == 1920
        assert "data" in payload["data"]["primary"]
        # tension_arc spec round-trips through the payload (RFC-011)
        assert payload["recipe"]["tension_arc"]["preset"] == "classic"
        assert payload["recipe"]["tension_arc"]["peak_position"] == 0.65
        assert payload["recipe"]["tension_arc"]["pin_key_moment"] is True

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


class TestBuildOnePayloadTask:
    """Tests for the per-recipe build_one_payload subtask."""

    def test_builds_payload_for_valid_recipe(self, tmp_data_dir: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            pytest.skip("fixture not generated")

        processed = tmp_data_dir / "data" / "processed" / "oisst"
        _process_oisst(nc_path, processed, "2026-01-15")

        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        shutil.copy(FIXTURES_DIR / "recipes" / "test-field.yaml", recipes / "test-field.yaml")

        result = build_one_payload.fn(
            recipes / "test-field.yaml", tmp_data_dir / "data", tmp_data_dir / "renders"
        )

        assert result is not None
        assert result.exists()
        payload = json.loads(result.read_text())
        assert payload["recipe"]["id"] == "test-field"

    def test_returns_none_for_invalid_recipe(self, tmp_data_dir: Path):
        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        (recipes / "bad.yaml").write_text("name: BAD NAME\n")

        result = build_one_payload.fn(
            recipes / "bad.yaml", tmp_data_dir / "data", tmp_data_dir / "renders"
        )
        assert result is None

    def test_returns_none_when_no_processed_data(self, tmp_data_dir: Path):
        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        shutil.copy(FIXTURES_DIR / "recipes" / "test-field.yaml", recipes / "test-field.yaml")

        result = build_one_payload.fn(
            recipes / "test-field.yaml", tmp_data_dir / "data", tmp_data_dir / "renders"
        )
        assert result is None

    def test_returns_none_when_render_exists(self, tmp_data_dir: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            pytest.skip("fixture not generated")

        processed = tmp_data_dir / "data" / "processed" / "oisst"
        _process_oisst(nc_path, processed, "2026-01-15")

        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        shutil.copy(FIXTURES_DIR / "recipes" / "test-field.yaml", recipes / "test-field.yaml")

        # Pre-create the render
        render_dir = tmp_data_dir / "renders" / "test-field"
        render_dir.mkdir(parents=True)
        (render_dir / "2026-01-15.png").write_bytes(b"fake")

        result = build_one_payload.fn(
            recipes / "test-field.yaml", tmp_data_dir / "data", tmp_data_dir / "renders"
        )
        assert result is None

    def test_with_explicit_date(self, tmp_data_dir: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            pytest.skip("fixture not generated")

        processed = tmp_data_dir / "data" / "processed" / "oisst"
        _process_oisst(nc_path, processed, "2026-01-15")

        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        shutil.copy(FIXTURES_DIR / "recipes" / "test-field.yaml", recipes / "test-field.yaml")

        result = build_one_payload.fn(
            recipes / "test-field.yaml",
            tmp_data_dir / "data",
            tmp_data_dir / "renders",
            date="2026-01-15",
        )
        assert result is not None
        assert "2026-01-15" in result.name
