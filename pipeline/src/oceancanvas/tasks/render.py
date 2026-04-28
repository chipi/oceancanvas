"""Task 05 — Render.

Per recipe: Node.js subprocess launches Puppeteer, loads the p5.js sketch HTML,
injects the render payload, waits for window.__RENDER_COMPLETE, screenshots the
canvas. Writes PNG to renders/{recipe}/{date}.png.
"""

from pathlib import Path

from prefect import get_run_logger, task


@task(name="render")
def render(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> None:
    """Render each recipe via Puppeteer + p5.js."""
    logger = get_run_logger()
    logger.info("Rendering recipes")
    # TODO: spawn Node subprocess, inject payload, capture PNG
