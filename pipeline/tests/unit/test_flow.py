"""Tests for the pipeline flow wiring."""

from unittest.mock import MagicMock, patch

from oceancanvas.flow import daily_ocean_pipeline


@patch("oceancanvas.flow.index")
@patch("oceancanvas.flow.render")
@patch("oceancanvas.flow.build_payload")
@patch("oceancanvas.flow.process")
@patch("oceancanvas.flow.fetch")
@patch("oceancanvas.flow.discover")
def test_flow_calls_all_tasks_in_order(
    mock_discover, mock_fetch, mock_process, mock_build, mock_render, mock_index
):
    """All six tasks are called in the correct sequence."""
    mock_discover.return_value = {"oisst": "2026-01-15"}

    # Track call order via a shared manager
    manager = MagicMock()
    manager.attach_mock(mock_discover, "discover")
    manager.attach_mock(mock_fetch, "fetch")
    manager.attach_mock(mock_process, "process")
    manager.attach_mock(mock_build, "build_payload")
    manager.attach_mock(mock_render, "render")
    manager.attach_mock(mock_index, "index")

    daily_ocean_pipeline.fn(test_mode=False)

    # Extract the method names in call order
    call_names = [c[0] for c in manager.method_calls]
    assert call_names == ["discover", "fetch", "process", "build_payload", "render", "index"]


@patch("oceancanvas.flow.index")
@patch("oceancanvas.flow.render")
@patch("oceancanvas.flow.build_payload")
@patch("oceancanvas.flow.process")
@patch("oceancanvas.flow.fetch")
@patch("oceancanvas.flow.discover")
def test_flow_passes_discover_dates_to_fetch(
    mock_discover, mock_fetch, mock_process, mock_build, mock_render, mock_index
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
