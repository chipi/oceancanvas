"""Task 04 — Build Payload.

Per recipe: reads data/processed/ for the recipe's primary source,
crops to the recipe's lat/lon region, and assembles the render payload
that the p5.js sketch consumes via window.OCEAN_PAYLOAD.

Payload shape follows RFC-002.
"""

from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import yaml
from prefect import task

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
    return recipe


def _crop_to_region(processed: dict, lat_range: list[float], lon_range: list[float]) -> dict:
    """Crop processed data array to the recipe's region.

    For now, if the processed data already covers the recipe region
    (which it does — processing region is wider than any recipe),
    return the full array. Proper sub-cropping is a refinement.
    """
    # TODO: actual sub-crop when recipe region is smaller than processing region
    return processed


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

    payload = {
        "version": 1,
        "recipe": {
            "id": recipe["name"],
            "name": recipe["name"],
            "render": render,
            "render_date": date,
        },
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

    atomic_write_text(output_path, json.dumps(payload))


@task(name="build_payload")
def build_payload(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> list[Path]:
    """Build render payload per recipe for the latest processed date.

    Returns list of payload file paths written.
    """
    logger = get_logger()
    processed_dir = data_dir / "processed"
    payloads_dir = data_dir / "payloads"

    if not recipes_dir.exists():
        logger.info("No recipes directory found")
        return []

    recipe_files = sorted(recipes_dir.glob("*.yaml"))
    if not recipe_files:
        logger.info("No recipes found")
        return []

    payload_paths: list[Path] = []

    for recipe_path in recipe_files:
        try:
            recipe = _load_recipe(recipe_path)
        except (jsonschema.ValidationError, yaml.YAMLError) as e:
            logger.warning("Skipping invalid recipe %s: %s", recipe_path.name, e)
            continue

        source_id = recipe["sources"]["primary"]
        date = _find_latest_date(processed_dir, source_id)
        if not date:
            logger.info("No processed data for %s, skipping %s", source_id, recipe["name"])
            continue

        # Skip if render already exists for this date
        render_path = renders_dir / recipe["name"] / f"{date}.png"
        if render_path.exists():
            logger.info("Render already exists for %s/%s, skipping payload", recipe["name"], date)
            continue

        output = payloads_dir / f"{recipe['name']}_{date}.json"
        if output.exists():
            logger.info("Payload already built for %s/%s", recipe["name"], date)
            payload_paths.append(output)
            continue

        logger.info("Building payload for %s / %s", recipe["name"], date)
        _build_one_payload(recipe, processed_dir, date, output)
        payload_paths.append(output)

    return payload_paths
