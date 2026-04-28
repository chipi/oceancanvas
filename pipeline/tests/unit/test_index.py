"""Tests for Task 06 — Index."""

import json
import shutil
from pathlib import Path

from oceancanvas.tasks.index import _cleanup_payloads, _scan_renders, index

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def _create_fake_renders(renders_dir: Path) -> None:
    """Create a fake renders directory with two recipes, multiple dates."""
    for recipe, dates in [
        ("north-atlantic-sst", ["2026-01-15", "2026-01-16", "2026-01-17"]),
        ("gulf-stream-thermal", ["2026-01-15", "2026-01-16"]),
    ]:
        recipe_dir = renders_dir / recipe
        recipe_dir.mkdir(parents=True)
        for date in dates:
            (recipe_dir / f"{date}.png").write_bytes(b"\x89PNG fake")


class TestScanRenders:
    def test_finds_recipes_and_dates(self, tmp_path: Path):
        _create_fake_renders(tmp_path)
        recipes = _scan_renders(tmp_path)

        assert len(recipes) == 2
        assert recipes["north-atlantic-sst"]["dates"] == ["2026-01-15", "2026-01-16", "2026-01-17"]
        assert recipes["north-atlantic-sst"]["latest"] == "2026-01-17"
        assert recipes["north-atlantic-sst"]["count"] == 3
        assert recipes["gulf-stream-thermal"]["count"] == 2

    def test_returns_empty_for_missing_dir(self, tmp_path: Path):
        assert _scan_renders(tmp_path / "nonexistent") == {}

    def test_skips_empty_recipe_dirs(self, tmp_path: Path):
        (tmp_path / "empty-recipe").mkdir()
        assert _scan_renders(tmp_path) == {}

    def test_ignores_non_png_files(self, tmp_path: Path):
        recipe_dir = tmp_path / "test-recipe"
        recipe_dir.mkdir()
        (recipe_dir / "2026-01-15.png").write_bytes(b"\x89PNG fake")
        (recipe_dir / "notes.txt").write_text("not a render")
        recipes = _scan_renders(tmp_path)
        assert recipes["test-recipe"]["count"] == 1


class TestCleanupPayloads:
    def test_removes_payload_files(self, tmp_path: Path):
        payloads = tmp_path / "payloads"
        payloads.mkdir()
        (payloads / "recipe1_2026-01-15.json").write_text("{}")
        (payloads / "recipe2_2026-01-15.json").write_text("{}")

        removed = _cleanup_payloads(tmp_path)
        assert removed == 2
        assert list(payloads.glob("*.json")) == []

    def test_noop_when_no_payloads_dir(self, tmp_path: Path):
        assert _cleanup_payloads(tmp_path) == 0


class TestIndex:
    def test_builds_manifest(self, tmp_data_dir: Path):
        renders = tmp_data_dir / "renders"
        _create_fake_renders(renders)

        # Copy a recipe so metadata enrichment works
        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        recipe_fixture = FIXTURES_DIR / "recipes" / "test-field.yaml"
        if recipe_fixture.exists():
            dest = recipes / "north-atlantic-sst.yaml"
            shutil.copy(recipe_fixture, dest)
            # Patch the name to match
            content = dest.read_text().replace("name: test-field", "name: north-atlantic-sst")
            dest.write_text(content)

        result = index.fn(tmp_data_dir / "data", recipes, renders)

        assert result.name == "manifest.json"
        assert result.exists()

        manifest = json.loads(result.read_text())
        assert manifest["recipe_count"] == 2
        assert "north-atlantic-sst" in manifest["recipes"]
        assert manifest["recipes"]["north-atlantic-sst"]["latest"] == "2026-01-17"
        assert "generated_at" in manifest

    def test_enriches_with_recipe_metadata(self, tmp_data_dir: Path):
        renders = tmp_data_dir / "renders"
        recipe_dir = renders / "north-atlantic-sst"
        recipe_dir.mkdir(parents=True)
        (recipe_dir / "2026-01-15.png").write_bytes(b"\x89PNG")

        recipes = tmp_data_dir / "recipes"
        recipes.mkdir(exist_ok=True)
        recipe_content = (
            "name: north-atlantic-sst\nregion:\n  lat: [25, 65]\n  lon: [-80, 0]\n"
            "sources:\n  primary: oisst\nschedule: daily\n"
            "render:\n  type: field\n  seed: 42\n"
        )
        (recipes / "north-atlantic-sst.yaml").write_text(recipe_content)

        index.fn(tmp_data_dir / "data", recipes, renders)

        manifest = json.loads((renders / "manifest.json").read_text())
        entry = manifest["recipes"]["north-atlantic-sst"]
        assert entry["render_type"] == "field"
        assert entry["source"] == "oisst"

    def test_cleans_up_payloads(self, tmp_data_dir: Path):
        renders = tmp_data_dir / "renders"
        renders.mkdir(exist_ok=True)

        payloads = tmp_data_dir / "data" / "payloads"
        payloads.mkdir(parents=True)
        (payloads / "recipe_2026-01-15.json").write_text("{}")

        index.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", renders)

        assert list(payloads.glob("*.json")) == []

    def test_empty_renders(self, tmp_data_dir: Path):
        renders = tmp_data_dir / "renders"
        renders.mkdir(exist_ok=True)

        result = index.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", renders)

        manifest = json.loads(result.read_text())
        assert manifest["recipe_count"] == 0
        assert manifest["recipes"] == {}
