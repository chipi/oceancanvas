"""Task 04 — Build Payload.

Per recipe: reads data/processed/ for each source the recipe needs.
Crops further to the recipe's specific lat/lon region. Assembles a flat
render_payload.json that the p5.js sketch will consume.
"""

from pathlib import Path

from prefect import get_run_logger, task


@task(name="build_payload")
def build_payload(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Build render payload per recipe."""
    logger = get_run_logger()
    logger.info("Building render payloads")
    # TODO: read recipe YAML, load processed data, assemble window.OCEAN_PAYLOAD
