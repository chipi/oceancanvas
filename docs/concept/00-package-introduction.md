# OC-00 — Package Introduction

**OceanCanvas Concept Package — Reading Guide & Glossary**

*April 2026 · v1.0 · Read this document first*

| | |
|---|---|
| **This document** | OC-00 — Package Introduction. The entry point. Read before all others. |
| **Package** | OceanCanvas Concept Package — six documents, OC-00 through OC-05 |
| **Purpose** | Context for the five concept documents that follow. Explains what the package is, how to read it, and what comes next. |
| **What follows** | Phase 2 definition documents: PRD, RFC, ADRs, IA, UXS |
| **Status** | Complete |

---

## What this package is

This is the OceanCanvas Concept Package. It is a set of six documents — OC-00 through OC-05 — that together describe OceanCanvas at the concept level: what it is, what it does, what data it uses, how it works technically, and how it looks and feels. The documents were developed before any formal requirements writing, to establish a shared understanding of the project precise enough to act on.

The concept package is the input to Phase 2, which produces the formal definition documents: Product Requirements Documents (PRDs), Requests for Comments (RFCs), Architecture Decision Records (ADRs), Information Architecture (IA), and UX Specifications (UXS). Those documents cannot be written without the concept being clear first. This package makes the concept clear.

> **This package is a concept package, not a product package.** The language throughout is intentionally exploratory — describing what we are building at the idea level, not prescribing how it must be built. Requirements language ('the system shall', 'the user must') belongs in the PRD, not here.

### What this package is not

| | |
|---|---|
| **Not a PRD** | Product Requirements Documents come in Phase 2. They are derived from OC-02 (Project Concept). This package is the input to that process, not the output. |
| **Not an RFC** | Requests for Comments cover open technical questions — recipe YAML schema, render payload format, audio system design. Those are flagged in OC-04 as open questions requiring RFC. The RFCs themselves are Phase 2. |
| **Not an ADR** | Architecture Decision Records document specific decisions with their context, alternatives, and consequences. The decisions are described in OC-04 but the formal ADR documents are Phase 2. |
| **Not a UX Specification** | UX Specifications (UXS) define the static visual contract — tokens, layout, component states, accessibility. OC-05 describes the design system and philosophy. The per-surface UXS documents are Phase 2. |
| **Not a build plan** | This package does not define sprints, milestones, or implementation order. It defines what is being built. When and how to build it is Phase 2 and beyond. |

---

## The six documents

| Doc | Title | Purpose |
|---|---|---|
| **OC-00** | **Package Introduction** | This document. What the package is, how to read it, what comes next, and the glossary of terms used throughout. Read first. |
| **OC-01** | **Vision & Philosophy** | What OceanCanvas is at its soul. The art-as-recipe concept. Why open ocean data, why generative art, what makes this different from a monitoring dashboard. Short and inspiring — the north star for the project. |
| **OC-02** | **Project Concept** | What we are building at the idea level. All four surfaces (dashboard, recipe editor, gallery, video editor), the creative loop end to end, the audio and overlay enrichment system, Phase 1 scope. The main document — read this to understand the complete project. |
| **OC-03** | **Data Catalog** | All 15 confirmed no-authentication data sources. For each: what it provides, access endpoint, update cadence, spatial and temporal resolution, format, and affinity with render types. The data reference. |
| **OC-04** | **Technical Architecture** | How to build it. Prefect pipeline (6 tasks), Docker Compose deployment, tech stack decision table, data folder structure, formal specifications (recipe YAML schema, render payload format, processed JSON format), GitHub Actions CI, open questions flagged for RFC. |
| **OC-05** | **Design System & Creative Direction** | Visual language and editorial philosophy. Semantic colour token vocabulary. Typography scale. All surfaces with screenshots. The creative control system — render types, mood presets, editorial controls. Source palettes. |

---

## How to read this package

| Reader | Goal | Recommended path |
|---|---|---|
| **Anyone** | Understand what OceanCanvas is | OC-00 → OC-01 → OC-02 |
| **PM / stakeholder** | Write PRDs or evaluate project scope | OC-00 → OC-01 → OC-02 → OC-03 |
| **Backend engineer** | Implement the pipeline and data system | OC-00 → OC-02 (skim) → OC-03 → OC-04 |
| **Frontend engineer** | Build the dashboard, recipe editor, gallery | OC-00 → OC-02 → OC-05 |
| **Designer** | Write UXS documents or refine the design system | OC-00 → OC-01 → OC-02 → OC-05 |
| **Data engineer** | Work with the source data and processing step | OC-00 → OC-03 → OC-04 |
| **Full picture** | Understand everything before Phase 2 begins | OC-00 through OC-05 in order |

---

## What comes next — Phase 2

This package is Phase 1 of the documentation process. It produces the concept. Phase 2 takes the concept as input and produces the formal definition documents that guide implementation. Phase 2 documents are Markdown files living in the project repository under `docs/`.

### Phase 2 document types

| Type | Description |
|---|---|
| **PRD — Product Requirements Document** | One PRD per feature or system. Describes what the feature does, who it is for, what the success criteria are, and what is explicitly out of scope. Derived primarily from OC-02. |
| **RFC — Request for Comments** | One RFC per open technical question that requires design before implementation. RFCs are discussions — they propose approaches and invite comment before a decision is made. Open questions flagged in OC-04 become RFCs. |
| **ADR — Architecture Decision Record** | One ADR per significant technical decision, once closed. ADRs record: the decision, the context that required it, the alternatives that were rejected, and the consequences. |
| **IA — Information Architecture** | A single document describing the structural map of the product: navigation, surface hierarchy, URL structure, how screens connect, what persists across surfaces. Lives in `docs/uxs/OC_IA.md`. |
| **UXS — UX Specification** | One UXS per surface or major UI component. Defines the static visual contract: semantic colour tokens, layout rules, component states, accessibility targets. |

### The document flow

| Phase 1 document | Feeds |
|---|---|
| OC-01 Vision | PRD preamble (the 'why' section of each PRD) |
| OC-02 Project Concept | PRDs (one per surface and feature), IA |
| OC-03 Data Catalog | PRD-001 data ingestion pipeline, RFC data source decisions |
| OC-04 Technical Architecture | ADRs (one per decision), RFCs (one per open question flagged) |
| OC-05 Design System | UXS documents (one per surface), CLAUDE.md |

---

## Glossary

| Term | Definition |
|---|---|
| `recipe` | A YAML configuration file in `recipes/` that defines how a data source becomes a daily art render. Specifies: source, region, render type, creative parameters, audio mapping. The pipeline renders each recipe once per day. |
| `render` | The PNG output produced by the pipeline for a specific recipe on a specific date. Stored at `renders/{recipe}/{date}.png`. Each render is one frame in the recipe's accumulating time series. |
| `render type` | The visual abstraction used to turn data into art. Six types: field (colour field), particles (animated flow), contour (isolines), pulse (rings driven by a scalar), scatter (point cloud), composite (ordered layer stack). |
| `render payload` | The data structure passed to the p5.js sketch at render time: `window.OCEAN_PAYLOAD`. Contains the primary source data array, context data (GEBCO bathymetry), audio scalars, region bounds, and metadata. |
| `data/processed/` | The pipeline's intermediate data format. For each source and date: a flat JSON array, a colourised PNG tile, and a meta sidecar. The dashboard and recipe editor live preview read from here directly. |
| `pipeline` | The Prefect-orchestrated 6-task automated daily process: discover → fetch → process → build payload → render → index. Runs at 06:00 UTC. |
| `creative loop` | The end-to-end cycle from data exploration through recipe creation through daily rendering through gallery accumulation through video assembly and back to new recipes. |
| `mood preset` | A named starting point in the recipe editor that sets the full parameter space simultaneously. Five presets: Becalmed · Deep current · Storm surge · Surface shimmer · Arctic still. |
| `energy × presence` | The 2D creative control space in the recipe editor. X axis: calm → turbulent. Y axis: ghost → solid. One draggable point sets both axes simultaneously. |
| `colour character` | The emotional temperature of the palette in the recipe editor. A continuous spectrum: Arctic cold → Thermal warmth → Otherworldly. Maps to colormap selection. |
| `temporal weight` | A named scale controlling how much time accumulates in a single frame: moment → ephemeral → present → lingering → epoch. |
| `editorial spread` | A full-page dashboard view presenting one source with journalistic authority. Large numbers, full-width charts, contextual narrative. |
| `enrichment tracks` | The audio and overlay tracks in the video editor. Both optional. Both driven by the same key moment detection algorithm. |
| `key moment detection` | The algorithm that finds statistically significant frames in a data scalar time series: statistical peaks, record values, threshold crossings, and inflection points. |
| `manifest.json` | The index file in `renders/` that lists all recipes, all render dates, and metadata for each. Rebuilt from scratch after each pipeline run. |
| `CLAUDE.md` | A root-level AI coding guidelines file that describes the codebase to AI coding assistants. Produced in Phase 2 from OC-04 and OC-05. |

---

## Document status

| Doc | Status | Notes |
|---|---|---|
| OC-00 | Complete | This document. |
| OC-01 | Complete | Vision and philosophy. |
| OC-02 | Complete | Main concept document. All surfaces covered. |
| OC-03 | Complete | 15 sources documented. |
| OC-04 | Complete — open items flagged | Recipe YAML schema, render payload format, audio system flagged as requiring RFC in Phase 2. |
| OC-05 | Complete | Semantic token vocabulary to be verified against UXS template before Phase 2 UXS writing begins. |

---

*OceanCanvas · OC-00 Package Introduction · v1.0 · April 2026 · Read this document first*
