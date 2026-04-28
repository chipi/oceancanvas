"""Task 01 — Discover.

Queries the latest available date for each source.
ERDDAP sources use /info/{datasetID}/index.json.
Open-Meteo is always today. GEBCO never changes.
"""

from pathlib import Path

from prefect import get_run_logger, task


@task(name="discover")
def discover(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Discover latest available date per source."""
    logger = get_run_logger()
    logger.info("Discovering latest available dates")
    # TODO: query ERDDAP for OISST latest date
    # TODO: Argo index is always today
    # TODO: GEBCO is static
