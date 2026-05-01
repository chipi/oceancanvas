"""Task 05 — Render.

Per recipe: spawns Node.js subprocess with render payload via stdin.
The renderer (render.mjs) launches Puppeteer, loads the p5.js sketch,
injects the payload, waits for window.__RENDER_COMPLETE, screenshots
the canvas, and writes PNG bytes to stdout.

This task captures the PNG and writes it to renders/{recipe}/{date}.png.

Parallelised via ConcurrentTaskRunner in flow.py — each payload is
rendered as a separate Prefect task, with concurrency bounded by
RENDER_CONCURRENCY (constants.py).
"""

from __future__ import annotations

import subprocess
import threading
from pathlib import Path

from prefect import task

from oceancanvas.constants import RENDER_CONCURRENCY
from oceancanvas.io import atomic_write_bytes
from oceancanvas.log import get_logger

RENDERER_PATH = Path(__file__).parent.parent / "renderer" / "render.mjs"
RENDER_TIMEOUT = 120  # seconds

# PNG magic bytes
PNG_HEADER = b"\x89PNG\r\n\x1a\n"

# Semaphore bounds concurrent Chromium instances across threads.
# ConcurrentTaskRunner uses threads; the semaphore is process-local.
_render_semaphore = threading.Semaphore(RENDER_CONCURRENCY)


def _render_one(payload_path: Path, output_path: Path) -> None:
    """Spawn the Node renderer subprocess for one payload."""
    payload_bytes = payload_path.read_bytes()

    result = subprocess.run(
        ["node", str(RENDERER_PATH)],
        input=payload_bytes,
        capture_output=True,
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


@task(name="render_one", timeout_seconds=120, retries=1, retry_delay_seconds=10)
def render_one(payload_path: Path, renders_dir: Path) -> Path | None:
    """Render one payload file via Puppeteer + p5.js.

    Designed for parallel dispatch via .submit() in the flow.
    Concurrency bounded by _render_semaphore.
    """
    logger = get_logger()

    stem = payload_path.stem
    if "__" not in stem:
        logger.warning("Unexpected payload filename (no __ separator): %s", payload_path.name)
        return None

    recipe_name, date = stem.split("__", 1)
    output_path = renders_dir / recipe_name / f"{date}.png"

    if output_path.exists():
        logger.info("Render already exists: %s", output_path)
        return output_path

    logger.info("Rendering %s / %s", recipe_name, date)
    with _render_semaphore:
        try:
            _render_one(payload_path, output_path)
            logger.info("Rendered %s (%d bytes)", output_path, output_path.stat().st_size)
            return output_path
        except (subprocess.TimeoutExpired, RuntimeError) as e:
            logger.error("Render failed for %s/%s: %s", recipe_name, date, e)
            raise


# Legacy wrapper for backward compatibility with tests and direct invocation
@task(name="render")
def render(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> list[Path]:
    """Render all pending payloads sequentially. Used in test mode."""
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
        try:
            result = render_one.fn(payload_path, renders_dir)
            if result:
                rendered.append(result)
        except (subprocess.TimeoutExpired, RuntimeError) as e:
            logger.error("Render failed: %s", e)
    return rendered
