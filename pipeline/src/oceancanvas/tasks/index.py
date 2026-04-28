"""Task 06 — Index.

Walks the renders/ directory, collects all PNGs, rebuilds manifest.json
from scratch at renders_dir/manifest.json. Cleans up temp payload files.

The gallery serves this file via Caddy at /renders/manifest.json
(with a convenience alias at /manifest.json).
"""

from pathlib import Path

from prefect import get_run_logger, task


@task(name="index")
def index(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Rebuild manifest.json from renders/."""
    logger = get_run_logger()
    manifest_path = renders_dir / "manifest.json"
    logger.info("Rebuilding %s", manifest_path)
    # TODO: walk renders/, build manifest, write to manifest_path
