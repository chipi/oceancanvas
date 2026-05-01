"""OceanCanvas historical backfill flow.

Renders a recipe across a date range using parallel workers.
Entry point: `oceancanvas backfill` CLI command or direct invocation.

Implements RFC-008 backfill use case.
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from pathlib import Path

import yaml
from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from oceancanvas.log import get_logger
from oceancanvas.tasks.build_payload import build_one_payload
from oceancanvas.tasks.index import index
from oceancanvas.tasks.render import cleanup_workers, render_one


def _generate_dates(
    start: str, end: str, cadence: str = "monthly"
) -> list[str]:
    """Generate date strings from start to end at the given cadence.

    Args:
        start: Start date as YYYY-MM-DD or YYYY-MM (assumes first of month).
        end: End date as YYYY-MM-DD or YYYY-MM (assumes first of month).
        cadence: 'monthly' or 'daily'.

    Returns:
        List of date strings in YYYY-MM-DD format.
    """
    start_date = _parse_date(start)
    end_date = _parse_date(end)

    if start_date > end_date:
        start_date, end_date = end_date, start_date

    dates: list[str] = []
    current = start_date

    if cadence == "monthly":
        while current <= end_date:
            dates.append(current.isoformat())
            # Advance to first of next month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)
    elif cadence == "daily":
        while current <= end_date:
            dates.append(current.isoformat())
            current += timedelta(days=1)
    else:
        msg = f"Unknown cadence: {cadence}. Use 'monthly' or 'daily'."
        raise ValueError(msg)

    return dates


def _parse_date(s: str) -> date:
    """Parse YYYY-MM-DD or YYYY-MM to a date object."""
    parts = s.split("-")
    if len(parts) == 2:
        return date(int(parts[0]), int(parts[1]), 1)
    if len(parts) == 3:
        return date(int(parts[0]), int(parts[1]), int(parts[2]))
    msg = f"Invalid date format: {s}. Use YYYY-MM-DD or YYYY-MM."
    raise ValueError(msg)


def _load_recipe_source(recipes_dir: Path, recipe_name: str) -> str:
    """Read the primary source from a recipe YAML."""
    recipe_path = recipes_dir / f"{recipe_name}.yaml"
    if not recipe_path.exists():
        msg = f"Recipe not found: {recipe_path}"
        raise FileNotFoundError(msg)
    with recipe_path.open() as f:
        recipe = yaml.safe_load(f)
    return recipe.get("sources", {}).get("primary", "oisst")


def validate_backfill(
    recipe_name: str,
    dates: list[str],
    data_dir: Path,
    recipes_dir: Path,
    renders_dir: Path,
) -> tuple[list[str], list[str], list[str]]:
    """Check which dates need rendering and which have missing data.

    Returns:
        (to_render, already_done, missing_data) — three lists of date strings.
    """
    source_id = _load_recipe_source(recipes_dir, recipe_name)
    processed_dir = data_dir / "processed" / source_id

    to_render: list[str] = []
    already_done: list[str] = []
    missing_data: list[str] = []

    for d in dates:
        render_path = renders_dir / recipe_name / f"{d}.png"
        if render_path.exists():
            already_done.append(d)
            continue

        data_path = processed_dir / f"{d}.json"
        if not data_path.exists():
            missing_data.append(d)
            continue

        to_render.append(d)

    return to_render, already_done, missing_data


@flow(name="backfill", log_prints=True, task_runner=ConcurrentTaskRunner())
def backfill_flow(
    recipe_name: str,
    start_date: str,
    end_date: str,
    cadence: str = "monthly",
) -> list[Path]:
    """Backfill renders for a recipe across a date range.

    Builds payloads and renders in parallel, bounded by RENDER_CONCURRENCY.
    Skips already-rendered dates. Fails fast if processed data is missing.
    """
    logger = get_logger()
    data_dir = Path(os.environ.get("DATA_DIR", "/data"))
    recipes_dir = Path(os.environ.get("RECIPES_DIR", "/recipes"))
    renders_dir = Path(os.environ.get("RENDERS_DIR", "/renders"))

    dates = _generate_dates(start_date, end_date, cadence)
    logger.info(
        "Backfill %s: %s → %s, %s cadence, %d dates",
        recipe_name, start_date, end_date, cadence, len(dates),
    )

    to_render, already_done, missing_data = validate_backfill(
        recipe_name, dates, data_dir, recipes_dir, renders_dir
    )

    if missing_data:
        logger.error(
            "Missing processed data for %d dates (first 5: %s). "
            "Run the pipeline to fetch and process these dates first.",
            len(missing_data), missing_data[:5],
        )
        msg = f"Missing processed data for {len(missing_data)} dates"
        raise ValueError(msg)

    if already_done:
        logger.info("Skipping %d already-rendered dates", len(already_done))

    if not to_render:
        logger.info("Nothing to render — all dates complete")
        return []

    logger.info("Rendering %d dates", len(to_render))

    recipe_path = recipes_dir / f"{recipe_name}.yaml"

    # Fan out: build payloads
    payload_futures = [
        build_one_payload.submit(recipe_path, data_dir, renders_dir, date=d)
        for d in to_render
    ]
    payload_paths = [f.result() for f in payload_futures if f.result() is not None]

    if not payload_paths:
        logger.info("No payloads to render (all already exist)")
        return []

    # Fan out: render (semaphore-limited by render_one)
    render_futures = [
        render_one.submit(p, renders_dir)
        for p in payload_paths
    ]

    results: list[Path] = []
    failed: list[str] = []
    try:
        for future, d in zip(render_futures, to_render):
            try:
                path = future.result()
                if path:
                    results.append(path)
            except Exception as e:
                logger.error("Render failed for %s: %s", d, e)
                failed.append(d)
    finally:
        cleanup_workers()

    # Rebuild index
    index(data_dir, recipes_dir, renders_dir)

    logger.info(
        "Backfill complete: %d rendered, %d failed, %d skipped",
        len(results), len(failed), len(already_done),
    )

    if failed:
        logger.warning("Failed dates: %s", failed)

    return results
