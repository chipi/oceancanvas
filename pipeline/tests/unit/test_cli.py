"""Tests for the oceancanvas CLI."""

import json
import os
from unittest.mock import patch

import pytest
import yaml
from typer.testing import CliRunner

from oceancanvas.cli import app

runner = CliRunner()


@pytest.fixture()
def cli_env(tmp_path):
    """Set up a minimal filesystem for CLI tests."""
    data_dir = tmp_path / "data"
    recipes_dir = tmp_path / "recipes"
    renders_dir = tmp_path / "renders"
    data_dir.mkdir()
    recipes_dir.mkdir()
    renders_dir.mkdir()

    # Create a recipe
    recipe = {
        "name": "test-recipe",
        "created": "2026-01-01",
        "author": "test",
        "region": {"lat": [25, 65], "lon": [-80, 0]},
        "sources": {"primary": "oisst"},
        "schedule": "daily",
        "render": {"type": "field", "seed": 42},
    }
    (recipes_dir / "test-recipe.yaml").write_text(yaml.dump(recipe))

    # Create a render
    render_dir = renders_dir / "test-recipe"
    render_dir.mkdir()
    (render_dir / "2026-01-15.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)

    # Create manifest
    manifest = {
        "generated_at": "2026-01-15T06:00:00Z",
        "recipe_count": 1,
        "recipes": {
            "test-recipe": {
                "name": "test-recipe",
                "render_type": "field",
                "source": "oisst",
                "dates": ["2026-01-15"],
                "latest": "2026-01-15",
                "count": 1,
            }
        },
    }
    (renders_dir / "manifest.json").write_text(json.dumps(manifest))

    # Create processed data
    processed_dir = data_dir / "processed" / "oisst"
    processed_dir.mkdir(parents=True)
    (processed_dir / "2026-01-15.json").write_text("{}")

    with patch.dict(os.environ, {
        "DATA_DIR": str(data_dir),
        "RECIPES_DIR": str(recipes_dir),
        "RENDERS_DIR": str(renders_dir),
    }):
        # Reload module-level constants
        import oceancanvas.cli as cli_mod
        cli_mod.DATA_DIR = data_dir
        cli_mod.RECIPES_DIR = recipes_dir
        cli_mod.RENDERS_DIR = renders_dir
        yield tmp_path


class TestStatus:
    def test_status_shows_table(self, cli_env):
        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "test-recipe" in result.output
        assert "field" in result.output

    def test_status_recipe_detail(self, cli_env):
        result = runner.invoke(app, ["status", "--recipe", "test-recipe"])
        assert result.exit_code == 0
        assert "test-recipe" in result.output
        assert "field" in result.output

    def test_status_unknown_recipe(self, cli_env):
        result = runner.invoke(app, ["status", "--recipe", "nonexistent"])
        assert result.exit_code == 1

    def test_status_no_manifest(self, cli_env):
        (cli_env / "renders" / "manifest.json").unlink()
        result = runner.invoke(app, ["status"])
        assert result.exit_code == 1


class TestRecipesList:
    def test_lists_recipes(self, cli_env):
        result = runner.invoke(app, ["recipes", "list"])
        assert result.exit_code == 0
        assert "test-recipe" in result.output
        assert "field" in result.output
        assert "oisst" in result.output


class TestRecipesValidate:
    def test_validates_good_recipe(self, cli_env):
        result = runner.invoke(app, ["recipes", "validate", "test-recipe"])
        assert result.exit_code == 0
        assert "4/4" in result.output

    def test_validates_missing_recipe(self, cli_env):
        result = runner.invoke(app, ["recipes", "validate", "nonexistent"])
        assert result.exit_code == 1


class TestIndexRebuild:
    def test_rebuilds_manifest(self, cli_env):
        result = runner.invoke(app, ["index"])
        assert result.exit_code == 0
        assert "Manifest rebuilt" in result.output

        # Verify manifest was written
        manifest = json.loads((cli_env / "renders" / "manifest.json").read_text())
        assert "test-recipe" in manifest["recipes"]


class TestRunDryRun:
    def test_dry_run(self, cli_env):
        result = runner.invoke(app, ["run", "--dry-run"])
        assert result.exit_code == 0
        assert "test-recipe" in result.output
        assert "Dry run" in result.output
