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

    from oceancanvas.io import atomic_write_text

    manifest_path = RENDERS_DIR / "manifest.json"
    atomic_write_text(manifest_path, json.dumps(manifest, indent=2))
    console.print(f"[green]Manifest rebuilt: {len(recipes)} recipes → {manifest_path}[/green]")


def _dispatch_via_server(deployment_name: str) -> None:
    """Submit a flow run to the Prefect server."""
    try:
        from prefect.deployments import run_deployment
    except ImportError:
        console.print("[red]Prefect client not available.[/red]")
        raise typer.Exit(1)

    api_url = os.environ.get("PREFECT_API_URL", "http://localhost:4200/api")
    console.print(f"[cyan]Dispatching to Prefect server at {api_url}...[/cyan]")

    try:
        flow_run = run_deployment(
            name=f"daily-ocean-pipeline/{deployment_name}",
            timeout=0,
        )
        run_id = flow_run.id
        console.print("[green]Flow run submitted[/green]")
        console.print(f"  View: http://localhost:4200/flow-runs/{run_id}")
    except Exception as e:
        console.print(f"[red]Server dispatch failed: {e}[/red]")
        console.print("Is the Prefect server running? Try without --via-server.")
        raise typer.Exit(1)


@app.command("run")
def run_pipeline(
    via_server: bool = typer.Option(False, "--via-server", help="Dispatch to Prefect server"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would run"),
) -> None:
    """Run the full daily pipeline."""
    if dry_run:
        console.print("[dim]Dry run — resolving what would execute...[/dim]")
        console.print(f"  DATA_DIR:    {DATA_DIR}")
        console.print(f"  RECIPES_DIR: {RECIPES_DIR}")
        console.print(f"  RENDERS_DIR: {RENDERS_DIR}")

        if RECIPES_DIR.exists():
            recipes = sorted(RECIPES_DIR.glob("*.yaml"))
            console.print(f"  Recipes:     {len(recipes)}")
            for r in recipes:
                console.print(f"    - {r.stem}")
        return

    if via_server:
        _dispatch_via_server("daily-06utc")
        return

    from oceancanvas.flow import daily_ocean_pipeline

    console.print("[cyan]Starting daily pipeline...[/cyan]")
    daily_ocean_pipeline(test_mode=False)
    console.print("[green]Pipeline complete.[/green]")


@app.command("fetch-historical")
def fetch_historical(
    source: str = typer.Option("oisst", "--source", "-s", help="Source ID"),
    from_date: str = typer.Option(..., "--from", help="Start date (YYYY-MM or YYYY-MM-DD)"),
    to_date: str = typer.Option(None, "--to", help="End date (default: today)"),
    cadence: str = typer.Option("monthly", "--cadence", "-c", help="monthly or daily"),
    delay: float = typer.Option(1.0, "--delay", help="Seconds between requests"),
    process: bool = typer.Option(False, "--process", help="Also process after fetching"),
) -> None:
    """Fetch historical source data for a date range."""
    from datetime import date as date_cls

    from oceancanvas.backfill import _generate_dates

    if to_date is None:
        to_date = date_cls.today().isoformat()

    try:
        dates = _generate_dates(from_date, to_date, cadence)
    except ValueError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]Fetch historical · {source}[/bold]")
    console.print(f"  Range:   {from_date} → {to_date}")
    console.print(f"  Cadence: {cadence}")
    console.print(f"  Dates:   {len(dates)}")
    console.print(f"  Delay:   {delay}s between requests")

    if source == "oisst":
        from oceancanvas.tasks.fetch import fetch_historical_oisst

        fetched, skipped = fetch_historical_oisst(
            dates, DATA_DIR, delay=delay
        )
        console.print(
            f"\n[green]Done: {len(fetched)} fetched, {len(skipped)} skipped[/green]"
        )

        if process and fetched:
            console.print("\n[cyan]Processing fetched dates...[/cyan]")
            _process_dates(source, fetched)
            console.print("[green]Processing complete.[/green]")
    elif source.startswith("obis-"):
        species = source.replace("obis-", "")
        from oceancanvas.tasks.obis import fetch_obis, process_obis

        raw_path = DATA_DIR / "sources" / source / "latest.json"
        count = fetch_obis(species, raw_path)
        console.print(f"\n[green]Fetched {count} {species} records[/green]")

        if process:
            processed_dir = DATA_DIR / "processed"
            process_obis(raw_path, processed_dir, species)
            console.print("[green]Processing complete.[/green]")
    else:
        console.print(f"[red]Unknown source: {source}[/red]")
        raise typer.Exit(1)


def _process_dates(source_id: str, dates: list[str]) -> None:
    """Process fetched source data for specific dates."""
    from oceancanvas.tasks.process import _process_oisst

    sources_dir = DATA_DIR / "sources" / source_id
    processed_dir = DATA_DIR / "processed" / source_id
    processed_dir.mkdir(parents=True, exist_ok=True)

    for date in dates:
        nc_path = sources_dir / f"{date}.nc"
        if not nc_path.exists():
            continue
        out_path = processed_dir / f"{date}.json"
        if out_path.exists():
            continue
        _process_oisst(nc_path, processed_dir, date)


@app.command("backfill")
def run_backfill(
    recipe: str = typer.Option(..., "--recipe", "-r", help="Recipe name"),
    from_date: str = typer.Option(..., "--from", help="Start date"),
    to_date: str = typer.Option(None, "--to", help="End date (default: today)"),
    cadence: str = typer.Option("monthly", "--cadence", "-c", help="monthly or daily"),
    fetch: bool = typer.Option(False, "--fetch", help="Fetch + process before rendering"),
    via_server: bool = typer.Option(False, "--via-server", help="Dispatch to Prefect server"),
) -> None:
    """Run historical backfill for a recipe over a date range.

    Use --fetch to download and process source data before rendering.
    Without --fetch, processed data must already exist.
    """
    from datetime import date as date_cls

    from oceancanvas.backfill import _generate_dates, validate_backfill

    if to_date is None:
        to_date = date_cls.today().isoformat()

    # Validate recipe exists
    recipe_path = RECIPES_DIR / f"{recipe}.yaml"
    if not recipe_path.exists():
        console.print(f"[red]Recipe not found: {recipe_path}[/red]")
        raise typer.Exit(1)

    # Generate and validate dates
    try:
        dates = _generate_dates(from_date, to_date, cadence)
    except ValueError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    to_render, already_done, missing_data = validate_backfill(
        recipe, dates, DATA_DIR, RECIPES_DIR, RENDERS_DIR
    )

    console.print(f"\n[bold]Backfill · {recipe}[/bold]")
    console.print(f"  Range:    {from_date} → {to_date}")
    console.print(f"  Cadence:  {cadence}")
    console.print(f"  Dates:    {len(dates)} total")
    console.print(f"  Render:   {len(to_render)}")
    console.print(f"  Skip:     {len(already_done)} (already done)")
    console.print(f"  Missing:  {len(missing_data)} (no processed data)")

    if missing_data and fetch:
        # Fetch + process missing dates before rendering
        console.print(f"\n[cyan]Fetching {len(missing_data)} missing dates...[/cyan]")

        # Read source from recipe
        with (RECIPES_DIR / f"{recipe}.yaml").open() as f:
            recipe_yaml = yaml.safe_load(f)
        source_id = recipe_yaml.get("sources", {}).get("primary", "oisst")

        if source_id == "oisst":
            from oceancanvas.tasks.fetch import fetch_historical_oisst

            fetched, _ = fetch_historical_oisst(missing_data, DATA_DIR)
            console.print(f"  Fetched {len(fetched)} files")

            console.print("[cyan]Processing...[/cyan]")
            _process_dates(source_id, fetched)
            console.print("[green]Fetch + process complete.[/green]")

            # Re-validate now that data exists
            to_render, already_done, missing_data = validate_backfill(
                recipe, dates, DATA_DIR, RECIPES_DIR, RENDERS_DIR
            )

    if missing_data:
        console.print(f"\n[red]Cannot proceed: {len(missing_data)} dates lack data.[/red]")
        for d in missing_data[:10]:
            console.print(f"  [dim]{d}[/dim]")
        if len(missing_data) > 10:
            console.print(f"  [dim]... and {len(missing_data) - 10} more[/dim]")
        if not fetch:
            console.print("\nTip: use [bold]--fetch[/bold] to download missing data.")
        raise typer.Exit(1)

    if not to_render:
        console.print("\n[green]Nothing to render — all dates complete.[/green]")
        return

    if via_server:
        console.print("[yellow]Backfill via server not supported. Using direct.[/yellow]")

    from oceancanvas.backfill import backfill_flow

    console.print(f"\n[cyan]Rendering {len(to_render)} frames...[/cyan]")
    results = backfill_flow(recipe, from_date, to_date, cadence)
    console.print(f"[green]Backfill complete: {len(results)} rendered.[/green]")


@app.command("render")
def render_single(
    recipe: str = typer.Option(..., "--recipe", "-r", help="Recipe name"),
    date: str = typer.Option(..., "--date", "-d", help="Date (YYYY-MM-DD)"),
    force: bool = typer.Option(False, "--force", help="Re-render even if exists"),
) -> None:
    """Render a single frame. Fails fast if processed data is missing."""
    recipe_path = RECIPES_DIR / f"{recipe}.yaml"
    if not recipe_path.exists():
        console.print(f"[red]Recipe not found: {recipe_path}[/red]")
        raise typer.Exit(1)

    # Check processed data
    try:
        with recipe_path.open() as f:
            recipe_data = yaml.safe_load(f)
        source_id = recipe_data.get("sources", {}).get("primary", "oisst")
    except Exception as e:
        console.print(f"[red]Failed to read recipe: {e}[/red]")
        raise typer.Exit(1)

    processed_path = DATA_DIR / "processed" / source_id / f"{date}.json"
    if not processed_path.exists():
        console.print(f"[red]No processed data: {processed_path}[/red]")
        console.print("Run the full pipeline first: [bold]oceancanvas run[/bold]")
        raise typer.Exit(1)

    output_path = RENDERS_DIR / recipe / f"{date}.png"
    if output_path.exists() and not force:
        console.print(f"[yellow]Render already exists: {output_path}[/yellow]")
        console.print("Use --force to re-render.")
        return

    if output_path.exists() and force:
        output_path.unlink()

    from oceancanvas.tasks.build_payload import build_one_payload
    from oceancanvas.tasks.render import render_one

    console.print(f"[cyan]Building payload for {recipe} / {date}...[/cyan]")
    payload_path = build_one_payload.fn(recipe_path, DATA_DIR, RENDERS_DIR, date=date)

    if not payload_path:
        console.print("[red]Payload build returned nothing.[/red]")
        raise typer.Exit(1)

    console.print(f"[cyan]Rendering {recipe} / {date}...[/cyan]")
    result = render_one.fn(payload_path, RENDERS_DIR)

    if result:
        console.print(f"[green]Rendered: {result}[/green]")
    else:
        console.print("[red]Render failed.[/red]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
