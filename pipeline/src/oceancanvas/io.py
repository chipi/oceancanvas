"""I/O helpers — atomic file writes to prevent corruption on crash."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger("oceancanvas.io")


def atomic_write_text(path: Path, content: str) -> None:
    """Write text to path via .tmp → replace. No partial files on crash."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    if tmp.exists():
        logger.warning("Removing orphaned tmp file: %s", tmp)
        tmp.unlink()
    tmp.write_text(content)
    tmp.replace(path)  # atomic on same filesystem, works cross-fs on Python 3.8+


def atomic_write_bytes(path: Path, data: bytes) -> None:
    """Write bytes to path via .tmp → replace. No partial files on crash."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    if tmp.exists():
        logger.warning("Removing orphaned tmp file: %s", tmp)
        tmp.unlink()
    tmp.write_bytes(data)
    tmp.replace(path)
