"""Shared test fixtures for the OceanCanvas pipeline."""

from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    """Path to the test fixtures directory."""
    return FIXTURES_DIR


@pytest.fixture
def tmp_data_dir(tmp_path: Path) -> Path:
    """Temporary data directory for test outputs."""
    for subdir in ["sources", "processed", "payloads"]:
        (tmp_path / "data" / subdir).mkdir(parents=True)
    (tmp_path / "recipes").mkdir()
    (tmp_path / "renders").mkdir()
    return tmp_path
