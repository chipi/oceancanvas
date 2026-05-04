"""Task 04 — Build Payload.

Per recipe: reads data/processed/ for the recipe's primary source,
crops to the recipe's lat/lon region, and assembles the render payload
that the p5.js sketch consumes via window.OCEAN_PAYLOAD.

Payload shape follows RFC-002.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import jsonschema
import numpy as np
import yaml
from prefect import task

from oceancanvas.constants import NAN_VALUE
from oceancanvas.io import atomic_write_text
from oceancanvas.log import get_logger

SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "recipe-schema.json"
DEFAULT_WIDTH = 1920
DEFAULT_HEIGHT = 1080


def _load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


def _load_recipe(recipe_path: Path) -> dict:
    """Load and validate a recipe YAML against the JSON schema."""
    with recipe_path.open() as f:
        recipe = yaml.safe_load(f)
    # PyYAML auto-parses dates as datetime.date — convert back to string for schema validation
    if hasattr(recipe.get("created"), "isoformat"):
        recipe["created"] = recipe["created"].isoformat()
    schema = _load_schema()
    jsonschema.validate(recipe, schema)
    # Ensure lat/lon are [min, max] order
    region = recipe.get("region", {})
    for axis in ("lat", "lon"):
        vals = region.get(axis, [])
        if len(vals) == 2 and vals[0] > vals[1]:
            region[axis] = [vals[1], vals[0]]
    return recipe


def _crop_to_region(processed: dict, lat_range: list[float], lon_range: list[float]) -> dict:
    """Crop processed data array to the recipe's lat/lon region.

    The processed data covers the full processing region (wider than any recipe).
    This function slices to the recipe's bounds using linear interpolation of
    lat/lon coordinates from the processed metadata.
    """

    data_lat = processed["lat_range"]  # [min, max]
    data_lon = processed["lon_range"]  # [min, max]
    shape = processed["shape"]
    flat = processed["data"]

    # Point data (1D shape like [1947]) — filter by lat/lon bounds, cap at 500
    max_points = 500
    if len(shape) == 1:
        if not flat:
            return processed
        if isinstance(flat[0], dict):
            filtered = [
                p
                for p in flat
                if lat_range[0] <= p.get("lat", 0) <= lat_range[1]
                and lon_range[0] <= p.get("lon", 0) <= lon_range[1]
            ]
            # Deterministic subsample: take evenly spaced points if over cap
            if len(filtered) > max_points:
                step = len(filtered) / max_points
                filtered = [filtered[int(i * step)] for i in range(max_points)]
            lats = [p["lat"] for p in filtered] if filtered else [0]
            lons = [p["lon"] for p in filtered] if filtered else [0]
            return {
                "data": filtered,
                "shape": [len(filtered)],
                "min": min(lats),
                "max": max(lats),
                "lat_range": [min(lats), max(lats)],
                "lon_range": [min(lons), max(lons)],
                "source_id": processed.get("source_id", ""),
                "date": processed.get("date", ""),
            }
        return processed

    lat_count, lon_count = shape

    # If recipe region matches or exceeds processed region, return as-is
    if (
        lat_range[0] <= data_lat[0]
        and lat_range[1] >= data_lat[1]
        and lon_range[0] <= data_lon[0]
        and lon_range[1] >= data_lon[1]
    ):
        return processed

    # Compute pixel indices for the crop bounds
    def _idx(val: float, vmin: float, vmax: float, n: int) -> int:
        frac = (val - vmin) / (vmax - vmin) if vmax != vmin else 0.0
        return max(0, min(n - 1, int(round(frac * (n - 1)))))

    lat_i0 = _idx(lat_range[0], data_lat[0], data_lat[1], lat_count)
    lat_i1 = _idx(lat_range[1], data_lat[0], data_lat[1], lat_count) + 1
    lon_i0 = _idx(lon_range[0], data_lon[0], data_lon[1], lon_count)
    lon_i1 = _idx(lon_range[1], data_lon[0], data_lon[1], lon_count) + 1

    arr = np.array(flat, dtype=np.float32).reshape(lat_count, lon_count)
    cropped = arr[lat_i0:lat_i1, lon_i0:lon_i1]

    valid = cropped[cropped != NAN_VALUE]
    return {
        "data": cropped.flatten().tolist(),
        "shape": list(cropped.shape),
        "min": round(float(valid.min()), 4) if valid.size > 0 else 0.0,
        "max": round(float(valid.max()), 4) if valid.size > 0 else 0.0,
        "lat_range": [lat_range[0], lat_range[1]],
        "lon_range": [lon_range[0], lon_range[1]],
        "source_id": processed.get("source_id", ""),
        "date": processed.get("date", ""),
    }


def _find_latest_date(processed_dir: Path, source_id: str) -> str | None:
    """Find the latest processed date for a source."""
    source_dir = processed_dir / source_id
    if not source_dir.exists():
        return None
    json_files = sorted(source_dir.glob("*.json"))
    # Filter out .meta.json files
    data_files = [f for f in json_files if not f.name.endswith(".meta.json")]
    if not data_files:
        return None
    return data_files[-1].stem  # e.g. "2026-04-13"


def _build_one_payload(recipe: dict, processed_dir: Path, date: str, output_path: Path) -> None:
    """Assemble the render payload for one recipe + one date."""
    source_id = recipe["sources"]["primary"]
    data_path = processed_dir / source_id / f"{date}.json"

    if not data_path.exists():
        msg = f"No processed data for {source_id}/{date}"
        raise FileNotFoundError(msg)

    primary_data = json.loads(data_path.read_text())

    region = recipe["region"]
    render = recipe.get("render", {})
    audio = recipe.get("audio")
    tension_arc = recipe.get("tension_arc")

    recipe_block: dict = {
        "id": recipe["name"],
        "name": recipe["name"],
        "render": render,
        "render_date": date,
    }
    if audio is not None:
        recipe_block["audio"] = audio
    if tension_arc is not None:
        recipe_block["tension_arc"] = tension_arc

    payload = {
        "version": 2,
        "recipe": recipe_block,
        "region": {
            "lat_min": region["lat"][0],
            "lat_max": region["lat"][1],
            "lon_min": region["lon"][0],
            "lon_max": region["lon"][1],
        },
        "output": {
            "width": DEFAULT_WIDTH,
            "height": DEFAULT_HEIGHT,
        },
        "data": {
            "primary": _crop_to_region(primary_data, region["lat"], region["lon"]),
        },
    }

    # Load context data (e.g., GEBCO bathymetry) if specified
    context_id = recipe.get("sources", {}).get("context")
    if context_id:
        context_path = processed_dir / context_id / "static.json"
        if context_path.exists():
            context_data = json.loads(context_path.read_text())
            payload["data"]["context"] = _crop_to_region(context_data, region["lat"], region["lon"])

    # Load foreground source(s) for composite renders (e.g. SST field with
    # whale-shark scatter dots overlaid). OBIS sources use latest.json for
    # the all-time aggregated point cloud; other sources fall back to the
    # same date as the primary render.
    foreground_id = recipe.get("sources", {}).get("foreground")
    if foreground_id:
        fg_ids = [foreground_id] if isinstance(foreground_id, str) else list(foreground_id)
        foreground_layers = []
        for fid in fg_ids:
            fg_dir = processed_dir / fid
            fg_path = fg_dir / "latest.json" if fid.startswith("obis-") else fg_dir / f"{date}.json"
            if fg_path.exists():
                fg_data = json.loads(fg_path.read_text())
                foreground_layers.append({
                    "source_id": fid,
                    **_crop_to_region(fg_data, region["lat"], region["lon"]),
                })
        if foreground_layers:
            payload["data"]["foreground"] = foreground_layers if len(foreground_layers) > 1 else foreground_layers[0]

    # Load coastline GeoJSON if available (shared across all scatter renders)
    # Check common locations: project root sketches/, Docker /sketches/
    coastline_path = None
    for candidate in [
        Path(__file__).parent.parent.parent.parent.parent.parent / "sketches" / "coastline.json",
        Path("/sketches/coastline.json"),
        Path(os.environ.get("SKETCHES_DIR", "/sketches")) / "coastline.json",
    ]:
        if candidate.exists():
            coastline_path = candidate
            break
    if coastline_path and render.get("type") in ("scatter", "composite"):
        coastline = json.loads(coastline_path.read_text())
        payload["data"]["coastline"] = coastline.get("features", [])

    atomic_write_text(output_path, json.dumps(payload))


@task(name="build_one_payload")
def build_one_payload(
    recipe_path: Path,
    data_dir: Path,
    renders_dir: Path,
    date: str | None = None,
) -> Path | None:
    """Build render payload for one recipe.

    Designed for parallel dispatch via .submit() in the flow.
    If date is None, uses the latest processed date for the source.
    """
    logger = get_logger()
    processed_dir = data_dir / "processed"
    payloads_dir = data_dir / "payloads"

    try:
        recipe = _load_recipe(recipe_path)
    except (jsonschema.ValidationError, yaml.YAMLError) as e:
        logger.warning("Skipping invalid recipe %s: %s", recipe_path.name, e)
        return None

    source_id = recipe["sources"]["primary"]
    render_date = date or _find_latest_date(processed_dir, source_id)
    if not render_date:
        logger.info("No processed data for %s, skipping %s", source_id, recipe["name"])
        return None

    # Skip if render already exists for this date
    render_path = renders_dir / recipe["name"] / f"{render_date}.png"
    if render_path.exists():
        logger.info("Render exists for %s/%s, skipping payload", recipe["name"], render_date)
        return None

    output = payloads_dir / f"{recipe['name']}__{render_date}.json"
    if output.exists():
        logger.info("Payload already built for %s/%s", recipe["name"], render_date)
        return output

    logger.info("Building payload for %s / %s", recipe["name"], render_date)
    _build_one_payload(recipe, processed_dir, render_date, output)
    return output


# Legacy wrapper for backward compatibility with tests and direct invocation
@task(name="build_payload")
def build_payload(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> list[Path]:
    """Build render payloads for all recipes sequentially. Used in test mode."""
    logger = get_logger()

    if not recipes_dir.exists():
        logger.info("No recipes directory found")
        return []

    recipe_files = sorted(recipes_dir.glob("*.yaml"))
    if not recipe_files:
        logger.info("No recipes found")
        return []

    payload_paths: list[Path] = []
    for recipe_path in recipe_files:
        result = build_one_payload.fn(recipe_path, data_dir, renders_dir)
        if result:
            payload_paths.append(result)
    return payload_paths
