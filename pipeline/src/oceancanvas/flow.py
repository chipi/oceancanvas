"""OceanCanvas daily pipeline flow.

Wires the six canonical tasks into a single Prefect flow.
Uses ConcurrentTaskRunner for parallel payload building and rendering.
Run via serve (deploy.py), CLI (oceancanvas run), or directly: python -m oceancanvas.flow
"""

import fcntl
import logging
import os
import sys
from pathlib import Path

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from oceancanvas.log import get_logger
from oceancanvas.tasks.build_payload import build_one_payload, build_payload
from oceancanvas.tasks.discover import discover
from oceancanvas.tasks.fetch import fetch
from oceancanvas.tasks.index import index
from oceancanvas.tasks.process import process
from oceancanvas.tasks.render import cleanup_workers, render, render_one


def _exec_task(
    task_obj: object,
    use_prefect_tasks: bool,
    /,
    *args: object,
    **kwargs: object,
) -> object:
    """Run a Prefect task inside the flow (tracked) or as a plain call (e2e --test-mode).

    Calling a @task-decorated function outside an active flow starts Prefect's ephemeral
    API and breaks EventsWorker when the process exits — avoid that for `python -m ... --test-mode`.
    """
    if use_prefect_tasks:
        return task_obj(*args, **kwargs)  # type: ignore[operator]
    fn = getattr(task_obj, "fn", None)
    if fn is None:
        raise TypeError("Expected a Prefect task object with a .fn wrapper")
    return fn(*args, **kwargs)


@flow(name="daily_ocean_pipeline", log_prints=True, task_runner=ConcurrentTaskRunner())
def daily_ocean_pipeline(test_mode: bool = False) -> None:
    """Daily pipeline: discover, fetch, process, build_payload, render, index.

    In normal mode: build_payload and render fan out per recipe via .submit().
    In test mode: runs sequentially using legacy wrapper tasks.
    """
    logger = get_logger()
    data_dir = Path(os.environ.get("DATA_DIR", "/data"))
    recipes_dir = Path(os.environ.get("RECIPES_DIR", "/recipes"))
    renders_dir = Path(os.environ.get("RENDERS_DIR", "/renders"))
    _run_pipeline_core(
        data_dir=data_dir,
        recipes_dir=recipes_dir,
        renders_dir=renders_dir,
        test_mode=test_mode,
        logger=logger,
        use_prefect_tasks=True,
    )


def _run_pipeline_core(
    data_dir: Path,
    recipes_dir: Path,
    renders_dir: Path,
    test_mode: bool,
    logger: logging.Logger,
    *,
    use_prefect_tasks: bool = True,
) -> None:
    """Run pipeline logic independent of Prefect flow wiring."""

    # File lock prevents concurrent pipeline runs from corrupting shared files.
    lock_path = data_dir / ".pipeline.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = lock_path.open("w")
    try:
        fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        logger.error("Another pipeline run is in progress. Exiting.")
        lock_file.close()
        return
    try:
        if test_mode:
            logger.info("Test mode: skipping discover and fetch")
            dates_to_fetch = {}
        else:
            dates_to_fetch = _exec_task(
                discover,
                use_prefect_tasks,
                data_dir,
                recipes_dir,
                renders_dir,
            )
            _exec_task(
                fetch,
                use_prefect_tasks,
                data_dir,
                recipes_dir,
                renders_dir,
                dates_to_fetch=dates_to_fetch,
            )

        _exec_task(process, use_prefect_tasks, data_dir, recipes_dir, renders_dir)

        if test_mode:
            # Sequential mode for test — simpler, no threading
            _exec_task(build_payload, use_prefect_tasks, data_dir, recipes_dir, renders_dir)
            _exec_task(render, use_prefect_tasks, data_dir, recipes_dir, renders_dir)
        else:
            # Parallel mode: fan out per recipe
            _parallel_build_and_render(data_dir, recipes_dir, renders_dir, logger)

        _exec_task(index, use_prefect_tasks, data_dir, recipes_dir, renders_dir)

        logger.info("Pipeline complete")
    finally:
        fcntl.flock(lock_file, fcntl.LOCK_UN)
        lock_file.close()


def _parallel_build_and_render(
    data_dir: Path, recipes_dir: Path, renders_dir: Path, logger: object
) -> None:
    """Fan out payload building and rendering across recipes."""
    if not recipes_dir.exists():
        return

    recipe_files = sorted(recipes_dir.glob("*.yaml"))
    if not recipe_files:
        return

    # Fan out: build payloads in parallel
    payload_futures = [
        build_one_payload.submit(recipe_path, data_dir, renders_dir) for recipe_path in recipe_files
    ]
    payload_paths = [f.result() for f in payload_futures if f.result() is not None]

    if not payload_paths:
        return

    # Fan out: render in parallel (concurrency bounded by semaphore in render_one)
    render_futures = [
        render_one.submit(payload_path, renders_dir) for payload_path in payload_paths
    ]

    # Collect results, log failures, then clean up workers
    try:
        for future in render_futures:
            try:
                future.result()
            except Exception as e:
                logger.error("Render task failed: %s", e)
    finally:
        cleanup_workers()


if __name__ == "__main__":
    test_mode = "--test-mode" in sys.argv
    if test_mode:
        # Keep e2e test-mode deterministic and quiet by avoiding Prefect runtime services.
        logger = get_logger()
        _run_pipeline_core(
            data_dir=Path(os.environ.get("DATA_DIR", "/data")),
            recipes_dir=Path(os.environ.get("RECIPES_DIR", "/recipes")),
            renders_dir=Path(os.environ.get("RENDERS_DIR", "/renders")),
            test_mode=True,
            logger=logger,
            use_prefect_tasks=False,
        )
    else:
        daily_ocean_pipeline(test_mode=False)
