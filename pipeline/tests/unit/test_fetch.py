"""Tests for Task 02 — Fetch."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import requests

from oceancanvas.tasks.fetch import (
    _build_oisst_url,
    _fetch_oisst,
    fetch,
    fetch_historical_oisst,
)


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

    def test_raises_on_http_error(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-04-13.nc"

        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.HTTPError("404 Not Found")

        with patch("oceancanvas.tasks.fetch.requests.get", return_value=mock_resp):
            try:
                _fetch_oisst("2026-04-13", output)
                assert False, "Should have raised HTTPError"
            except requests.HTTPError:
                pass

        assert not output.exists()

    def test_raises_on_timeout(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-04-13.nc"

        with patch("oceancanvas.tasks.fetch.requests.get") as mock_get:
            mock_get.side_effect = requests.Timeout("Connection timed out")
            try:
                _fetch_oisst("2026-04-13", output)
                assert False, "Should have raised Timeout"
            except requests.Timeout:
                pass

        assert not output.exists()


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


class TestFetchOisstRetry:
    """Verify retry + backoff behavior on transient failures."""

    def test_retries_on_timeout(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-01-01.nc"
        call_count = 0

        def mock_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise requests.Timeout("timeout")
            resp = MagicMock()
            resp.raise_for_status = lambda: None
            resp.iter_content.return_value = [b"data"]
            return resp

        with patch("oceancanvas.tasks.fetch.requests.get", side_effect=mock_get):
            with patch("oceancanvas.tasks.fetch.time.sleep"):
                _fetch_oisst("2026-01-01", output, max_retries=3, backoff_base=0.01)

        assert output.exists()
        assert call_count == 3

    def test_gives_up_after_max_retries(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-01-01.nc"

        with patch("oceancanvas.tasks.fetch.requests.get") as mock_get:
            mock_get.side_effect = requests.Timeout("timeout")
            with patch("oceancanvas.tasks.fetch.time.sleep"):
                try:
                    _fetch_oisst("2026-01-01", output, max_retries=2, backoff_base=0.01)
                    assert False, "Should have raised"
                except requests.Timeout:
                    pass

        assert not output.exists()

    def test_retries_on_server_error(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-01-01.nc"
        call_count = 0

        def mock_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            resp = MagicMock()
            if call_count < 2:
                resp.raise_for_status.side_effect = requests.HTTPError(
                    response=MagicMock(status_code=503)
                )
                return resp
            resp.raise_for_status = lambda: None
            resp.iter_content.return_value = [b"data"]
            return resp

        with patch("oceancanvas.tasks.fetch.requests.get", side_effect=mock_get):
            with patch("oceancanvas.tasks.fetch.time.sleep"):
                _fetch_oisst("2026-01-01", output, max_retries=3, backoff_base=0.01)

        assert output.exists()

    def test_no_retry_on_client_error(self, tmp_path: Path):
        output = tmp_path / "oisst" / "2026-01-01.nc"

        mock_resp = MagicMock()
        mock_resp.status_code = 404
        error = requests.HTTPError(response=mock_resp)
        mock_resp.raise_for_status.side_effect = error

        with patch("oceancanvas.tasks.fetch.requests.get", return_value=mock_resp):
            try:
                _fetch_oisst("2026-01-01", output, max_retries=3, backoff_base=0.01)
                assert False, "Should have raised"
            except requests.HTTPError:
                pass


class TestFetchHistoricalOisst:
    def test_fetches_multiple_dates(self, tmp_path: Path):
        data_dir = tmp_path / "data"
        data_dir.mkdir()

        call_dates = []

        def mock_fetch(date, output_path, **kwargs):
            call_dates.append(date)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(b"nc")

        with patch("oceancanvas.tasks.fetch._fetch_oisst", side_effect=mock_fetch):
            with patch("oceancanvas.tasks.fetch.time.sleep"):
                fetched, skipped = fetch_historical_oisst(
                    ["2026-01-01", "2026-02-01"], data_dir, delay=0
                )

        assert fetched == ["2026-01-01", "2026-02-01"]
        assert skipped == []
        assert call_dates == ["2026-01-01", "2026-02-01"]

    def test_skips_existing(self, tmp_path: Path):
        data_dir = tmp_path / "data"
        oisst_dir = data_dir / "sources" / "oisst"
        oisst_dir.mkdir(parents=True)
        (oisst_dir / "2026-01-01.nc").write_bytes(b"existing")

        def mock_fetch(date, output_path, **kwargs):
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(b"nc")

        with patch("oceancanvas.tasks.fetch._fetch_oisst", side_effect=mock_fetch) as mock:
            with patch("oceancanvas.tasks.fetch.time.sleep"):
                fetched, skipped = fetch_historical_oisst(
                    ["2026-01-01", "2026-02-01"], data_dir, delay=0
                )

        # Only 2026-02-01 should be fetched
        assert mock.call_count == 1
        assert skipped == ["2026-01-01"]
        assert fetched == ["2026-02-01"]

    def test_empty_dates_list(self, tmp_path: Path):
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        fetched, skipped = fetch_historical_oisst([], data_dir)
        assert fetched == []
        assert skipped == []
