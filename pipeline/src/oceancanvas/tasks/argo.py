"""Argo float data — discover, fetch, and process.

Downloads recent Argo float positions from the ifremer GDAC index,
filters to the processing region and recent dates, and produces
point-format processed data for the scatter render type.

The full index is ~3M rows. We stream it and filter by date + region
to avoid downloading the entire file into memory.
"""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import requests

from oceancanvas.io import atomic_write_text
from oceancanvas.log import get_logger

ARGO_INDEX_URL = os.environ.get(
    "ARGO_INDEX_URL",
    "https://data-argo.ifremer.fr/ar_index_global_prof.txt",
)

# Processing region — matches OISST processing region
PROCESSING_REGION = {
    "lat_min": 20.0,
    "lat_max": 75.0,
    "lon_min": -90.0,
    "lon_max": 10.0,
}


def discover_argo() -> str:
    """Argo is always 'today' — the index updates continuously."""
    return datetime.now(UTC).strftime("%Y-%m-%d")


def fetch_argo(date: str, output_path: Path, max_days: int = 30) -> int:
    """Download recent Argo profiles from the GDAC index.

    Streams the CSV, filters by date range and region, writes
    a JSON array of {lat, lon, date, file} to output_path.

    Returns the number of profiles found.
    """
    logger = get_logger()
    r = PROCESSING_REGION

    # Parse the target date and compute the window
    target = datetime.strptime(date, "%Y-%m-%d")
    cutoff = target - timedelta(days=max_days)
    cutoff_str = cutoff.strftime("%Y%m%d")

    logger.info("Fetching Argo profiles from %s (last %d days)", ARGO_INDEX_URL, max_days)

    resp = requests.get(ARGO_INDEX_URL, timeout=120, stream=True)
    resp.raise_for_status()

    profiles: list[dict] = []
    for line in resp.iter_lines(decode_unicode=True):
        if not line or line.startswith("#"):
            continue
        if line.startswith("file,"):
            continue  # header

        parts = line.split(",")
        if len(parts) < 5:
            continue

        date_str = parts[1][:8]  # "20260429" from "20260429062501"
        if date_str < cutoff_str:
            continue

        try:
            lat = float(parts[2])
            lon = float(parts[3])
        except (ValueError, IndexError):
            continue

        # Filter to processing region
        if not (r["lat_min"] <= lat <= r["lat_max"] and r["lon_min"] <= lon <= r["lon_max"]):
            continue

        profiles.append(
            {
                "lat": round(lat, 3),
                "lon": round(lon, 3),
                "date": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}",
                "file": parts[0],
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(output_path, json.dumps(profiles))
    logger.info("Argo: %d profiles in region (last %d days)", len(profiles), max_days)
    return len(profiles)


def process_argo(source_path: Path, output_dir: Path, date: str) -> None:
    """Process Argo source JSON into the scatter-compatible format.

    Input: JSON array of {lat, lon, date, file}
    Output: processed JSON with point data format for scatter sketch.
    """
    profiles = json.loads(source_path.read_text())

    if not profiles:
        return

    lats = [p["lat"] for p in profiles]
    lons = [p["lon"] for p in profiles]

    output_dir.mkdir(parents=True, exist_ok=True)

    processed = {
        "data": profiles,
        "shape": [len(profiles)],
        "min": min(lats),
        "max": max(lats),
        "lat_range": [min(lats), max(lats)],
        "lon_range": [min(lons), max(lons)],
        "source_id": "argo",
        "date": date,
    }
    atomic_write_text(output_dir / f"{date}.json", json.dumps(processed))

    meta = {
        "date": date,
        "source_id": "argo",
        "shape": [len(profiles)],
        "profile_count": len(profiles),
        "lat_range": processed["lat_range"],
        "lon_range": processed["lon_range"],
    }
    atomic_write_text(output_dir / f"{date}.meta.json", json.dumps(meta, indent=2))
