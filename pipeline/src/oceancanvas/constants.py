"""Shared constants for the OceanCanvas pipeline.

Single source of truth for values used across multiple tasks.
Changes here propagate to all tasks that import them.
"""

import os

# NaN placeholder in processed JSON and render payloads.
# Sketches check for this value (shared.js NAN_VALUE = -999.0).
NAN_VALUE = -999.0

# Maximum concurrent Chromium render workers (RFC-008).
# Each worker holds one Chromium instance (~300 MB RSS).
# Default 6 is conservative for 48 GB RAM; tune per host.
RENDER_CONCURRENCY = int(os.environ.get("RENDER_CONCURRENCY", "6"))

# Processing region — North Atlantic, wider than any single recipe.
# Used by fetch (ERDDAP crop) and argo (index filter).
PROCESSING_REGION = {
    "lat_min": 20.0,
    "lat_max": 75.0,
    "lon_min": -90.0,
    "lon_max": 10.0,
}
