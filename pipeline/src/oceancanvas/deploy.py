"""Start the OceanCanvas pipeline as a Prefect 3 served deployment.

Prefect 3 uses flow.serve() which blocks and handles scheduling in-process.
No separate worker needed — this process IS the worker.

The Docker container runs this as its main command.
Manual trigger: make pipeline-run (via prefect deployment run)
"""

import os

import sentry_sdk

from oceancanvas.flow import daily_ocean_pipeline

# Initialise Sentry if DSN is set
dsn = os.environ.get("SENTRY_DSN")
if dsn:
    sentry_sdk.init(dsn=dsn, environment=os.environ.get("SENTRY_ENVIRONMENT", "development"))


def main() -> None:
    """Serve the pipeline flow with daily 06:00 UTC schedule."""
    daily_ocean_pipeline.serve(
        name="daily-06utc",
        cron="0 6 * * *",
    )


if __name__ == "__main__":
    main()
