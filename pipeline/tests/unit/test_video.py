"""Tests for video assembly."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from oceancanvas.video import _build_arc_chain, _build_filters, assemble_video, get_video_info


class TestGetVideoInfo:
    def test_returns_frame_count(self, tmp_path: Path):
        recipe_dir = tmp_path / "test-recipe"
        recipe_dir.mkdir()
        (recipe_dir / "2025-01-01.png").write_bytes(b"png")
        (recipe_dir / "2025-02-01.png").write_bytes(b"png")
        (recipe_dir / "2025-03-01.png").write_bytes(b"png")

        info = get_video_info("test-recipe", tmp_path)
        assert info["frames"] == 3
        assert info["first"] == "2025-01-01"
        assert info["last"] == "2025-03-01"

    def test_excludes_latest(self, tmp_path: Path):
        recipe_dir = tmp_path / "test-recipe"
        recipe_dir.mkdir()
        (recipe_dir / "2025-01-01.png").write_bytes(b"png")
        (recipe_dir / "latest.png").write_bytes(b"png")

        info = get_video_info("test-recipe", tmp_path)
        assert info["frames"] == 1

    def test_missing_recipe(self, tmp_path: Path):
        info = get_video_info("nonexistent", tmp_path)
        assert info["frames"] == 0

    def test_empty_directory(self, tmp_path: Path):
        (tmp_path / "empty-recipe").mkdir()
        info = get_video_info("empty-recipe", tmp_path)
        assert info["frames"] == 0


class TestBuildFilters:
    def test_no_overlays_returns_null(self):
        assert _build_filters(False, False, []) == "null"

    def test_date_overlay(self):
        result = _build_filters(True, False, [])
        assert "drawtext" in result

    def test_attribution_overlay(self):
        result = _build_filters(False, True, [])
        assert "OceanCanvas" in result

    def test_arc_chain_composes_before_overlays(self):
        arc_chain = "sendcmd=c='0.0 eq saturation 1.0;',eq=saturation=1.0,vignette=angle=PI/5"
        result = _build_filters(True, False, [], arc_chain)
        assert result.startswith("sendcmd=")
        assert "drawtext" in result


class TestBuildArcChain:
    def test_empty_arc_returns_empty_string(self):
        assert _build_arc_chain([], 30) == ""
        assert _build_arc_chain([0.5, 0.5], 0) == ""

    def test_emits_sendcmd_with_eq_and_vignette(self):
        arc = [0.0, 0.5, 1.0, 0.5, 0.0]
        chain = _build_arc_chain(arc, 4.0)
        assert chain.startswith("sendcmd=")
        assert "eq saturation" in chain
        assert "vignette angle" in chain
        assert chain.endswith("vignette=angle=PI/5")

    def test_keypoint_count_tracks_duration(self):
        arc = [0.0] * 60
        chain = _build_arc_chain(arc, 30.0)
        # ceil(30) + 1 = 31 keypoints
        assert chain.count(" eq saturation") == 31

    def test_saturation_drops_at_peak(self):
        # Arc with single peak — saturation should be lower at peak frame
        arc = [0.0, 0.0, 1.0, 0.0, 0.0]
        chain = _build_arc_chain(arc, 4.0)
        # Find the peak keypoint (t=2.00) — saturation should be 1.0 - 0.35 = 0.65
        assert "0.6500" in chain


class TestAssembleVideo:
    def test_raises_on_missing_dir(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError):
            assemble_video("nonexistent", tmp_path, tmp_path / "out.mp4")

    def test_raises_on_empty_dir(self, tmp_path: Path):
        (tmp_path / "empty").mkdir()
        with pytest.raises(FileNotFoundError):
            assemble_video("empty", tmp_path, tmp_path / "out.mp4")

    def test_assembles_with_mocked_ffmpeg(self, tmp_path: Path):
        recipe_dir = tmp_path / "test"
        recipe_dir.mkdir()
        # Create tiny valid PNGs
        for i in range(3):
            (recipe_dir / f"2025-0{i+1}-01.png").write_bytes(
                b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
            )
        out = tmp_path / "out.mp4"

        mock_result = MagicMock()
        mock_result.returncode = 0

        def fake_run(*args, **kwargs):
            out.write_bytes(b"fake mp4")
            return mock_result

        with patch("oceancanvas.video.subprocess.run", side_effect=fake_run):
            result = assemble_video(
                "test", tmp_path, out,
                overlay_date=False, overlay_attribution=False,
                audio_params=None,
            )

        assert result == out
        assert out.exists()
