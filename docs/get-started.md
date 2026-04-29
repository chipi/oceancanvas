# Get Started

## Run it

```bash
git clone https://github.com/chipi/oceancanvas.git
cd oceancanvas
docker compose up
```

Five containers start: the pipeline, the gallery, Prefect (orchestration), Postgres (Prefect state), and the recipe save server.

| Service | URL |
|---|---|
| Gallery | `localhost:8080` |
| Prefect UI | `localhost:4200` |
| Recipe save server | `localhost:3001` |

The pipeline runs daily at 06:00 UTC. Manual runs trigger via the Prefect UI or:

```bash
make pipeline-run
```

---

## First-time setup (local development)

```bash
bash scripts/setup.sh
```

This checks prerequisites (Python 3.12, Node 20, Docker), installs dependencies, creates `.env` from the template, and validates the installation.

After setup:

```bash
# Terminal 1: serve data + renders
python3 -m http.server 8080

# Terminal 2: Vite dev server + save server
make gallery-dev
```

Gallery at `localhost:5173`. Changes hot-reload.

---

## Add a recipe

Drop a YAML file in `recipes/`:

```yaml
name: my-recipe
created: 2026-04-29
author: you
region:
  lat: [25, 65]
  lon: [-80, 0]
  name: North Atlantic
sources:
  primary: oisst
schedule: daily

# ⊓ creative controls ⊓
render:
  type: field
  colormap: thermal
  opacity: 0.85
  smooth: true
  seed: 42
```

Or use the Recipe Editor at `localhost:8080/recipes/new`.

The next pipeline run picks it up and renders it.

---

## Run the pipeline manually

```bash
export DATA_DIR=$PWD/data RECIPES_DIR=$PWD/recipes RENDERS_DIR=$PWD/renders
export PUPPETEER_EXECUTABLE_PATH="/path/to/chromium"
export SKETCHES_DIR=$PWD/sketches
cd pipeline && uv run python -m oceancanvas.flow
```

---

## What you need

| Tool | Version |
|---|---|
| Python | 3.12+ |
| Node.js | 20+ |
| Docker | Latest |
| uv | Latest |

No API keys. No accounts. No cloud dependencies.
