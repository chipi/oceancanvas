"""Task 05 — Render.

Per recipe: spawns Node.js subprocess with render payload via stdin.
The renderer (render.mjs) launches Puppeteer, loads the p5.js sketch,
injects the payload, waits for window.__RENDER_COMPLETE, screenshots
the canvas, and writes PNG bytes to stdout.

This task captures the PNG and writes it to renders/{recipe}/{date}.png.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from prefect import task

from oceancanvas.io import atomic_write_bytes
from oceancanvas.log import get_logger

RENDERER_PATH = Path(__file__).parent.parent / "renderer" / "render.mjs"
RENDER_TIMEOUT = 120  # seconds

# PNG magic bytes
PNG_HEADER = b"\x89PNG\r\n\x1a\n"


def _render_one(payload_path: Path, output_path: Path) -> None:
    """Spawn the Node renderer subprocess for one payload."""
    payload_json = payload_path.read_text()

    result = subprocess.run(
        ["node", str(RENDERER_PATH)],
        input=payload_json,
        capture_output=True,
        text=False,
        timeout=RENDER_TIMEOUT,
        check=False,
    )

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        msg = f"Renderer failed (exit {result.returncode}): {stderr}"
        raise RuntimeError(msg)

    png_bytes = result.stdout
    if not png_bytes or not png_bytes.startswith(PNG_HEADER):
        msg = f"Renderer produced invalid output ({len(png_bytes)} bytes, not PNG)"
        raise RuntimeError(msg)

    atomic_write_bytes(output_path, png_bytes)


@task(name="render")
def render(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> list[Path]:
    """Render each pending payload via Puppeteer + p5.js.

    Reads payload files from data/payloads/, renders each, writes PNGs
    to renders/{recipe}/{date}.png. Returns list of rendered PNG paths.
    """
    logger = get_logger()
    payloads_dir = data_dir / "payloads"

    if not payloads_dir.exists():
        logger.info("No payloads directory, skipping render")
        return []

    payload_files = sorted(payloads_dir.glob("*.json"))
    if not payload_files:
        logger.info("No payloads to render")
        return []

    rendered: list[Path] = []

    for payload_path in payload_files:
        # Parse recipe name and date from filename: {recipe}__{date}.json
        stem = payload_path.stem
        if "__" not in stem:
            logger.warning("Unexpected payload filename (no __ separator): %s", payload_path.name)
            continue
        recipe_name, date = stem.split("__", 1)

        output_path = renders_dir / recipe_name / f"{date}.png"
        if output_path.exists():
            logger.info("Render already exists: %s", output_path)
            rendered.append(output_path)
            continue

        logger.info("Rendering %s / %s", recipe_name, date)
        try:
            _render_one(payload_path, output_path)
            logger.info("Rendered %s (%d bytes)", output_path, output_path.stat().st_size)
            rendered.append(output_path)
        except (subprocess.TimeoutExpired, RuntimeError) as e:
            logger.error("Render failed for %s/%s: %s", recipe_name, date, e)

    return rendered
