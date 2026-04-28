"""Tests for Task 05 — Render."""

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from oceancanvas.tasks.render import PNG_HEADER, _render_one, render

# A minimal valid PNG (1x1 transparent pixel)
FAKE_PNG = PNG_HEADER + b"\x00" * 50


def _make_payload_file(tmp_path: Path, recipe_name: str, date: str) -> Path:
    """Create a minimal payload file."""
    payload = {
        "version": 1,
        "recipe": {"id": recipe_name, "render": {"type": "field", "seed": 42}, "render_date": date},
        "region": {"lat_min": 25, "lat_max": 65, "lon_min": -80, "lon_max": 0},
        "output": {"width": 100, "height": 100},
        "data": {"primary": {"data": [0.0] * 100, "shape": [10, 10]}},
    }
    payloads_dir = tmp_path / "payloads"
    payloads_dir.mkdir(exist_ok=True)
    path = payloads_dir / f"{recipe_name}_{date}.json"
    path.write_text(json.dumps(payload))
    return path


class TestRenderOne:
    def test_writes_png_on_success(self, tmp_path: Path):
        payload_path = _make_payload_file(tmp_path, "test-recipe", "2026-01-15")
        output = tmp_path / "output.png"

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = FAKE_PNG
        mock_result.stderr = b""

        with patch("oceancanvas.tasks.render.subprocess.run", return_value=mock_result):
            _render_one(payload_path, output)

        assert output.exists()
        assert output.read_bytes().startswith(PNG_HEADER)

    def test_raises_on_nonzero_exit(self, tmp_path: Path):
        payload_path = _make_payload_file(tmp_path, "test-recipe", "2026-01-15")
        output = tmp_path / "output.png"

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = b""
        mock_result.stderr = b"Render error: sketch not found"

        with patch("oceancanvas.tasks.render.subprocess.run", return_value=mock_result):
            with pytest.raises(RuntimeError, match="Renderer failed"):
                _render_one(payload_path, output)

        assert not output.exists()

    def test_raises_on_invalid_output(self, tmp_path: Path):
        payload_path = _make_payload_file(tmp_path, "test-recipe", "2026-01-15")
        output = tmp_path / "output.png"

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = b"not a png"
        mock_result.stderr = b""

        with patch("oceancanvas.tasks.render.subprocess.run", return_value=mock_result):
            with pytest.raises(RuntimeError, match="not PNG"):
                _render_one(payload_path, output)

    def test_raises_on_timeout(self, tmp_path: Path):
        payload_path = _make_payload_file(tmp_path, "test-recipe", "2026-01-15")
        output = tmp_path / "output.png"

        with patch(
            "oceancanvas.tasks.render.subprocess.run",
            side_effect=subprocess.TimeoutExpired(cmd="node", timeout=120),
        ):
            with pytest.raises(subprocess.TimeoutExpired):
                _render_one(payload_path, output)


class TestRender:
    def test_renders_pending_payloads(self, tmp_data_dir: Path):
        _make_payload_file(tmp_data_dir / "data", "test-recipe", "2026-01-15")

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = FAKE_PNG
        mock_result.stderr = b""

        with patch("oceancanvas.tasks.render.subprocess.run", return_value=mock_result):
            result = render.fn(
                tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders"
            )

        assert len(result) == 1
        assert result[0].name == "2026-01-15.png"
        assert result[0].parent.name == "test-recipe"
        assert result[0].exists()

    def test_handles_hyphenated_recipe_name(self, tmp_data_dir: Path):
        """Recipe names with hyphens like north-atlantic-sst parse correctly."""
        _make_payload_file(tmp_data_dir / "data", "north-atlantic-sst", "2026-01-15")

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = FAKE_PNG
        mock_result.stderr = b""

        with patch("oceancanvas.tasks.render.subprocess.run", return_value=mock_result):
            result = render.fn(
                tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders"
            )

        assert len(result) == 1
        assert result[0].parent.name == "north-atlantic-sst"
        assert result[0].name == "2026-01-15.png"

    def test_skips_existing_renders(self, tmp_data_dir: Path):
        _make_payload_file(tmp_data_dir / "data", "test-recipe", "2026-01-15")

        # Pre-create the render
        render_dir = tmp_data_dir / "renders" / "test-recipe"
        render_dir.mkdir(parents=True)
        (render_dir / "2026-01-15.png").write_bytes(FAKE_PNG)

        with patch("oceancanvas.tasks.render.subprocess.run") as mock_run:
            result = render.fn(
                tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders"
            )

        # Should not have called the subprocess
        mock_run.assert_not_called()
        assert len(result) == 1

    def test_returns_empty_when_no_payloads(self, tmp_data_dir: Path):
        result = render.fn(
            tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders"
        )
        assert result == []

    def test_continues_on_render_failure(self, tmp_data_dir: Path):
        _make_payload_file(tmp_data_dir / "data", "good-recipe", "2026-01-15")
        _make_payload_file(tmp_data_dir / "data", "bad-recipe", "2026-01-15")

        call_count = 0

        def mock_run(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            result = MagicMock()
            if call_count == 1:
                # First call (bad-recipe) fails
                result.returncode = 1
                result.stdout = b""
                result.stderr = b"error"
            else:
                # Second call (good-recipe) succeeds
                result.returncode = 0
                result.stdout = FAKE_PNG
                result.stderr = b""
            return result

        with patch("oceancanvas.tasks.render.subprocess.run", side_effect=mock_run):
            result = render.fn(
                tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders"
            )

        # One succeeded, one failed — should get 1 result
        assert len(result) == 1
