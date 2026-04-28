# OceanCanvas

Generative ocean art that the data performs daily.

A pipeline runs at 06:00 UTC, fetches today's ocean data from open scientific sources, and renders it through authored recipes. Every day adds a frame. A recipe running for a year is a year of art — the same authored character, the ocean changing underneath it. The gallery walks itself forward without curation.

This is not a dashboard. It is not a research tool. It is a project where the ocean's data is treated with editorial dignity, and where authorship and accumulation matter more than dashboards and metrics.

---

## What this is

Three concepts hold the project together.

**The recipe.** A YAML file authored by a person — region, source, render type, creative parameters. Once authored, it runs forever. Tomorrow at 06:00 UTC the pipeline reads it, fetches that region's data for that source, and renders it. The recipe is the authored work; each render is the data sitting for the work that day.

**The pipeline.** Six tasks in a Prefect flow, running daily. Discover the latest available date per source. Fetch raw data. Process it into a browser-friendly intermediate format. Build a render payload per recipe. Render via Puppeteer + p5.js. Rebuild the manifest. The output is one PNG per recipe per day, on disk.

**The gallery.** A static React app that reads the manifest. Today's renders fill the front page. The fourteen-day strip below shows recent history. The grid below that shows every active recipe. No editor curated it. No engagement metrics measure it. The pipeline ran at 06:00 UTC and the gallery reflects what it produced.

The four customer-facing surfaces — Dashboard, Recipe Editor, Gallery, Video Editor — close the creative loop: read the data, author a piece, watch it accumulate, assemble a year into a film.

---

## Status

**Phase 1 — implementation in progress.** The documentation system is complete; code is being written. Phase 1 ships:

- The pipeline running daily, self-hosted via Docker Compose
- One source live (NOAA OISST sea surface temperature)
- A small set of authored recipes
- All four customer-facing surfaces

Phase 2 (later) will add public hosting, more sources, additional editorial features. Phase 1 stays open-by-default, file-based, and self-hostable.

---

## How to read this repository

OceanCanvas's documentation has two layers — a concept package at the project root, and a living definition tree under `docs/`.

### The concept package — read end-to-end, once

| Document | What it holds |
|---|---|
| `OC-00 Package Introduction` | Overview of the package and its parts |
| `OC-01 Vision` | Why the project exists |
| `OC-02 Project Concept` | What the surfaces are and how the creative loop works |
| `OC-03 Data Catalog` | Which sources are integrated and which are deferred |
| `OC-04 Pipeline Architecture` | How the pipeline is built, conceptually |
| `OC-05 Design System & Creative Direction` | The visual character |

Read these once or twice for the *why*. They are updated rarely.

### The definition tree — read selectively, when working on something

```
docs/
├── prd/                 Product — user-value arguments per surface
│   ├── OC_PA.md         Reference: audiences · promises · principles
│   └── PRD-001..NNN.md  Per-surface arguments, blog-post format
│
├── uxs/                 UX — visual contracts per surface
│   ├── OC_IA.md         Reference: surfaces · navigation · shared tokens
│   └── UXS-001..NNN.md  Per-surface design tokens, layout, states
│
├── rfc/                 Tech, moving tier — open technical questions
│   └── RFC-001..NNN.md  Open questions with alternatives and trade-offs
│
└── adr/                 Tech, settled tier — locked decisions
    ├── OC_TA.md         Reference: components · contracts · constraints · stack · state map
    └── ADR-001..NNN.md  Per-decision records, append-only
```

Read what you need when you need it. Reference docs (PA / IA / TA) are linked into, not read end-to-end. Per-artifact docs are read when working on the thing they describe.

---

## How to run it

```bash
git clone https://github.com/chipi/oceancanvas.git
cd oceancanvas
docker compose up
```

The pipeline runs daily at 06:00 UTC. Manual runs trigger via the Prefect UI at `localhost:4200`. The gallery is at `localhost:8080`. Recipes live in `recipes/`; renders accumulate in `renders/`. No accounts. No API keys. No cloud dependencies.

Adding a new recipe: drop a YAML file in `recipes/` matching the schema in `RFC-001` (`docs/rfc/`). The next pipeline run picks it up.

---

## Working on the project

Two documents at the project root guide hands-on work:

- **`CLAUDE.md`** — project conventions for working on the codebase. Where things live, the locked stack, the non-negotiable constraints, code conventions, what to do and what not to do. Written for AI-assisted work but readable by humans.
- **`IMPLEMENTATION.md`** — the Phase 3 build guide. Names the slices, what each one ships, the gates between them.

Phase 1 is single-author. Once Phase 1 ships, contribution conventions will be documented here.

---

## License

To be decided before public release. Phase 1 is private development; Phase 2 will ship under an open license appropriate to a project built on open scientific data.

---

## Acknowledgements

Built on data from NOAA, ESA, NASA, NSIDC, and the broader open ocean-data ecosystem. The data is the work; this project is one way of looking at it.
