"""Task 02 — Fetch.

Downloads raw files to data/sources/.
OISST and GEBCO fetched as NetCDF via ERDDAP griddap URLs.
Open-Meteo is a JSON API call. dlt handles incremental state for REST sources.
"""

from pathlib import Path

from prefect import get_run_logger, task


@task(name="fetch")
def fetch(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Fetch raw data to data/sources/."""
    logger = get_run_logger()
    logger.info("Fetching raw source data")
    # TODO: fetch OISST NetCDF from ERDDAP
    # TODO: fetch Argo daily index JSON
    # TODO: verify GEBCO subset exists
