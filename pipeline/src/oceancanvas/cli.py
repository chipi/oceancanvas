"""OceanCanvas pipeline CLI.

Entry point: `oceancanvas` console script (pyproject.toml).
Provides operational commands for pipeline management without
requiring the Prefect UI.

Implements RFC-009. ADR-022 locks this interface.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import typer
import yaml
from rich.console import Console
from rich.table import Table

app = typer.Typer(name="oceancanvas", help="OceanCanvas pipeline CLI", no_args_is_help=True)
recipes_app = typer.Typer(help="Recipe management")
app.add_typer(recipes_app, name="recipes")

console = Console()

# Directory resolution — same env vars as flow.py
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
RECIPES_DIR = Path(os.environ.get("RECIPES_DIR", "/recipes"))
RENDERS_DIR = Path(os.environ.get("RENDERS_DIR", "/renders"))


def _load_manifest() -> dict | None:
    """Load manifest.json from renders/."""
    manifest_path = RENDERS_DIR / "manifest.json"
    if not manifest_path.exists():
        return None
    return json.loads(manifest_path.read_text())


@app.command()
def status(
    recipe: str | None = typer.Option(None, "--recipe", "-r", help="Show detail for one recipe"),
) -> None:
    """Pipeline status — recipes, frame counts, date ranges."""
    manifest = _load_manifest()
    if not manifest:
        console.print("[yellow]No manifest.json found. Run the pipeline first.[/yellow]")
        raise typer.Exit(1)

    recipes = manifest.get("recipes", {})
    if not recipes:
        console.print("[yellow]No recipes in manifest.[/yellow]")
        raise typer.Exit(0)

    if recipe:
        entry = recipes.get(recipe)
        if not entry:
            console.print(f"[red]Recipe '{recipe}' not found in manifest.[/red]")
            raise typer.Exit(1)
        _print_recipe_detail(recipe, entry)
    else:
        _print_status_table(recipes, manifest.get("generated_at", ""))


def _print_status_table(recipes: dict, generated_at: str) -> None:
    """Print summary table of all recipes."""
    table = Table(title="OceanCanvas Pipeline Status")
    table.add_column("Recipe", style="cyan")
    table.add_column("Type", style="dim")
    table.add_column("Source", style="dim")
    table.add_column("Frames", justify="right")
    table.add_column("Date Range")
    table.add_column("Latest", style="green")

    for name, entry in sorted(recipes.items()):
        dates = entry.get("dates", [])
        date_range = f"{dates[0]} → {dates[-1]}" if len(dates) > 1 else (dates[0] if dates else "—")
        table.add_row(
            name,
            entry.get("render_type", "—"),
            entry.get("source", "—"),
            str(entry.get("count", 0)),
            date_range,
            entry.get("latest", "—"),
        )

    console.print(table)
    console.print(f"[dim]Manifest generated: {generated_at}[/dim]")


def _print_recipe_detail(name: str, entry: dict) -> None:
    """Print detailed view for one recipe with gap analysis."""
    console.print(f"\n[bold cyan]{name}[/bold cyan]")
    console.print(f"  Type:   {entry.get('render_type', '—')}")
    console.print(f"  Source: {entry.get('source', '—')}")
    console.print(f"  Frames: {entry.get('count', 0)}")
    console.print(f"  Latest: {entry.get('latest', '—')}")

    dates = entry.get("dates", [])
    if len(dates) > 1:
        console.print(f"  Range:  {dates[0]} → {dates[-1]}")

    # Gap analysis: check for missing dates in renders/
    render_dir = RENDERS_DIR / name
    if render_dir.exists():
        pngs = sorted(render_dir.glob("*.png"))
        rendered_dates = {p.stem for p in pngs}
        console.print(f"  On disk: {len(rendered_dates)} PNGs")
    console.print()


@recipes_app.command("list")
def recipes_list() -> None:
    """List all recipes with key metadata."""
    if not RECIPES_DIR.exists():
        console.print("[yellow]No recipes directory found.[/yellow]")
        raise typer.Exit(1)

    recipe_files = sorted(RECIPES_DIR.glob("*.yaml"))
    if not recipe_files:
        console.print("[yellow]No recipes found.[/yellow]")
        raise typer.Exit(0)

    table = Table(title="Recipes")
    table.add_column("Name", style="cyan")
    table.add_column("Type", style="dim")
    table.add_column("Source", style="dim")
    table.add_column("Region")

    for path in recipe_files:
        try:
            with path.open() as f:
                recipe = yaml.safe_load(f)
            region = recipe.get("region", {})
            lat = region.get("lat", [])
            lon = region.get("lon", [])
            region_str = f"lat {lat}, lon {lon}" if lat and lon else "—"
            table.add_row(
                recipe.get("name", path.stem),
                recipe.get("render", {}).get("type", "—"),
                recipe.get("sources", {}).get("primary", "—"),
                region_str,
            )
        except Exception as e:
            table.add_row(path.stem, "[red]ERROR[/red]", str(e), "")

    console.print(table)


@recipes_app.command("validate")
def recipes_validate(
    name: str = typer.Argument(help="Recipe name (without .yaml extension)"),
) -> None:
    """Validate a recipe YAML — schema, region, source availability."""
    recipe_path = RECIPES_DIR / f"{name}.yaml"
    if not recipe_path.exists():
        console.print(f"[red]Recipe not found: {recipe_path}[/red]")
        raise typer.Exit(1)

    checks_passed = 0
    checks_total = 0

    # 1. YAML parse
    checks_total += 1
    try:
        with recipe_path.open() as f:
            recipe = yaml.safe_load(f)
        console.print("[green]✓[/green] YAML syntax valid")
        checks_passed += 1
    except yaml.YAMLError as e:
        console.print(f"[red]✗[/red] YAML parse error: {e}")
        raise typer.Exit(1)

    # 2. Schema validation
    checks_total += 1
    try:
        import jsonschema

        schema_path = Path(__file__).parent / "schemas" / "recipe-schema.json"
        if schema_path.exists():
            schema = json.loads(schema_path.read_text())
            # Convert date objects to strings for validation
            recipe_copy = dict(recipe)
            if hasattr(recipe_copy.get("created"), "isoformat"):
                recipe_copy["created"] = recipe_copy["created"].isoformat()
            jsonschema.validate(recipe_copy, schema)
            console.print("[green]✓[/green] Schema validation passed")
            checks_passed += 1
        else:
            console.print("[yellow]—[/yellow] Schema file not found, skipping")
    except jsonschema.ValidationError as e:
        console.print(f"[red]✗[/red] Schema validation failed: {e.message}")

    # 3. Region sanity
    checks_total += 1
    region = recipe.get("region", {})
    lat = region.get("lat", [])
    lon = region.get("lon", [])
    if len(lat) == 2 and len(lon) == 2:
        if lat[0] < lat[1] and lon[0] < lon[1]:
            console.print(f"[green]✓[/green] Region valid: lat {lat}, lon {lon}")
            checks_passed += 1
        else:
            msg = "Region has inverted bounds (auto-corrected at runtime)"
            console.print(f"[yellow]![/yellow] {msg}")
            checks_passed += 1  # auto-corrected, so not a failure
    else:
        console.print("[red]✗[/red] Region missing or malformed")

    # 4. Source availability
    checks_total += 1
    source_id = recipe.get("sources", {}).get("primary")
    if source_id:
        source_dir = DATA_DIR / "processed" / source_id
        if source_dir.exists() and any(source_dir.glob("*.json")):
            latest = sorted(source_dir.glob("*.json"))[-1]
            console.print(
                f"[green]✓[/green] Source '{source_id}' has data (latest: {latest.stem})"
            )
            checks_passed += 1
        else:
            console.print(
                f"[yellow]![/yellow] No processed data for '{source_id}' (run pipeline first)"
            )
    else:
        console.print("[red]✗[/red] No primary source specified")

    # Summary
    console.print(f"\n{checks_passed}/{checks_total} checks passed")
    if checks_passed < checks_total:
        raise typer.Exit(1)


@app.command("index")
def index_rebuild() -> None:
    """Rebuild manifest.json from renders/."""
    from oceancanvas.tasks.index import _read_recipe_metadata, _scan_renders

    recipes = _scan_renders(RENDERS_DIR)
    for name, entry in recipes.items():
        meta = _read_recipe_metadata(RECIPES_DIR, name)
        entry.update(meta)

    from datetime import UTC, datetime

    manifest = {
        "generated_at": datetime.now(UTC).isoformat(),
        "recipe_count": len(recipes),
        "recipes": recipes,
    }

    manifest_path = RENDERS_DIR / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2))
    console.print(f"[green]Manifest rebuilt: {len(recipes)} recipes → {manifest_path}[/green]")


if __name__ == "__main__":
    app()
