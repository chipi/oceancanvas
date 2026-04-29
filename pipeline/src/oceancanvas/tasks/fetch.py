"""Task 02 — Fetch.

Downloads raw source data to data/sources/.
OISST fetched as NetCDF via ERDDAP griddap URL (xarray + requests per ADR-003).
"""

from __future__ import annotations

import os
from pathlib import Path

import requests
from prefect import task

from oceancanvas.constants import PROCESSING_REGION
from oceancanvas.log import get_logger

ERDDAP_URL = os.environ.get("OISST_ERDDAP_URL", "https://coastwatch.pfeg.noaa.gov/erddap")
OISST_DATASET_ID = os.environ.get("OISST_DATASET_ID", "ncdcOisst21Agg_LonPM180")


def _build_oisst_url(date: str) -> str:
    """Build ERDDAP griddap URL for one day of OISST, cropped to processing region."""
    r = PROCESSING_REGION
    return (
        f"{ERDDAP_URL}/griddap/{OISST_DATASET_ID}.nc?"
        f"sst[({date}T12:00:00Z):1:({date}T12:00:00Z)]"
        f"[(0.0):1:(0.0)]"
        f"[({r['lat_min']}):1:({r['lat_max']})]"
        f"[({r['lon_min']}):1:({r['lon_max']})]"
    )


def _fetch_oisst(date: str, output_path: Path) -> None:
    """Download one day of OISST NetCDF from ERDDAP."""
    url = _build_oisst_url(date)
    resp = requests.get(url, timeout=120, stream=True)
    resp.raise_for_status()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = output_path.with_suffix(".tmp")
    with tmp.open("wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    tmp.rename(output_path)


@task(name="fetch", retries=3, retry_delay_seconds=60)
def fetch(
    data_dir: Path,
    recipes_dir: Path,
    renders_dir: Path,
    dates_to_fetch: dict[str, str] | None = None,
) -> dict[str, Path]:
    """Fetch raw data for each source date discovered.

    Returns a dict of {source_id: Path} for fetched files.
    """
    logger = get_logger()
    sources_dir = data_dir / "sources"

    if not dates_to_fetch:
        logger.info("Nothing to fetch")
        return {}

    fetched: dict[str, Path] = {}

    # OISST
    if "oisst" in dates_to_fetch:
        date = dates_to_fetch["oisst"]
        output_path = sources_dir / "oisst" / f"{date}.nc"

        if output_path.exists():
            logger.info("OISST %s already on disk, skipping", date)
        else:
            logger.info("Fetching OISST %s from ERDDAP...", date)
            _fetch_oisst(date, output_path)
            logger.info("OISST %s saved (%d bytes)", date, output_path.stat().st_size)

        fetched["oisst"] = output_path

    # Argo
    if "argo" in dates_to_fetch:
        from oceancanvas.tasks.argo import fetch_argo

        date = dates_to_fetch["argo"]
        output_path = sources_dir / "argo" / f"{date}.json"

        if output_path.exists():
            logger.info("Argo %s already on disk, skipping", date)
        else:
            logger.info("Fetching Argo profiles for %s...", date)
            count = fetch_argo(date, output_path)
            logger.info("Argo %s: %d profiles saved", date, count)

        fetched["argo"] = output_path

    return fetched
