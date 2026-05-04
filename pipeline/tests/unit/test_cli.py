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


class TestExportVideoArcForwarding:
    """RFC-011 / ADR-028: export-video must read tension_arc from the recipe,
    expand it once, and forward both the arc array and the Record Moment hold
    params to assemble_video."""

    def _setup_arc_recipe(self, cli_env):
        """Mutate the cli_env recipe to include a tension_arc block + a time-series."""
        recipe_path = cli_env / "recipes" / "test-recipe.yaml"
        text = recipe_path.read_text()
        text += (
            "\ntension_arc:\n"
            "  preset: classic\n"
            "  peak_position: 0.5\n"
            "  peak_height: 1.0\n"
            "  release_steepness: 0.7\n"
            "  pin_key_moment: true\n"
            "audio:\n"
            "  drone_waveform: triangle\n"
            "  drone_glide: 0.5\n"
            "  pulse_sensitivity: 0.4\n"
            "  presence: 0.7\n"
            "  accent_style: chime\n"
            "  texture_density: 0.4\n"
        )
        recipe_path.write_text(text)

        # Create a synthetic time-series so export-video has data values
        series = [
            {"date": f"2026-01-{i:02d}", "mean": 15 + i * 0.5}
            for i in range(15, 20)
        ]
        series_path = cli_env / "data" / "processed" / "oisst" / "sst-monthly-series.json"
        series_path.write_text(json.dumps(series))

        # Add render PNGs to match those dates
        render_dir = cli_env / "renders" / "test-recipe"
        for i in range(15, 20):
            (render_dir / f"2026-01-{i:02d}.png").write_bytes(
                b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
            )
        # Update manifest
        manifest_path = cli_env / "renders" / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["recipes"]["test-recipe"]["dates"] = [
            f"2026-01-{i:02d}" for i in range(15, 20)
        ]
        manifest_path.write_text(json.dumps(manifest))

    def test_arc_and_hold_reach_assemble_video(self, cli_env, tmp_path):
        """End-to-end: export-video reads tension_arc + computes hold + forwards
        all of (audio_params, audio_values, tension_arc, hold_at_frame,
        hold_duration_sec) to assemble_video as a single coherent call."""
        self._setup_arc_recipe(cli_env)

        captured: dict = {}

        def fake_assemble(*args, **kwargs):
            captured.update(kwargs)
            out_path = args[2] if len(args) > 2 else kwargs.get("output_path")
            out_path.write_bytes(b"fake mp4")
            return out_path

        out = tmp_path / "out.mp4"
        with patch("oceancanvas.video.assemble_video", side_effect=fake_assemble):
            result = runner.invoke(
                app,
                ["export-video", "--recipe", "test-recipe", "--fps", "12",
                 "--output", str(out)],
            )

        assert result.exit_code == 0, result.output
        assert "Arc:      classic preset" in result.output
        # Tension arc was expanded and forwarded
        arc = captured.get("tension_arc")
        assert arc is not None and len(arc) == 5  # one per series frame
        # Hold params present (arc.pin_key_moment is true; moments may or may
        # not be detected — when present, hold should fire)
        if captured.get("hold_at_frame") is not None:
            assert captured["hold_duration_sec"] == 1.0
        # Audio params hydrated from recipe
        params = captured.get("audio_params")
        assert params is not None
        assert params.drone_waveform == "triangle"
        assert params.accent_style == "chime"

    def test_silent_flag_disables_arc(self, cli_env, tmp_path):
        """--silent must skip arc, audio_params, hold — back to v0.4.0-baseline path."""
        self._setup_arc_recipe(cli_env)
        captured: dict = {}

        def fake_assemble(*args, **kwargs):
            captured.update(kwargs)
            out_path = args[2] if len(args) > 2 else kwargs.get("output_path")
            out_path.write_bytes(b"fake mp4")
            return out_path

        out = tmp_path / "out.mp4"
        with patch("oceancanvas.video.assemble_video", side_effect=fake_assemble):
            result = runner.invoke(
                app,
                ["export-video", "--recipe", "test-recipe", "--silent",
                 "--output", str(out)],
            )

        assert result.exit_code == 0, result.output
        assert captured.get("tension_arc") is None
        assert captured.get("audio_params") is None
        assert captured.get("hold_at_frame") is None
