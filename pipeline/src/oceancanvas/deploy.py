"""Register the daily pipeline flow with Prefect Server.

Run once on container startup to set up the CronSchedule.
Idempotent — safe to run multiple times.
"""

from prefect.deployments import Deployment
from prefect.server.schemas.schedules import CronSchedule

from oceancanvas.flow import daily_ocean_pipeline


def deploy() -> None:
    """Create or update the deployment with daily 06:00 UTC schedule."""
    deployment = Deployment.build_from_flow(
        flow=daily_ocean_pipeline,
        name="daily-06utc",
        schedule=CronSchedule(cron="0 6 * * *", timezone="UTC"),
        work_pool_name="default-agent-pool",
    )
    deployment.apply()
    print("Deployment registered: daily_ocean_pipeline/daily-06utc @ 06:00 UTC")


if __name__ == "__main__":
    deploy()
