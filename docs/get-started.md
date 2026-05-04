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

---

## Troubleshooting

The most common things that go wrong on first run, and how to unstick them.

### `docker compose up` exits immediately or hangs

- **Docker Desktop not running.** On macOS / Windows, the Docker daemon has to be started before any compose command. Open Docker Desktop, wait for it to say "Docker is running."
- **Permission denied on `/var/run/docker.sock` (Linux).** Add your user to the `docker` group: `sudo usermod -aG docker $USER`, then log out and back in.
- **Port 8080 already in use.** Another process is bound to the gallery port. Stop it (`lsof -i :8080` to find), or override: `GALLERY_PORT=8090 docker compose up`. Same for 4200 (Prefect UI) and 3001 (save server).

### Pipeline never runs / renders never appear

- **The pipeline runs at 06:00 UTC by default.** First-time runs don't auto-trigger. To render now: `make pipeline-run`, or open Prefect UI at `localhost:4200` and trigger the `daily` flow manually.
- **Source data missing.** Pipeline needs `data/processed/<source>/` to exist. Run `uv run oceancanvas fetch-historical --source oisst --year 2026` (or the relevant source/year) to seed.
- **Chromium not found.** The renderer uses Puppeteer + headless Chromium. Inside Docker this is bundled; on a local pipeline run, set `PUPPETEER_EXECUTABLE_PATH` to your Chromium binary or install via `npx puppeteer browsers install chromium`.

### Gallery loads but no renders show

- **Open the right URL.** Docker → `localhost:8080`. Local Vite dev → `localhost:5173` (NOT 8080 — `make gallery-dev` runs on a different port).
- **Empty `renders/`.** Trigger a manual pipeline run (above). The gallery reads `renders/manifest.json`; if no PNGs exist, the manifest is empty.
- **Browser cache.** Hard-reload the page (`Cmd-Shift-R` / `Ctrl-Shift-R`) — manifest is cached aggressively.

### Local dev: Vite or save server fail to start

- **Python 3.12 not found.** macOS users on system Python: install via `brew install python@3.12` or `pyenv install 3.12`. `uv` will pick up the right version automatically once it's on PATH.
- **Node 20 not on PATH.** `make gallery-dev` uses npm scripts that assume Node 20+. If you have multiple Node versions, `nvm use 20` before running.
- **`uv: command not found`.** Install: `curl -LsSf https://astral.sh/uv/install.sh | sh`.

### Audio doesn't play in the Video Editor

- **Browser autoplay policy.** Audio context can't start without a user gesture. Click the play button — clicking the canvas isn't enough on Safari.
- **Sample assets missing.** Confirm `audio/generative/` contains the seven MP3s. If it's empty, run `bash scripts/build-audio-assets.sh` to regenerate them via ffmpeg.

### Export-video fails / produces silent MP4

- **ffmpeg not in PATH.** Inside Docker it is; locally check `ffmpeg -version`.
- **No time-series data.** Audio synthesis reads `data/processed/<source>/sst-monthly-series.json` (or `time-series.json`). If absent, the export falls back to silent.
- **Sample bank not loaded.** Confirm `audio/generative/` is populated; same as above.

### Still stuck

- Check logs: `docker compose logs pipeline` (or `gallery` / `prefect` / `recipe-server`).
- Verify the manifest: `cat renders/manifest.json | head` — if it's `{ "recipes": {} }`, the pipeline hasn't run yet.
- Open an issue with the failing command, error output, OS, and what you tried. The maintainer reads them.
