"""Tests for Task 03 — Process."""

import json
from pathlib import Path

import numpy as np
from PIL import Image

from oceancanvas.tasks.process import _apply_thermal_colormap, _process_oisst, process

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


class TestApplyThermalColormap:
    def test_returns_rgb_array(self):
        data = np.array([[10.0, 20.0], [15.0, 25.0]], dtype=np.float32)
        rgb = _apply_thermal_colormap(data, 10.0, 25.0)
        assert rgb.shape == (2, 2, 3)
        assert rgb.dtype == np.uint8

    def test_nan_pixels_get_canvas_colour(self):
        data = np.array([[np.nan, 15.0]], dtype=np.float32)
        rgb = _apply_thermal_colormap(data, 10.0, 25.0)
        assert list(rgb[0, 0]) == [3, 11, 16]  # canvas #030B10

    def test_min_maps_to_cold_stop(self):
        data = np.array([[10.0]], dtype=np.float32)
        rgb = _apply_thermal_colormap(data, 10.0, 25.0)
        assert list(rgb[0, 0]) == [4, 44, 83]  # domain-sst-cold

    def test_max_maps_to_hot_stop(self):
        data = np.array([[25.0]], dtype=np.float32)
        rgb = _apply_thermal_colormap(data, 10.0, 25.0)
        assert list(rgb[0, 0]) == [121, 31, 31]  # domain-sst-hot

    def test_all_nan_array(self):
        """All-NaN data should produce all canvas-coloured pixels."""
        data = np.array([[np.nan, np.nan], [np.nan, np.nan]], dtype=np.float32)
        rgb = _apply_thermal_colormap(data, 0.0, 1.0)
        for r in range(2):
            for c in range(2):
                assert list(rgb[r, c]) == [3, 11, 16]


class TestProcessOisst:
    def test_produces_three_files(self, tmp_path: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("fixture not generated — run tests/fixtures/create_fixtures.py")

        output = tmp_path / "oisst"
        _process_oisst(nc_path, output, "2026-01-15")

        assert (output / "2026-01-15.json").exists()
        assert (output / "2026-01-15.png").exists()
        assert (output / "2026-01-15.meta.json").exists()

    def test_json_has_correct_shape(self, tmp_path: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("fixture not generated")

        output = tmp_path / "oisst"
        _process_oisst(nc_path, output, "2026-01-15")

        data = json.loads((output / "2026-01-15.json").read_text())
        assert data["shape"] == [10, 10]
        assert len(data["data"]) == 100
        assert data["source_id"] == "oisst"
        assert data["date"] == "2026-01-15"
        assert data["min"] == 10.0
        assert data["max"] == 25.0

    def test_png_is_valid_image(self, tmp_path: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("fixture not generated")

        output = tmp_path / "oisst"
        _process_oisst(nc_path, output, "2026-01-15")

        img = Image.open(output / "2026-01-15.png")
        assert img.size == (10, 10)
        assert img.mode == "RGB"

    def test_meta_has_correct_stats(self, tmp_path: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("fixture not generated")

        output = tmp_path / "oisst"
        _process_oisst(nc_path, output, "2026-01-15")

        meta = json.loads((output / "2026-01-15.meta.json").read_text())
        assert meta["source_id"] == "oisst"
        assert meta["min"] == 10.0
        assert meta["max"] == 25.0
        assert meta["nan_pct"] == 0.0
        assert meta["shape"] == [10, 10]


class TestProcessOisstWithNaN:
    def test_nan_fixture_produces_valid_output(self, tmp_path: Path):
        """50% NaN land mask fixture should produce valid output with correct nan_pct."""
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-17.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("NaN fixture not generated")

        output = tmp_path / "oisst"
        _process_oisst(nc_path, output, "2026-01-17")

        meta = json.loads((output / "2026-01-17.meta.json").read_text())
        assert meta["nan_pct"] > 0, "Should have non-zero NaN percentage"
        assert meta["nan_pct"] < 100, "Should not be all NaN"

        data = json.loads((output / "2026-01-17.json").read_text())
        nan_count = sum(1 for v in data["data"] if v == -999.0)
        assert nan_count > 0, "Should have -999.0 NaN placeholders in data"


class TestProcessOisstErrors:
    def test_handles_truncated_file(self, tmp_path: Path):
        """A truncated/corrupt file should raise, not hang."""
        bad_nc = tmp_path / "bad.nc"
        bad_nc.write_bytes(b"not a netcdf file at all")
        output = tmp_path / "output"

        try:
            _process_oisst(bad_nc, output, "2026-01-15")
            assert False, "Should have raised an exception"
        except Exception:
            pass

        # No partial output should be left
        assert not (output / "2026-01-15.json").exists()

    def test_handles_missing_sst_variable(self, tmp_path: Path):
        """A NetCDF without 'sst' variable should raise KeyError."""
        import xarray as xr

        ds = xr.Dataset({"temperature": (["time", "lat"], [[1.0, 2.0]])})
        nc_path = tmp_path / "no_sst.nc"
        ds.to_netcdf(nc_path)
        output = tmp_path / "output"

        try:
            _process_oisst(nc_path, output, "2026-01-15")
            assert False, "Should have raised KeyError"
        except KeyError:
            pass


class TestProcess:
    def test_processes_oisst_files(self, tmp_data_dir: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("fixture not generated")

        # Copy fixture to source dir
        src_dir = tmp_data_dir / "data" / "sources" / "oisst"
        src_dir.mkdir(parents=True)
        import shutil

        shutil.copy(nc_path, src_dir / "2026-01-15.nc")

        process.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders")

        processed = tmp_data_dir / "data" / "processed" / "oisst"
        assert (processed / "2026-01-15.json").exists()
        assert (processed / "2026-01-15.png").exists()
        assert (processed / "2026-01-15.meta.json").exists()

    def test_skips_already_processed(self, tmp_data_dir: Path):
        nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
        if not nc_path.exists():
            import pytest

            pytest.skip("fixture not generated")

        src_dir = tmp_data_dir / "data" / "sources" / "oisst"
        src_dir.mkdir(parents=True)
        import shutil

        shutil.copy(nc_path, src_dir / "2026-01-15.nc")

        # Pre-create the output so it's "already processed"
        out_dir = tmp_data_dir / "data" / "processed" / "oisst"
        out_dir.mkdir(parents=True)
        (out_dir / "2026-01-15.json").write_text("{}")

        process.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders")

        # Should not have overwritten with real data
        assert json.loads((out_dir / "2026-01-15.json").read_text()) == {}

    def test_noop_when_no_source_data(self, tmp_data_dir: Path):
        """No crash when data/sources/oisst doesn't exist."""
        process.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders")

    def test_continues_on_corrupt_file(self, tmp_data_dir: Path):
        """A corrupt .nc file should be logged and skipped, not crash the task."""
        src_dir = tmp_data_dir / "data" / "sources" / "oisst"
        src_dir.mkdir(parents=True)
        (src_dir / "2026-01-15.nc").write_bytes(b"corrupt data")

        # Should not raise — error is logged and skipped
        process.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders")

        # No output should have been created
        processed = tmp_data_dir / "data" / "processed" / "oisst"
        assert not (processed / "2026-01-15.json").exists()
