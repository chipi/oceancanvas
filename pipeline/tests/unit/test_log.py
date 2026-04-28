"""Tests for the logging helper."""

import logging

from oceancanvas.log import get_logger


def test_returns_stdlib_logger_outside_prefect_context():
    """Outside a Prefect flow/task, get_logger falls back to stdlib."""
    logger = get_logger()
    assert isinstance(logger, logging.Logger)


def test_returns_named_logger():
    """The fallback logger uses the provided name."""
    logger = get_logger("test.custom")
    assert logger.name == "test.custom"


def test_default_name_is_oceancanvas():
    """Without a name argument, defaults to 'oceancanvas'."""
    logger = get_logger()
    assert logger.name == "oceancanvas"
