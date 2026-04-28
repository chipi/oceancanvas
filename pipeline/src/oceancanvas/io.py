"""I/O helpers — atomic file writes to prevent corruption on crash."""

from __future__ import annotations

from pathlib import Path


def atomic_write_text(path: Path, content: str) -> None:
    """Write text to path via .tmp rename — no partial files on crash."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content)
    tmp.rename(path)


def atomic_write_bytes(path: Path, data: bytes) -> None:
    """Write bytes to path via .tmp rename — no partial files on crash."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.rename(path)
