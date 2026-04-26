# OceanCanvas

A recipe-driven generative art system powered by open ocean data. Define a piece once; the pipeline renders it daily from live NASA, NOAA, and ESA sources.

## What it is

OceanCanvas turns free, open-government ocean data into a living gallery of generative art. A **recipe** is a named configuration that says: take this ocean variable, from this region, render it this way, and do it again tomorrow. The pipeline fetches fresh data, generates a render using p5.js, and saves a PNG. Every day the recipe runs, the gallery grows by one frame.

## The four surfaces

| Surface | What it does |
|---|---|
| **Dashboard** | Explore live ocean data — SST, sea level, chlorophyll, ice — with editorial spreads per source |
| **Recipe editor** | Compose a render using mood presets and creative controls. Flip to YAML for full transparency |
| **Gallery** | The public face — a living art gallery updated daily when the pipeline runs |
| **Video editor** | Assemble accumulated renders into a timelapse film with generative audio and data overlays |

## Data sources

All 15 confirmed sources are free, open, and require no registration or API key. Sources include NOAA OISST, ESA SST-CCI, ESA Sea Level CCI, ESA SSS-CCI, ESA OC-CCI, NSIDC Sea Ice, OSCAR Currents, Argo Floats, GEBCO bathymetry, Open-Meteo Marine, and more. Full catalog in OC-03.

## Documentation

### Concept Package (Phase 1)

Six documents establishing the concept before formal requirements were written.

| Doc | Title | Purpose |
|---|---|---|
| OC-00 | Package Introduction | Entry point, reading order, glossary |
| OC-01 | Vision & Philosophy | The north star — why this project exists |
| OC-02 | Project Concept | What we are building — all surfaces, the creative loop |
| OC-03 | Data Catalog | All 15 confirmed sources with technical detail |
| OC-04 | Technical Architecture | How to build it — pipeline, stack, formal specs |
| OC-05 | Design System | Visual language, editorial philosophy, all surfaces |

### Definition Documents (Phase 2)

Markdown files living in this repository, derived from the concept package.

- [`docs/prd/`](docs/prd/) — Product Requirements Documents
- [`docs/rfc/`](docs/rfc/) — Requests for Comments
- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- [`docs/uxs/`](docs/uxs/) — UX Specifications (including Information Architecture)

## Stack

| Concern | Tool |
|---|---|
| Pipeline orchestration | Prefect |
| Tabular ingestion | dlt |
| NetCDF processing | xarray + requests |
| Generative art rendering | p5.js + Puppeteer |
| Dashboard maps | deck.gl + MapLibre GL |
| Dashboard charts | Observable Plot |
| Deployment | Docker Compose |
| CI | GitHub Actions |
| Video assembly | ffmpeg |
| Audio generation | Generative music API |

## License

MIT — see [LICENSE](LICENSE).
