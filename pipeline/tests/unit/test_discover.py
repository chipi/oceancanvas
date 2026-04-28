"""Tests for Task 01 — Discover."""

from pathlib import Path
from unittest.mock import patch

from oceancanvas.tasks.discover import _oisst_latest_date, discover

MOCK_ERDDAP_RESPONSE = {
    "table": {
        "columnNames": ["Row Type", "Variable Name", "Attribute Name", "Data Type", "Value"],
        "rows": [
            ["attribute", "NC_GLOBAL", "time_coverage_end", "String", "2026-04-13T12:00:00Z"],
            ["attribute", "NC_GLOBAL", "time_coverage_start", "String", "1981-09-01T12:00:00Z"],
        ],
    }
}


class TestOisstLatestDate:
    def test_parses_date_from_erddap_response(self):
        with patch("oceancanvas.tasks.discover.requests.get") as mock_get:
            mock_get.return_value.json.return_value = MOCK_ERDDAP_RESPONSE
            mock_get.return_value.raise_for_status = lambda: None
            result = _oisst_latest_date()
        assert result == "2026-04-13"

    def test_raises_on_missing_time_coverage(self):
        empty_response = {"table": {"rows": []}}
        with patch("oceancanvas.tasks.discover.requests.get") as mock_get:
            mock_get.return_value.json.return_value = empty_response
            mock_get.return_value.raise_for_status = lambda: None
            try:
                _oisst_latest_date()
                assert False, "Should have raised ValueError"
            except ValueError as e:
                assert "time_coverage_end" in str(e)


class TestDiscover:
    def test_returns_date_when_not_fetched(self, tmp_data_dir: Path):
        with patch("oceancanvas.tasks.discover._oisst_latest_date", return_value="2026-04-13"):
            result = discover.fn(
                tmp_data_dir / "data",
                tmp_data_dir / "recipes",
                tmp_data_dir / "renders",
            )
        assert result == {"oisst": "2026-04-13"}

    def test_skips_when_already_fetched(self, tmp_data_dir: Path):
        # Create the file so discover thinks it's already fetched
        oisst_dir = tmp_data_dir / "data" / "sources" / "oisst"
        oisst_dir.mkdir(parents=True)
        (oisst_dir / "2026-04-13.nc").touch()

        with patch("oceancanvas.tasks.discover._oisst_latest_date", return_value="2026-04-13"):
            result = discover.fn(
                tmp_data_dir / "data",
                tmp_data_dir / "recipes",
                tmp_data_dir / "renders",
            )
        assert result == {}
