"""Logging helper — Prefect logger when available, stdlib fallback otherwise."""

from __future__ import annotations

import logging


def get_logger(name: str = "oceancanvas") -> logging.Logger:
    """Return Prefect run logger if in a flow/task context, else stdlib logger."""
    try:
        from prefect import get_run_logger

        return get_run_logger()
    except Exception:
        return logging.getLogger(name)
