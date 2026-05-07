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


def process_obis_tracks(
    sources_dir: Path,
    processed_dir: Path,
    species_slug: str,
    min_track_length: int = 5,
    max_gap_degrees: float = 5.0,
) -> Path:
    """Group OBIS observations into per-dataset tracks ordered by date.

    OBIS occurrence records do not carry per-animal identifiers, so we
    group by `datasetName` as a proxy — each research dataset becomes one
    chronological track of sightings.

    A single dataset often spans the globe (one programme records sightings
    in many regions), and a naive date-sort produces line jumps across
    oceans that read as visual noise rather than animal movement. So each
    dataset's points are walked in date order and split into sub-tracks
    wherever consecutive points jump more than `max_gap_degrees` (great-
    circle approximation via Chebyshev). Sub-tracks shorter than
    `min_track_length` are dropped.

    Output JSON shape — particles.js track-mode contract (ADR-031):
        {
          "data": [{"id": str, "points": [{lat, lon, date}, ...]}, ...],
          "shape": [n_tracks],
          "lat_range": [...], "lon_range": [...],
          "source_id": "obis-{species_slug}",
          "date": "tracks",
          "source_mode": "tracks"
        }

    The single artefact is written to processed_dir/obis-{species}/tracks.json.
    """
    from collections import defaultdict

    logger = get_logger()
    if not sources_dir.exists():
        msg = f"No OBIS source directory: {sources_dir}"
        raise ValueError(msg)

    grouped: dict[str, list[dict]] = defaultdict(list)
    for year_file in sorted(sources_dir.glob("*.json")):
        if year_file.stem == "latest":
            continue
        records = json.loads(year_file.read_text())
        for r in records:
            lat = r.get("decimalLatitude")
            lon = r.get("decimalLongitude")
            if lat is None or lon is None:
                continue
            dataset = r.get("datasetName") or "unknown"
            event_date = (r.get("eventDate") or "")[:10]
            grouped[dataset].append(
                {
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "date": event_date,
                }
            )

    tracks: list[dict] = []
    all_lats: list[float] = []
    all_lons: list[float] = []
    for dataset, points in grouped.items():
        # Sort by date; stable on tie so geographic order preserves where dates collide.
        points_sorted = sorted(points, key=lambda p: p["date"])

        # Walk and split at large jumps so cross-ocean leaps don't render as line noise.
        sub_tracks: list[list[dict]] = [[]]
        prev: dict | None = None
        for p in points_sorted:
            if prev is not None:
                gap = max(abs(p["lat"] - prev["lat"]), abs(p["lon"] - prev["lon"]))
                if gap > max_gap_degrees:
                    sub_tracks.append([])
            sub_tracks[-1].append(p)
            prev = p

        for idx, sub in enumerate(sub_tracks):
            if len(sub) < min_track_length:
                continue
            track_id = dataset if len(sub_tracks) == 1 else f"{dataset} #{idx + 1}"
            tracks.append({"id": track_id, "points": sub})
            all_lats.extend(p["lat"] for p in sub)
            all_lons.extend(p["lon"] for p in sub)

    if not all_lats:
        all_lats = [0.0]
        all_lons = [0.0]

    payload = {
        "data": tracks,
        "shape": [len(tracks)],
        "lat_range": [min(all_lats), max(all_lats)],
        "lon_range": [min(all_lons), max(all_lons)],
        "source_id": f"obis-{species_slug}",
        "date": "tracks",
        "source_mode": "tracks",
    }

    out_path = processed_dir / f"obis-{species_slug}" / "tracks.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(out_path, json.dumps(payload))
    logger.info(
        "OBIS %s tracks: %d datasets → %d tracks (≥%d points each) → %s",
        species_slug,
        len(grouped),
        len(tracks),
        min_track_length,
        out_path,
    )
    return out_path


def process_obis_density(
    sources_dir: Path,
    processed_dir: Path,
    species_slug: str,
    resolution: float = 0.5,
    smoothing_radius: int = 3,
) -> Path:
    """Aggregate every OBIS year-file for a species into a 2D density grid.

    Bins every observation across the full archive into a global lat/lon
    grid at the given resolution (degrees). Output JSON matches the field
    render type contract — `data` is a row-major flat array with row 0 =
    lat_min, last row = lat_max (mirrors the OISST convention so field.js's
    dataRow remap works without changes). See ADR-030.

    `smoothing_radius` applies a box blur to the binned grid (radius in
    cells). Without it, sparse archives produce single-cell hotspots that
    are visually invisible at typical render resolutions; with radius=3
    on a 1° grid each hotspot spreads to a ~7° (~35px at 1920w) blob.
    Set to 0 to disable.

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

    if smoothing_radius > 0:
        # Box blur via summed-area table — O(rows·cols), no scipy dependency.
        sat = np.zeros((lat_bins + 1, lon_bins + 1), dtype=np.float64)
        sat[1:, 1:] = grid.cumsum(axis=0).cumsum(axis=1)
        rows = np.arange(lat_bins)
        cols = np.arange(lon_bins)
        r0 = np.maximum(0, rows - smoothing_radius)[:, None]
        r1 = np.minimum(lat_bins, rows + smoothing_radius + 1)[:, None]
        c0 = np.maximum(0, cols - smoothing_radius)[None, :]
        c1 = np.minimum(lon_bins, cols + smoothing_radius + 1)[None, :]
        grid = (
            (sat[r1, c1] - sat[r0, c1] - sat[r1, c0] + sat[r0, c0]) / ((r1 - r0) * (c1 - c0))
        ).astype(np.float32)

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
        "smoothing_radius": smoothing_radius,
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
