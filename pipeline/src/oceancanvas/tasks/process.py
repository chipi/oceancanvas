"""Task 03 — Process.

Opens raw OISST NetCDF with xarray, squeezes the zlev dimension,
computes statistics, and exports three files per date to data/processed/:

  {date}.json     — flat float32 array + shape + min/max + lat/lon range
  {date}.png      — colourised PNG tile (thermal colormap)
  {date}.meta.json — statistics sidecar
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import numpy as np
import xarray as xr
from PIL import Image
from prefect import task

from oceancanvas.constants import NAN_VALUE
from oceancanvas.io import atomic_write_bytes, atomic_write_text
from oceancanvas.log import get_logger

# Thermal colormap stops — navy → teal → green → amber → coral → dark red
# Matches domain-sst-* tokens from UXS-001
THERMAL_STOPS = np.array(
    [
        [4, 44, 83],  # domain-sst-cold  #042C53
        [15, 110, 86],  # domain-sst-mid-low  #0F6E56
        [99, 153, 34],  # domain-sst-mid  #639922
        [186, 117, 23],  # domain-sst-mid-high  #BA7517
        [216, 90, 48],  # domain-sst-warm  #D85A30
        [121, 31, 31],  # domain-sst-hot  #791F1F
    ],
    dtype=np.uint8,
)


def _apply_thermal_colormap(data: np.ndarray, vmin: float, vmax: float) -> np.ndarray:
    """Map float values to RGB using the thermal colormap. Returns (H, W, 3) uint8."""
    normalised = np.clip((data - vmin) / (vmax - vmin), 0, 1)
    n_stops = len(THERMAL_STOPS)
    indices = normalised * (n_stops - 1)
    lower = np.floor(indices).astype(int)
    upper = np.minimum(lower + 1, n_stops - 1)
    frac = (indices - lower)[..., np.newaxis]

    rgb = (1 - frac) * THERMAL_STOPS[lower] + frac * THERMAL_STOPS[upper]
    # NaN pixels → canvas background colour
    nan_mask = np.isnan(data)
    rgb[nan_mask] = [3, 11, 16]  # canvas #030B10
    return rgb.astype(np.uint8)


def _process_oisst(nc_path: Path, output_dir: Path, date: str) -> None:
    """Process one OISST NetCDF into .json + .png + .meta.json."""
    ds = xr.open_dataset(nc_path)
    try:
        sst = ds["sst"].isel(time=0, zlev=0)  # squeeze to 2D (lat, lon)

        values = sst.values.astype(np.float32)
        lat = sst.latitude.values
        lon = sst.longitude.values

        nan_count = int(np.isnan(values).sum())
        total = values.size
        valid = values[~np.isnan(values)]

        vmin = float(valid.min()) if valid.size > 0 else 0.0
        vmax = float(valid.max()) if valid.size > 0 else 0.0
        vmean = float(valid.mean()) if valid.size > 0 else 0.0

        output_dir.mkdir(parents=True, exist_ok=True)

        # .json — flat float32 array with NaN as NAN_VALUE
        json_data = np.where(np.isnan(values), NAN_VALUE, values)
        payload = {
            "data": json_data.flatten().tolist(),
            "shape": list(values.shape),
            "min": round(vmin, 4),
            "max": round(vmax, 4),
            "lat_range": [round(float(lat.min()), 4), round(float(lat.max()), 4)],
            "lon_range": [round(float(lon.min()), 4), round(float(lon.max()), 4)],
            "source_id": "oisst",
            "date": date,
        }
        json_path = output_dir / f"{date}.json"
        atomic_write_text(json_path, json.dumps(payload))

        # .png — colourised tile
        rgb = _apply_thermal_colormap(values, vmin, vmax)
        img = Image.fromarray(np.flipud(rgb))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_path = output_dir / f"{date}.png"
        atomic_write_bytes(png_path, buf.getvalue())

        # .meta.json — statistics sidecar
        meta = {
            "date": date,
            "source_id": "oisst",
            "shape": list(values.shape),
            "min": round(vmin, 4),
            "max": round(vmax, 4),
            "mean": round(vmean, 4),
            "nan_pct": round(nan_count / total * 100, 2) if total > 0 else 0.0,
            "lat_range": payload["lat_range"],
            "lon_range": payload["lon_range"],
        }
        meta_path = output_dir / f"{date}.meta.json"
        atomic_write_text(meta_path, json.dumps(meta, indent=2))
    finally:
        ds.close()


def _process_gebco(nc_path: Path, output_dir: Path) -> None:
    """Process static GEBCO bathymetry into .json + .png + .meta.json."""
    ds = xr.open_dataset(nc_path)
    try:
        # GEBCO uses 'elevation' variable, 2D (lat, lon)
        elev = ds["elevation"]

        values = elev.values.astype(np.float32)
        lat = elev.lat.values if "lat" in elev.dims else elev.latitude.values
        lon = elev.lon.values if "lon" in elev.dims else elev.longitude.values

        nan_count = int(np.isnan(values).sum())
        total = values.size
        valid = values[~np.isnan(values)]

        vmin = float(valid.min()) if valid.size > 0 else 0.0
        vmax = float(valid.max()) if valid.size > 0 else 0.0
        vmean = float(valid.mean()) if valid.size > 0 else 0.0

        output_dir.mkdir(parents=True, exist_ok=True)

        # .json
        json_data = np.where(np.isnan(values), NAN_VALUE, values)
        payload = {
            "data": json_data.flatten().tolist(),
            "shape": list(values.shape),
            "min": round(vmin, 4),
            "max": round(vmax, 4),
            "lat_range": [round(float(lat.min()), 4), round(float(lat.max()), 4)],
            "lon_range": [round(float(lon.min()), 4), round(float(lon.max()), 4)],
            "source_id": "gebco",
            "date": "static",
        }
        atomic_write_text(output_dir / "static.json", json.dumps(payload))

        # .png — blue depth colormap (deep navy → light blue)
        depth_stops = np.array(
            [[2, 10, 30], [4, 44, 83], [15, 80, 120], [40, 120, 160], [100, 180, 200]],
            dtype=np.uint8,
        )
        if vmax != vmin:
            normalised = np.clip((values - vmin) / (vmax - vmin), 0, 1)
        else:
            normalised = np.full_like(values, 0.5)
        n_stops = len(depth_stops)
        indices = normalised * (n_stops - 1)
        lower = np.floor(indices).astype(int)
        upper = np.minimum(lower + 1, n_stops - 1)
        frac = (indices - lower)[..., np.newaxis]
        rgb = ((1 - frac) * depth_stops[lower] + frac * depth_stops[upper]).astype(np.uint8)
        nan_mask = np.isnan(values)
        rgb[nan_mask] = [3, 11, 16]

        img = Image.fromarray(np.flipud(rgb))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        atomic_write_bytes(output_dir / "static.png", buf.getvalue())

        # .meta.json
        meta = {
            "date": "static",
            "source_id": "gebco",
            "shape": list(values.shape),
            "min": round(vmin, 4),
            "max": round(vmax, 4),
            "mean": round(vmean, 4),
            "nan_pct": round(nan_count / total * 100, 2) if total > 0 else 0.0,
            "lat_range": payload["lat_range"],
            "lon_range": payload["lon_range"],
        }
        atomic_write_text(output_dir / "static.meta.json", json.dumps(meta, indent=2))
    finally:
        ds.close()


@task(name="process")
def process(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Process raw source data into browser-friendly formats."""
    logger = get_logger()
    sources_dir = data_dir / "sources"
    processed_dir = data_dir / "processed"

    # Process OISST (daily)
    oisst_source = sources_dir / "oisst"
    if oisst_source.exists():
        oisst_output = processed_dir / "oisst"
        for nc_file in sorted(oisst_source.glob("*.nc")):
            date = nc_file.stem
            if (oisst_output / f"{date}.json").exists():
                logger.info("OISST %s already processed, skipping", date)
                continue
            logger.info("Processing OISST %s", date)
            try:
                _process_oisst(nc_file, oisst_output, date)
                logger.info("OISST %s → 3 files in %s", date, oisst_output)
            except Exception as e:
                logger.error("Failed to process OISST %s: %s", date, e)

    # Process GEBCO (static, one-time)
    gebco_path = data_dir / "gebco" / "gebco_subset.nc"
    gebco_output = processed_dir / "gebco"
    if gebco_path.exists() and not (gebco_output / "static.json").exists():
        logger.info("Processing GEBCO bathymetry")
        try:
            _process_gebco(gebco_path, gebco_output)
            logger.info("GEBCO → 3 files in %s", gebco_output)
        except Exception as e:
            logger.error("Failed to process GEBCO: %s", e)
    elif not gebco_path.exists():
        logger.info("No GEBCO data found at %s, skipping", gebco_path)

    # Process Argo (daily, point data)
    argo_source = sources_dir / "argo"
    if argo_source.exists():
        from oceancanvas.tasks.argo import process_argo

        argo_output = processed_dir / "argo"
        for json_file in sorted(argo_source.glob("*.json")):
            date = json_file.stem
            if (argo_output / f"{date}.json").exists():
                logger.info("Argo %s already processed, skipping", date)
                continue
            logger.info("Processing Argo %s", date)
            try:
                process_argo(json_file, argo_output, date)
                logger.info("Argo %s → processed in %s", date, argo_output)
            except Exception as e:
                logger.error("Failed to process Argo %s: %s", date, e)
