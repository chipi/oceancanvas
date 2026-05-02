"""Task 05 — Render.

Per recipe: renders a payload via Puppeteer + p5.js sketch.

Two rendering backends:
- **Single mode**: spawns a fresh Node/Chromium process per render (simple, used in tests)
- **Worker mode**: persistent Chromium instance via NDJSON protocol (fast, used in production)

Parallelised via ConcurrentTaskRunner in flow.py — each payload is
rendered as a separate Prefect task, with concurrency bounded by
RENDER_CONCURRENCY (constants.py). Each concurrency slot owns one
persistent Chromium worker, reused across all renders on that thread.
"""

from __future__ import annotations

import os
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
_render_semaphore = threading.Semaphore(RENDER_CONCURRENCY)

# Whether to use persistent workers.
# Disabled by default — worker mode needs further stabilization (#46).
# Enable via RENDER_USE_WORKERS=1 env var once validated in Docker.
_USE_WORKERS = os.environ.get("RENDER_USE_WORKERS", "0") == "1"


class ChromiumWorker:
    """Persistent Chromium instance for batch rendering.

    Communicates with render.mjs --worker via NDJSON on stdin
    and length-prefixed PNG on stdout. The browser stays alive
    across renders, eliminating ~3-5s startup cost per frame.
    """

    def __init__(self) -> None:
        self._proc = subprocess.Popen(
            ["node", str(RENDERER_PATH), "--worker"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Start stderr drain thread to prevent pipe buffer deadlock
        self._stderr_lines: list[str] = []
        self._stderr_thread = threading.Thread(
            target=self._drain_stderr, daemon=True
        )
        self._stderr_thread.start()

        # Wait for ready signal
        self._wait_ready()

    def _drain_stderr(self) -> None:
        """Read stderr in background to prevent pipe buffer filling."""
        assert self._proc.stderr is not None
        for line in self._proc.stderr:
            text = line.decode("utf-8", errors="replace").strip()
            if text:
                self._stderr_lines.append(text)

    def _wait_ready(self, timeout: float = 30.0) -> None:
        """Wait for 'worker:ready' signal on stderr."""
        import time

        start = time.monotonic()
        while time.monotonic() - start < timeout:
            if any("worker:ready" in line for line in self._stderr_lines):
                return
            if self._proc.poll() is not None:
                msg = f"Worker exited during startup (code {self._proc.returncode})"
                raise RuntimeError(msg)
            time.sleep(0.05)
        msg = "Worker did not signal ready within timeout"
        raise RuntimeError(msg)

    @property
    def alive(self) -> bool:
        return self._proc.poll() is None

    def render(self, payload_path: Path, output_path: Path) -> None:
        """Send payload to worker, receive PNG, write atomically."""
        if not self.alive:
            msg = "Worker process has exited"
            raise RuntimeError(msg)

        assert self._proc.stdin is not None
        assert self._proc.stdout is not None

        payload_bytes = payload_path.read_bytes()
        self._proc.stdin.write(payload_bytes + b"\n")
        self._proc.stdin.flush()

        # Read 4-byte big-endian length prefix
        len_bytes = self._proc.stdout.read(4)
        if not len_bytes or len(len_bytes) < 4:
            errors = "\n".join(self._stderr_lines[-5:])
            msg = f"Worker returned no data. stderr: {errors}"
            raise RuntimeError(msg)

        png_len = int.from_bytes(len_bytes, "big")
        if png_len == 0 or png_len > 50 * 1024 * 1024:
            msg = f"Invalid PNG length from worker: {png_len}"
            raise RuntimeError(msg)

        png_bytes = b""
        while len(png_bytes) < png_len:
            chunk = self._proc.stdout.read(png_len - len(png_bytes))
            if not chunk:
                msg = "Worker stream ended before full PNG received"
                raise RuntimeError(msg)
            png_bytes += chunk

        if not png_bytes.startswith(PNG_HEADER):
            msg = f"Worker produced invalid output ({len(png_bytes)} bytes, not PNG)"
            raise RuntimeError(msg)

        atomic_write_bytes(output_path, png_bytes)

    def close(self) -> None:
        """Send shutdown sentinel and wait for clean exit."""
        if not self.alive:
            return
        try:
            assert self._proc.stdin is not None
            self._proc.stdin.write(b'{"__done":true}\n')
            self._proc.stdin.flush()
            self._proc.wait(timeout=10)
        except Exception:
            self._proc.kill()
            self._proc.wait(timeout=5)


# Thread-local persistent Chromium workers (one per concurrency slot).
_thread_workers: dict[int, ChromiumWorker] = {}
_worker_lock = threading.Lock()


def _get_worker() -> ChromiumWorker:
    """Get or create a ChromiumWorker for the current thread."""
    tid = threading.get_ident()
    if tid in _thread_workers and _thread_workers[tid].alive:
        return _thread_workers[tid]
    with _worker_lock:
        if tid not in _thread_workers or not _thread_workers[tid].alive:
            _thread_workers[tid] = ChromiumWorker()
        return _thread_workers[tid]


def cleanup_workers() -> None:
    """Close all persistent Chromium workers. Call after rendering is done."""
    with _worker_lock:
        for worker in _thread_workers.values():
            worker.close()
        _thread_workers.clear()


def _render_one(payload_path: Path, output_path: Path) -> None:
    """Spawn the Node renderer subprocess for one payload (single mode)."""
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


def _render_with_worker(payload_path: Path, output_path: Path) -> None:
    """Render using a persistent Chromium worker (worker mode).

    Falls back to single mode if worker cannot be started (e.g. no
    Chromium binary outside Docker).
    """
    try:
        worker = _get_worker()
    except RuntimeError:
        # Worker spawn failed — fall back to single mode
        logger = get_logger()
        logger.info("Worker mode unavailable, falling back to single mode")
        _render_one(payload_path, output_path)
        return

    try:
        worker.render(payload_path, output_path)
    except RuntimeError:
        # Worker crashed mid-render — remove it so a new one is created on retry
        tid = threading.get_ident()
        with _worker_lock:
            if tid in _thread_workers:
                _thread_workers[tid].close()
                del _thread_workers[tid]
        raise


@task(name="render_one", timeout_seconds=120, retries=1, retry_delay_seconds=10)
def render_one(payload_path: Path, renders_dir: Path) -> Path | None:
    """Render one payload file via Puppeteer + p5.js.

    Designed for parallel dispatch via .submit() in the flow.
    Uses persistent Chromium workers when _USE_WORKERS is True.
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
            if _USE_WORKERS:
                _render_with_worker(payload_path, output_path)
            else:
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
    # Temporarily disable workers for sequential mode (tests, test-mode)
    global _USE_WORKERS  # noqa: PLW0603
    prev = _USE_WORKERS
    _USE_WORKERS = False
    try:
        for payload_path in payload_files:
            try:
                result = render_one.fn(payload_path, renders_dir)
                if result:
                    rendered.append(result)
            except (subprocess.TimeoutExpired, RuntimeError) as e:
                logger.error("Render failed: %s", e)
    finally:
        _USE_WORKERS = prev
    return rendered
