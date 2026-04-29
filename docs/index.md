# OceanCanvas

> Generative ocean art that the data performs daily.

A pipeline runs at 06:00 UTC, fetches today's ocean data from open scientific sources, and renders it through authored recipes. Every day adds a frame. A recipe running for a year is a year of art — the same authored character, the ocean changing underneath it. The gallery walks itself forward without curation.

---

## What this is

Three ideas hold the project together.

**The recipe.** A YAML file authored by a person — region, source, render type, creative parameters. Once authored, it runs forever. Tomorrow at 06:00 UTC the pipeline reads it, fetches that region's data, and renders it. The recipe is the authored work; each render is the data sitting for the work that day.

**The pipeline.** Six tasks in a Prefect flow, running daily. Discover → fetch → process → build payload → render → index. The output is one PNG per recipe per day, on disk.

**The gallery.** A living archive that walks itself forward. No editor curates it. No engagement metrics measure it. The pipeline ran at 06:00 UTC and the gallery reflects what it produced.

---

## The four surfaces

| Surface | What it does |
|---|---|
| [**Gallery**](prd/PRD-004-gallery.md) | The public face. A masonry grid of renders. Click into any piece for full-screen view with data context. |
| [**Dashboard**](prd/PRD-002-dashboard.md) | Read the ocean as data. SST heatmaps, editorial spreads, region selection. |
| [**Recipe Editor**](prd/PRD-003-recipe-editor.md) | Author a piece. Mood presets, energy × presence, colour character. The interface operates at the level of artistic intent. |
| [**Video Editor**](prd/PRD-005-video-editor.md) | Assemble accumulated renders into timelapse film with generative audio. |

---

## The data

All data is free, open, and requires no registration. The sources are government and intergovernmental scientific archives.

| Source | What it offers |
|---|---|
| **NOAA OISST** | Sea surface temperature. Global, 0.25° resolution, daily since 1981. |
| **Argo Float Program** | ~4,000 autonomous floats. Temperature and salinity profiles. |
| **GEBCO** | Global ocean floor depth at 450m resolution. |

Full catalog: [Data Sources](concept/03-data-catalog.md)

---

## Quick start

```bash
git clone https://github.com/chipi/oceancanvas.git
cd oceancanvas
docker compose up
```

The gallery is at `localhost:8080`. The pipeline runs daily at 06:00 UTC. Recipes live in `recipes/`. No accounts. No API keys.

[Full setup guide →](project-readme.md)

---

## How the docs work

| You want to... | Read |
|---|---|
| Understand what OceanCanvas is | [Vision](concept/01-vision.md) → [Project Concept](concept/02-project-concept.md) |
| Build or contribute | [Getting Started](project-readme.md) → [Conventions](claude.md) |
| Design a surface | [Visual Contracts](uxs/UXS-004-gallery.md) → [IA](uxs/OC_IA.md) |
| Make a technical decision | [Architecture](adr/OC_TA.md) → [ADRs](adr/index.md) |
| Understand an open question | [RFCs](rfc/index.md) |
