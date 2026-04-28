"""Task 03 — Process.

Opens raw files with xarray, crops to processing region, validates,
computes statistics, exports three outputs per source per date to
data/processed/. Runs once per source per date — not per recipe.
"""

from pathlib import Path

from prefect import get_run_logger, task


@task(name="process")
def process(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Process raw data into browser-friendly formats."""
    logger = get_run_logger()
    logger.info("Processing source data")
    # TODO: open NetCDF with xarray, crop, compute stats
    # TODO: write .json (flat array), .png (colourised tile), .meta.json (sidecar)
