"""Generate synthetic test fixtures matching real data formats.

Run once: cd pipeline && uv run python tests/fixtures/create_fixtures.py
"""

from pathlib import Path

import numpy as np
import xarray as xr

FIXTURES_DIR = Path(__file__).parent


def create_oisst_fixture(date: str = "2026-01-15") -> None:
    """Create a 10x10 OISST-shaped NetCDF with known values."""
    lat = np.linspace(25.0, 65.0, 10, dtype=np.float32)
    lon = np.linspace(-80.0, 0.0, 10, dtype=np.float32)
    time = np.array([np.datetime64(f"{date}T12:00:00")])
    zlev = np.array([0.0], dtype=np.float32)

    # SST gradient: 10°C at north, 25°C at south
    sst_values = np.linspace(25.0, 10.0, 10).reshape(1, 1, 10, 1) * np.ones((1, 1, 1, 10))
    sst = sst_values.astype(np.float32)

    ds = xr.Dataset(
        {"sst": (["time", "zlev", "latitude", "longitude"], sst)},
        coords={
            "time": time,
            "zlev": zlev,
            "latitude": lat,
            "longitude": lon,
        },
    )
    ds["sst"].attrs["units"] = "degC"
    ds["sst"].attrs["long_name"] = "Daily Optimum Interpolation Sea Surface Temperature"

    out = FIXTURES_DIR / "oisst" / f"{date}.nc"
    out.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(out)
    print(f"Created {out} ({out.stat().st_size} bytes)")


def create_oisst_fixture_next_day() -> None:
    """Second day, values shifted +0.1°C for testing multi-day."""
    create_oisst_fixture("2026-01-16")


if __name__ == "__main__":
    create_oisst_fixture("2026-01-15")
    create_oisst_fixture("2026-01-16")
    print("Done.")
