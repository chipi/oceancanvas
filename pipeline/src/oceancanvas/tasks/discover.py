"""Task 01 — Discover.

Queries ERDDAP for each source's latest available date.
Returns a dict of {source_id: date_str} for dates that need fetching.
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import requests
from prefect import task

from oceancanvas.log import get_logger

ERDDAP_URL = os.environ.get("OISST_ERDDAP_URL", "https://coastwatch.pfeg.noaa.gov/erddap")
OISST_DATASET_ID = os.environ.get("OISST_DATASET_ID", "ncdcOisst21Agg_LonPM180")


def _oisst_latest_date() -> str:
    """Query ERDDAP info endpoint for OISST's time_coverage_end."""
    url = f"{ERDDAP_URL}/info/{OISST_DATASET_ID}/index.json"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    for row in data["table"]["rows"]:
        if row[2] == "time_coverage_end":
            # Value like "2026-04-13T12:00:00Z" → "2026-04-13"
            return datetime.fromisoformat(row[4].replace("Z", "+00:00")).strftime("%Y-%m-%d")
    msg = "time_coverage_end not found in ERDDAP info response"
    raise ValueError(msg)


@task(name="discover", retries=2, retry_delay_seconds=30)
def discover(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> dict[str, str]:
    """Discover latest available date per source.

    Returns a dict like {"oisst": "2026-04-13"} for dates not yet fetched.
    """
    logger = get_logger()
    sources_dir = data_dir / "sources"

    dates_to_fetch: dict[str, str] = {}

    # OISST
    latest = _oisst_latest_date()
    local_path = sources_dir / "oisst" / f"{latest}.nc"
    if local_path.exists():
        logger.info("OISST %s already fetched, skipping", latest)
    else:
        logger.info("OISST latest available: %s", latest)
        dates_to_fetch["oisst"] = latest

    # Argo — always today
    from oceancanvas.tasks.argo import discover_argo

    argo_date = discover_argo()
    argo_path = sources_dir / "argo" / f"{argo_date}.json"
    if argo_path.exists():
        logger.info("Argo %s already fetched, skipping", argo_date)
    else:
        logger.info("Argo date: %s", argo_date)
        dates_to_fetch["argo"] = argo_date

    return dates_to_fetch
