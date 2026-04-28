"""Integration test — hits real ERDDAP. Marked slow, skipped in CI."""

import pytest

from oceancanvas.tasks.discover import _oisst_latest_date
from oceancanvas.tasks.fetch import _fetch_oisst

pytestmark = pytest.mark.slow


def test_discover_returns_valid_date():
    """Verify ERDDAP returns a plausible date string."""
    date = _oisst_latest_date()
    assert len(date) == 10  # YYYY-MM-DD
    assert date.startswith("20")
    year = int(date[:4])
    assert 2020 <= year <= 2030


def test_fetch_downloads_valid_netcdf(tmp_path):
    """Download a small OISST slice and verify it's a valid NetCDF."""
    import xarray as xr

    date = _oisst_latest_date()
    output = tmp_path / f"{date}.nc"
    _fetch_oisst(date, output)

    assert output.exists()
    assert output.stat().st_size > 1000  # sanity — NetCDF is never tiny

    ds = xr.open_dataset(output)
    assert "sst" in ds.data_vars
    assert ds["sst"].shape[0] == 1  # one time step
    ds.close()
