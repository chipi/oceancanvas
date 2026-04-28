"""OceanCanvas daily pipeline flow.

Wires the six canonical tasks into a single Prefect flow.
Run via serve (deploy.py) or directly: python -m oceancanvas.flow
"""

import os
import sys
from pathlib import Path

from prefect import flow, get_run_logger

from oceancanvas.tasks.build_payload import build_payload
from oceancanvas.tasks.discover import discover
from oceancanvas.tasks.fetch import fetch
from oceancanvas.tasks.index import index
from oceancanvas.tasks.process import process
from oceancanvas.tasks.render import render


@flow(name="daily_ocean_pipeline", log_prints=True)
def daily_ocean_pipeline(test_mode: bool = False) -> None:
    """Daily pipeline: discover, fetch, process, build_payload, render, index."""
    logger = get_run_logger()
    data_dir = Path(os.environ.get("DATA_DIR", "/data"))
    recipes_dir = Path(os.environ.get("RECIPES_DIR", "/recipes"))
    renders_dir = Path(os.environ.get("RENDERS_DIR", "/renders"))

    if test_mode:
        logger.info("Test mode: skipping discover and fetch")
        dates_to_fetch = {}
    else:
        dates_to_fetch = discover(data_dir, recipes_dir, renders_dir)
        fetch(data_dir, recipes_dir, renders_dir, dates_to_fetch=dates_to_fetch)

    process(data_dir, recipes_dir, renders_dir)
    build_payload(data_dir, recipes_dir, renders_dir)
    render(data_dir, recipes_dir, renders_dir)
    index(data_dir, recipes_dir, renders_dir)

    logger.info("Pipeline complete")


if __name__ == "__main__":
    test_mode = "--test-mode" in sys.argv
    daily_ocean_pipeline(test_mode=test_mode)
