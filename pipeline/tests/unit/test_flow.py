"""Tests for the pipeline flow wiring."""

import os
from unittest.mock import patch

import pytest

from oceancanvas.flow import daily_ocean_pipeline


@pytest.fixture(autouse=True)
def _flow_env(tmp_path):
    """Set DATA_DIR so the lock file goes to a temp directory."""
    with patch.dict(
        os.environ,
        {
            "DATA_DIR": str(tmp_path / "data"),
            "RECIPES_DIR": str(tmp_path / "recipes"),
            "RENDERS_DIR": str(tmp_path / "renders"),
        },
    ):
        (tmp_path / "data").mkdir()
        (tmp_path / "recipes").mkdir()
        (tmp_path / "renders").mkdir()
        yield


@patch("oceancanvas.flow.index")
@patch("oceancanvas.flow.render")
@patch("oceancanvas.flow.build_payload")
@patch("oceancanvas.flow.process")
@patch("oceancanvas.flow.fetch")
@patch("oceancanvas.flow.discover")
def test_flow_test_mode_calls_sequential_tasks(
    mock_discover, mock_fetch, mock_process, mock_build, mock_render, mock_index
):
    """test_mode=True uses sequential wrappers for all six tasks."""
    daily_ocean_pipeline.fn(test_mode=True)

    mock_discover.assert_not_called()
    mock_fetch.assert_not_called()
    mock_process.assert_called_once()
    mock_build.assert_called_once()
    mock_render.assert_called_once()
    mock_index.assert_called_once()


@patch("oceancanvas.flow.index")
@patch("oceancanvas.flow._parallel_build_and_render")
@patch("oceancanvas.flow.process")
@patch("oceancanvas.flow.fetch")
@patch("oceancanvas.flow.discover")
def test_flow_normal_mode_calls_parallel_path(
    mock_discover, mock_fetch, mock_process, mock_parallel, mock_index
):
    """Normal mode calls discover → fetch → process → parallel build+render → index."""
    mock_discover.return_value = {"oisst": "2026-01-15"}

    daily_ocean_pipeline.fn(test_mode=False)

    mock_discover.assert_called_once()
    mock_fetch.assert_called_once()
    mock_process.assert_called_once()
    mock_parallel.assert_called_once()
    mock_index.assert_called_once()


@patch("oceancanvas.flow.index")
@patch("oceancanvas.flow._parallel_build_and_render")
@patch("oceancanvas.flow.process")
@patch("oceancanvas.flow.fetch")
@patch("oceancanvas.flow.discover")
def test_flow_passes_discover_dates_to_fetch(
    mock_discover, mock_fetch, mock_process, mock_parallel, mock_index
):
    """Discover output is passed as dates_to_fetch to fetch."""
    mock_discover.return_value = {"oisst": "2026-04-13"}

    daily_ocean_pipeline.fn(test_mode=False)

    fetch_call = mock_fetch.call_args
    assert fetch_call.kwargs["dates_to_fetch"] == {"oisst": "2026-04-13"}


@patch("oceancanvas.flow.index")
@patch("oceancanvas.flow.render")
@patch("oceancanvas.flow.build_payload")
@patch("oceancanvas.flow.process")
@patch("oceancanvas.flow.fetch")
@patch("oceancanvas.flow.discover")
def test_flow_test_mode_skips_discover_and_fetch(
    mock_discover, mock_fetch, mock_process, mock_build, mock_render, mock_index
):
    """test_mode=True skips discover and fetch, runs remaining tasks."""
    daily_ocean_pipeline.fn(test_mode=True)

    mock_discover.assert_not_called()
    mock_fetch.assert_not_called()
    mock_process.assert_called_once()
    mock_build.assert_called_once()
    mock_render.assert_called_once()
    mock_index.assert_called_once()
