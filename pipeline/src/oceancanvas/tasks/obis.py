"""OBIS biologging data — fetch and process.

Downloads marine species occurrence records from the OBIS REST API
(https://api.obis.org/v3). No auth required. Returns point-format
processed data compatible with the scatter render type.

First species: whale shark (Rhincodon typus).
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests

from oceancanvas.io import atomic_write_text
from oceancanvas.log import get_logger

OBIS_API = "https://api.obis.org/v3"

# Species configs: scientific name → slug
SPECIES = {
    "whale-shark": "Rhincodon typus",
}


def fetch_obis(
    species_slug: str,
    output_path: Path,
    max_records: int = 5000,
    max_retries: int = 3,
    backoff_base: float = 5.0,
) -> int:
    """Fetch occurrence records for a species from OBIS.

    Returns the number of records fetched.
    """
    logger = get_logger()
    scientific_name = SPECIES.get(species_slug)
    if not scientific_name:
        msg = f"Unknown species: {species_slug}. Known: {list(SPECIES.keys())}"
        raise ValueError(msg)

    url = f"{OBIS_API}/occurrence"
    params = {
        "scientificname": scientific_name,
        "size": min(max_records, 5000),
        "fields": "decimalLatitude,decimalLongitude,eventDate,depth,datasetName",
    }

    for attempt in range(max_retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=60)
            resp.raise_for_status()
            break
        except (requests.Timeout, requests.ConnectionError) as e:
            if attempt == max_retries:
                raise
            wait = backoff_base * (2**attempt)
            logger.warning(
                "OBIS %s attempt %d failed (%s), retry in %.0fs",
                species_slug,
                attempt + 1,
                e,
                wait,
            )
            time.sleep(wait)
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code >= 500:
                if attempt == max_retries:
                    raise
                wait = backoff_base * (2**attempt)
                logger.warning("OBIS server error %d, retry in %.0fs", e.response.status_code, wait)
                time.sleep(wait)
            else:
                raise

    data = resp.json()
    records = data.get("results", [])

    logger.info(
        "OBIS %s: %d records (total available: %s)",
        species_slug,
        len(records),
        data.get("total"),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(output_path, json.dumps(records, indent=2))
    return len(records)


def fetch_obis_all(
    species_slug: str,
    data_dir: Path,
    max_per_page: int = 5000,
    max_retries: int = 3,
    backoff_base: float = 5.0,
) -> tuple[list[str], list[str]]:
    """Fetch all OBIS records for a species, slice by year, append-mode.

    Downloads up to 10 pages (50K records), groups by year from eventDate,
    writes only years not already on disk. Returns (new_years, skipped).
    """
    from collections import defaultdict

    logger = get_logger()
    scientific_name = SPECIES.get(species_slug)
    if not scientific_name:
        msg = f"Unknown species: {species_slug}"
        raise ValueError(msg)

    source_id = f"obis-{species_slug}"
    sources_dir = data_dir / "sources" / source_id
    sources_dir.mkdir(parents=True, exist_ok=True)

    # Find existing years
    existing = {f.stem for f in sources_dir.glob("*.json") if f.stem != "latest"}

    # Paginate through OBIS API
    all_records: list[dict] = []
    offset = 0
    max_pages = 10

    for page in range(max_pages):
        url = f"{OBIS_API}/occurrence"
        params = {
            "scientificname": scientific_name,
            "size": max_per_page,
            "skip": offset,
            "fields": "decimalLatitude,decimalLongitude,eventDate,depth",
        }

        for attempt in range(max_retries + 1):
            try:
                resp = requests.get(url, params=params, timeout=60)
                resp.raise_for_status()
                break
            except (requests.Timeout, requests.ConnectionError) as e:
                if attempt == max_retries:
                    raise
                wait = backoff_base * (2**attempt)
                logger.warning("OBIS page %d failed (%s), retry in %.0fs", page, e, wait)
                time.sleep(wait)

        data = resp.json()
        results = data.get("results", [])
        all_records.extend(results)
        total = data.get("total", 0)
        offset += len(results)

        logger.info(
            "OBIS %s: page %d, %d records (total: %d)",
            species_slug,
            page + 1,
            len(results),
            total,
        )

        if len(results) < max_per_page or offset >= total:
            break
        time.sleep(1)  # rate limit

    # Group by year from eventDate
    yearly: dict[str, list[dict]] = defaultdict(list)
    no_date = 0

    for r in all_records:
        lat = r.get("decimalLatitude")
        lon = r.get("decimalLongitude")
        if lat is None or lon is None:
            continue
        event_date = r.get("eventDate", "") or ""
        year = event_date[:4] if len(event_date) >= 4 else ""
        if not year or not year.isdigit():
            no_date += 1
            continue
        yearly[year].append(r)

    logger.info(
        "OBIS %s: %d total, %d with dates, %d years, %d undated",
        species_slug,
        len(all_records),
        sum(len(v) for v in yearly.values()),
        len(yearly),
        no_date,
    )

    # Write only new years
    new_years: list[str] = []
    skipped: list[str] = []

    for year in sorted(yearly.keys()):
        year_key = f"{year}-01-01"
        if year_key in existing:
            skipped.append(year_key)
            continue

        records = yearly[year]
        output_path = sources_dir / f"{year_key}.json"
        atomic_write_text(output_path, json.dumps(records))
        new_years.append(year_key)

    logger.info(
        "OBIS %s: %d new years, %d skipped",
        species_slug,
        len(new_years),
        len(skipped),
    )
    return new_years, skipped


def process_obis_density(
    sources_dir: Path,
    processed_dir: Path,
    species_slug: str,
    resolution: float = 0.5,
) -> Path:
    """Aggregate every OBIS year-file for a species into a 2D density grid.

    Bins every observation across the full archive into a global lat/lon
    grid at the given resolution (degrees). Output JSON matches the field
    render type contract — `data` is a row-major flat array with row 0 =
    lat_min, last row = lat_max (mirrors the OISST convention so field.js's
    dataRow remap works without changes). See ADR-030.

    Returns the path to the written density file.
    """
    import numpy as np

    logger = get_logger()
    if not sources_dir.exists():
        msg = f"No OBIS source directory: {sources_dir}"
        raise ValueError(msg)

    lat_min, lat_max = -90.0, 90.0
    lon_min, lon_max = -180.0, 180.0
    lat_bins = int(round((lat_max - lat_min) / resolution))
    lon_bins = int(round((lon_max - lon_min) / resolution))

    grid = np.zeros((lat_bins, lon_bins), dtype=np.float32)
    n_records = 0

    for year_file in sorted(sources_dir.glob("*.json")):
        if year_file.stem == "latest":
            continue
        records = json.loads(year_file.read_text())
        for r in records:
            lat = r.get("decimalLatitude")
            lon = r.get("decimalLongitude")
            if lat is None or lon is None:
                continue
            r_idx = int((lat - lat_min) / resolution)
            c_idx = int((lon - lon_min) / resolution)
            if 0 <= r_idx < lat_bins and 0 <= c_idx < lon_bins:
                grid[r_idx, c_idx] += 1
                n_records += 1

    max_count = float(grid.max()) if grid.size > 0 else 0.0
    payload = {
        "data": grid.flatten().tolist(),
        "shape": [lat_bins, lon_bins],
        "min": 0.0,
        "max": max_count,
        "lat_range": [lat_min, lat_max],
        "lon_range": [lon_min, lon_max],
        "source_id": f"obis-{species_slug}",
        "date": "aggregated",
        "aggregate": "density",
        "resolution": resolution,
    }

    out_path = processed_dir / f"obis-{species_slug}" / f"density-{resolution:g}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(out_path, json.dumps(payload))
    logger.info(
        "OBIS %s density: %d records → %dx%d grid (max=%.0f) → %s",
        species_slug,
        n_records,
        lat_bins,
        lon_bins,
        max_count,
        out_path,
    )
    return out_path


def process_obis(
    raw_path: Path,
    processed_dir: Path,
    species_slug: str,
    date: str = "latest",
) -> Path:
    """Process raw OBIS records into OceanCanvas point format.

    Maps OBIS fields → {lat, lon, value, date, depth} points.
    """
    logger = get_logger()
    records = json.loads(raw_path.read_text())

    points = []
    for r in records:
        lat = r.get("decimalLatitude")
        lon = r.get("decimalLongitude")
        if lat is None or lon is None:
            continue
        points.append(
            {
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "value": r.get("depth", 0) or 0,
                "date": (r.get("eventDate") or "")[:10],
            }
        )

    if not points:
        logger.warning("No valid points for %s", species_slug)

    lats = [p["lat"] for p in points] if points else [0]
    lons = [p["lon"] for p in points] if points else [0]

    processed = {
        "data": points,
        "shape": [len(points)],
        "min": min(lats),
        "max": max(lats),
        "lat_range": [min(lats), max(lats)],
        "lon_range": [min(lons), max(lons)],
        "source_id": f"obis-{species_slug}",
        "date": date,
    }

    out_path = processed_dir / f"obis-{species_slug}" / f"{date}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(out_path, json.dumps(processed))
    logger.info("Processed %d %s points → %s", len(points), species_slug, out_path)
    return out_path
