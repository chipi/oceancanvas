# Quickstart — your first render in five minutes

This is the fastest path from `git clone` to a real ocean PNG on your screen. If you want the full local-dev setup including manual pipeline runs and contribution paths, jump to [`get-started.md`](get-started.md).

## Prerequisites

You need [Docker](https://docs.docker.com/get-docker/) running. Nothing else — the rest is bundled in the containers.

## 1. Clone and start the stack — 2 minutes

```bash
git clone https://github.com/chipi/oceancanvas.git
cd oceancanvas
docker compose up
```

Five containers start: pipeline, gallery, Prefect (orchestration), Postgres (Prefect state), and the recipe save server. Wait until you see `[gallery] Ready`.

## 2. Trigger a pipeline run — 1 minute

The pipeline runs automatically at 06:00 UTC, but the first time you boot the stack there's nothing rendered yet. Trigger one now:

```bash
make pipeline-run
```

You'll see logs scroll by — `discover` → `fetch` → `process` → `build_payload` → `render` → `index`. The first run takes ~60 seconds because Chromium starts cold; subsequent runs are faster.

## 3. Open the gallery — 30 seconds

Open [http://localhost:8080](http://localhost:8080) in any browser. The front page fills with today's renders across the 11 starter recipes. Click any tile to view that recipe's history; click `recipe ↗` to see how it was authored; click `timelapse ↗` to assemble a video.

![OceanCanvas gallery — what you'll see at localhost:8080](concept/images/gallery_front_page.png)

## 4. Make it yours — 1 minute

Visit [http://localhost:8080/recipes/new](http://localhost:8080/recipes/new) — the Recipe Editor.

Pick a region by clicking the map. Drag the energy × presence quadrant. Pick a mood preset. The render preview updates live. Hit `Save recipe`. The next pipeline run renders it; trigger one immediately with `make pipeline-run`.

If you'd rather author by hand, drop a YAML file in `recipes/`:

```yaml
name: my-first-recipe
created: 2026-05-04
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
audio:
  drone_waveform: triangle
  drone_glide: 0.4
  pulse_sensitivity: 0.4
  presence: 0.7
  accent_style: chime
  texture_density: 0.35
tension_arc:
  preset: classic
  peak_position: 0.65
  peak_height: 1.0
  release_steepness: 0.7
  pin_key_moment: true
```

The full field-by-field reference is in [`recipes/README.md`](../recipes/README.md). The render-type taxonomy (`field` / `scatter` / `particles` / `contour` / `pulse` / `composite`) is there too.

## 5. Make a video — 30 seconds

Click `timelapse ↗` on any recipe with multiple renders. Hit play in the Video Editor; pick a preset from the audio picker; drag the tension-arc peak; click `download`. The popup walks you through `Render & download` → `Download MP4`.

The exported MP4 is bundled with generative audio that follows the data — image and audio shaped by a single authored curve. At record-breaking frames the video holds for a beat and the music drops to drone. PRD-006 explains why.

## What's next

- **[`recipes/README.md`](../recipes/README.md)** — author your own recipes (field reference, render types, audio block, tension arc).
- **[`docs/get-started.md`](get-started.md)** — local dev setup (Vite, save server, manual pipeline runs).
- **[`docs/concept/`](concept/)** — the project's vision, in six 100–250 line documents.
- **[`docs/adr/`](adr/) / [`docs/rfc/`](rfc/)** — technical decisions and open questions.

If you hit a snag, jump to [`get-started.md` § Troubleshooting](get-started.md#troubleshooting).
