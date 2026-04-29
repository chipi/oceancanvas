"""Generate synthetic test fixtures matching real data formats.

Run once: cd pipeline && uv run python tests/fixtures/create_fixtures.py
"""

import json
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


def create_oisst_fixture_with_nan(date: str = "2026-01-17") -> None:
    """Create OISST fixture with NaN land mask (50% missing data)."""
    lat = np.linspace(25.0, 65.0, 10, dtype=np.float32)
    lon = np.linspace(-80.0, 0.0, 10, dtype=np.float32)
    time = np.array([np.datetime64(f"{date}T12:00:00")])
    zlev = np.array([0.0], dtype=np.float32)

    sst_values = np.linspace(25.0, 10.0, 10).reshape(1, 1, 10, 1) * np.ones((1, 1, 1, 10))
    sst = sst_values.astype(np.float32)
    # Set ~50% of cells to NaN (simulating land)
    sst[0, 0, :5, :5] = np.nan

    ds = xr.Dataset(
        {"sst": (["time", "zlev", "latitude", "longitude"], sst)},
        coords={"time": time, "zlev": zlev, "latitude": lat, "longitude": lon},
    )
    ds["sst"].attrs["units"] = "degC"

    out = FIXTURES_DIR / "oisst" / f"{date}.nc"
    out.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(out)
    print(f"Created {out} with NaN mask ({out.stat().st_size} bytes)")


def create_gebco_fixture() -> None:
    """Create a 10x10 GEBCO-shaped bathymetry NetCDF."""
    lat = np.linspace(25.0, 65.0, 10, dtype=np.float64)
    lon = np.linspace(-80.0, 0.0, 10, dtype=np.float64)

    # Depth gradient: -5000m (deep ocean) to 0m (coast)
    elev = np.linspace(-5000.0, 0.0, 10).reshape(10, 1) * np.ones((1, 10))
    elev = elev.astype(np.float32)

    ds = xr.Dataset(
        {"elevation": (["lat", "lon"], elev)},
        coords={"lat": lat, "lon": lon},
    )
    ds["elevation"].attrs["units"] = "m"
    ds["elevation"].attrs["long_name"] = "Elevation relative to sea level"

    out = FIXTURES_DIR / "gebco" / "gebco_subset.nc"
    out.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(out)
    print(f"Created {out} ({out.stat().st_size} bytes)")


def create_argo_fixture(date: str = "2026-01-15") -> None:
    """Create a synthetic Argo index JSON with 5 float positions."""
    profiles = [
        {"lat": 30.5, "lon": -60.2, "date": date, "file": "aoml/1234/D1234_001.nc"},
        {"lat": 35.1, "lon": -45.8, "date": date, "file": "aoml/1235/D1235_001.nc"},
        {"lat": 42.3, "lon": -30.0, "date": date, "file": "aoml/1236/D1236_001.nc"},
        {"lat": 55.7, "lon": -20.5, "date": date, "file": "aoml/1237/D1237_001.nc"},
        {"lat": 60.0, "lon": -10.1, "date": date, "file": "aoml/1238/D1238_001.nc"},
    ]
    out = FIXTURES_DIR / "argo" / f"{date}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(profiles))
    print(f"Created {out} ({len(profiles)} profiles)")


if __name__ == "__main__":
    create_oisst_fixture("2026-01-15")
    create_oisst_fixture("2026-01-16")
    create_oisst_fixture_with_nan("2026-01-17")
    create_gebco_fixture()
    create_argo_fixture("2026-01-15")
    print("Done.")
