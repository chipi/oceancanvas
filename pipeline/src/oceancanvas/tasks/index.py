"""Task 06 — Index.

Walks the renders/ directory, collects all PNGs, rebuilds manifest.json
from scratch at renders_dir/manifest.json. Cleans up temp payload files.

The gallery serves this file via Caddy at /renders/manifest.json
(with a convenience alias at /manifest.json).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import yaml
from prefect import task

from oceancanvas.io import atomic_write_text
from oceancanvas.log import get_logger


def _scan_renders(renders_dir: Path) -> dict[str, dict]:
    """Walk renders/ and build the recipes dict for the manifest."""
    recipes: dict[str, dict] = {}

    if not renders_dir.exists():
        return recipes

    for recipe_dir in sorted(renders_dir.iterdir()):
        if not recipe_dir.is_dir():
            continue

        pngs = sorted(recipe_dir.glob("*.png"))
        if not pngs:
            continue

        dates = [p.stem for p in pngs]  # ["2026-04-13", "2026-04-14", ...]
        recipe_name = recipe_dir.name

        recipes[recipe_name] = {
            "name": recipe_name,
            "dates": dates,
            "latest": dates[-1],
            "count": len(dates),
        }

    return recipes


def _read_recipe_metadata(recipes_dir: Path, recipe_name: str) -> dict:
    """Read render_type and other metadata from the recipe YAML if available."""
    recipe_path = recipes_dir / f"{recipe_name}.yaml"
    if not recipe_path.exists():
        return {}
    try:
        with recipe_path.open() as f:
            recipe = yaml.safe_load(f)
        return {
            "render_type": recipe.get("render", {}).get("type", "unknown"),
            "source": recipe.get("sources", {}).get("primary", "unknown"),
        }
    except Exception:
        return {}


def _cleanup_payloads(data_dir: Path) -> int:
    """Remove temp payload files after rendering. Returns count removed."""
    payloads_dir = data_dir / "payloads"
    if not payloads_dir.exists():
        return 0
    removed = 0
    for f in payloads_dir.glob("*.json"):
        f.unlink()
        removed += 1
    return removed


@task(name="index")
def index(data_dir: Path, recipes_dir: Path, renders_dir: Path) -> Path:
    """Rebuild manifest.json from renders/."""
    logger = get_logger()

    recipes = _scan_renders(renders_dir)

    # Enrich with recipe metadata
    for name, entry in recipes.items():
        meta = _read_recipe_metadata(recipes_dir, name)
        entry.update(meta)

    # generated_at is operational metadata, not render output.
    # Determinism (TA §constraints) applies to PNGs — the manifest
    # records when the scan ran and is expected to change on re-run.
    manifest = {
        "generated_at": datetime.now(UTC).isoformat(),
        "recipe_count": len(recipes),
        "recipes": recipes,
    }

    manifest_path = renders_dir / "manifest.json"
    atomic_write_text(manifest_path, json.dumps(manifest, indent=2))
    logger.info("Manifest rebuilt: %d recipes, written to %s", len(recipes), manifest_path)

    # Cleanup temp payloads
    removed = _cleanup_payloads(data_dir)
    if removed:
        logger.info("Cleaned up %d payload files", removed)

    return manifest_path
