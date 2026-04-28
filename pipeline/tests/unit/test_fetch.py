"""Tests for Task 02 — Fetch."""

from pathlib import Path
from unittest.mock import MagicMock, patch

from oceancanvas.tasks.fetch import _build_oisst_url, _fetch_oisst, fetch


class TestBuildOisstUrl:
    def test_url_contains_date_and_region(self):
        url = _build_oisst_url("2026-04-13")
        assert "2026-04-13T12:00:00Z" in url
        assert "sst" in url
        assert "(20.0)" in url  # lat_min
        assert "(75.0)" in url  # lat_max


class TestFetchOisst:
    def test_downloads_to_output_path(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-04-13.nc"
        fake_content = b"fake netcdf content"

        mock_resp = MagicMock()
        mock_resp.raise_for_status = lambda: None
        mock_resp.iter_content.return_value = [fake_content]

        with patch("oceancanvas.tasks.fetch.requests.get", return_value=mock_resp):
            _fetch_oisst("2026-04-13", output)

        assert output.exists()
        assert output.read_bytes() == fake_content

    def test_uses_atomic_write(self, tmp_path: Path):
        """Verify .tmp is used during download (no partial files on failure)."""
        output = tmp_path / "oisst" / "2026-04-13.nc"

        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("HTTP 500")

        with patch("oceancanvas.tasks.fetch.requests.get", return_value=mock_resp):
            try:
                _fetch_oisst("2026-04-13", output)
            except Exception:
                pass

        assert not output.exists()
        assert not output.with_suffix(".tmp").exists()


class TestFetch:
    def test_fetches_when_date_provided(self, tmp_data_dir: Path):
        fake_content = b"fake netcdf"
        mock_resp = MagicMock()
        mock_resp.raise_for_status = lambda: None
        mock_resp.iter_content.return_value = [fake_content]

        with patch("oceancanvas.tasks.fetch.requests.get", return_value=mock_resp):
            result = fetch.fn(
                tmp_data_dir / "data",
                tmp_data_dir / "recipes",
                tmp_data_dir / "renders",
                dates_to_fetch={"oisst": "2026-04-13"},
            )

        assert "oisst" in result
        assert result["oisst"].exists()

    def test_skips_existing_file(self, tmp_data_dir: Path):
        oisst_dir = tmp_data_dir / "data" / "sources" / "oisst"
        oisst_dir.mkdir(parents=True)
        existing = oisst_dir / "2026-04-13.nc"
        existing.write_bytes(b"already here")

        result = fetch.fn(
            tmp_data_dir / "data",
            tmp_data_dir / "recipes",
            tmp_data_dir / "renders",
            dates_to_fetch={"oisst": "2026-04-13"},
        )

        assert result["oisst"] == existing

    def test_returns_empty_when_nothing_to_fetch(self, tmp_data_dir: Path):
        result = fetch.fn(
            tmp_data_dir / "data",
            tmp_data_dir / "recipes",
            tmp_data_dir / "renders",
            dates_to_fetch={},
        )
        assert result == {}

    def test_returns_empty_when_none(self, tmp_data_dir: Path):
        result = fetch.fn(
            tmp_data_dir / "data",
            tmp_data_dir / "recipes",
            tmp_data_dir / "renders",
            dates_to_fetch=None,
        )
        assert result == {}
