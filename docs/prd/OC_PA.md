# OC_PA — Product Architecture

- **Status** · v1.0 · April 2026
- **Type** · Reference document — structured for linking-into, not reading end-to-end
- **Lives at** · `docs/prd/OC_PA.md`
- **Parallel to** · `docs/uxs/OC_IA.md`
- **Derived from** · OC-01 Vision · OC-02 Project Concept · OC-05 Design System

This document holds the structural reasoning that every PRD inherits — the audiences OceanCanvas serves, the promises made to them, the principles every feature follows, and the map of which PRDs exist. Individual PRDs link into specific sections rather than restating audiences or principles per feature.

PA holds *what is true across the product*. Per-feature argument lives in PRDs. Visual contract lives in UXS. Technical decisions live in ADRs. PA is the document PRDs anchor to so they don't have to carry that work themselves.

---

## §audiences

OceanCanvas is for anyone curious about the ocean who cares how things look. Five audiences are named explicitly because each shapes specific PRDs differently. PRDs reference audiences as `(PA §audiences/artist)`.

### artist

Wants to make generative art that is about something real. Finds purely algorithmic work empty. Has no interest in NetCDF but is drawn to the idea that the Gulf Stream can be a painting. Cares deeply about authorship, control, and durability of the work.

### climate-communicator

Needs ways to show climate change that are not bar charts. Works at an NGO, a newsroom, in advocacy, in education. Needs visuals that land without explanation, with proper citation built in.

### scientist-adjacent

Works in oceanography, marine biology, or climate science. Already knows what SST anomaly means. Wants their field's data expressed beautifully — for themselves and to show others outside the field.

### curious-person

Saw a beautiful image somewhere and clicked through. Does not know what degree heating weeks are but finds the coral bleaching alert map viscerally alarming. Starts to understand the data through the art rather than the other way around.

### developer

Wants to build something real with open data. Finds the generative art angle more interesting than yet another dashboard. Drawn to the technical challenge of a pipeline that runs itself.

---

## §promises

Promises are the impact-level commitments OceanCanvas makes to its audiences. Each PRD acts on a subset. PRDs reference promises as `(PA §promises/accumulation)`.

### authored

Every render is part of a named, intentional work. Recipes are not roll-of-the-dice generation — they are authored pieces that happen to be alive. *Serves: artist, climate-communicator.*

### grounded

Every aesthetic choice traces to a measurement. Colour encodes physics. Motion follows real currents. Sound derives from the data scalar. Nothing decorative. *Serves: artist, scientist-adjacent, climate-communicator.* (Compare principle: *aesthetic-traces-to-data*.)

### accumulation

Pieces evolve and accumulate over time. A recipe running for a year is a year of art. The archive is part of the work, not a side effect of it. *Serves: artist, climate-communicator, scientist-adjacent.*

### self-curating

The public face walks itself forward every day with no editorial maintenance. The pipeline runs at 06:00 UTC; the gallery reflects what it produced, automatically. *Serves: artist, curious-person, developer.*

### editorial-dignity

The design quality of a magazine, not a dashboard. Numbers at display scale. Dark canvas. No chart chrome. The data is the hero. *Serves: climate-communicator, scientist-adjacent, curious-person.*

### citation-travels

Attribution is baked into every render and every export. Sources travel with the work. Reproducibility is built in, not bolted on. *Serves: scientist-adjacent, climate-communicator, developer.* (Compare principle: *attribution-baked-in*.)

### open

Open data. No accounts, no API keys, no auth in Phase 1. Self-hostable end-to-end. Anyone can clone the repo and run the system on their own machine. *Serves: developer, scientist-adjacent.* (Compare principle: *open-by-default*.)

---

## §principles

Principles are the rules followed when building any feature. They constrain the solution space. Every PRD inherits these without arguing them. PRDs reference principles as `(PA §principles/data-is-hero)`.

### data-is-hero

Every interface element exists to make the data visible. Chrome serves the data, never the other way around. Borders, backgrounds, decorative elements that compete with the data are out by default.

### aesthetic-traces-to-data

Colour, motion, sound, scale, line weight — all map to a measurement. If a parameter has no data referent, it is the wrong parameter. (Compare promise: *grounded*.)

### determinism

Same recipe + same source data + same date = same render. Always. The render is a function, not an experiment. Reruns produce identical output.

### recipes-are-durable

A recipe, once created, runs forever. Authoring is a long-term commitment, not a temporary experiment. The system does not expire recipes; the user removes them deliberately.

### daily-clock-is-sacred

The pipeline's daily cadence is the heartbeat. Manual renders are the exception. The system's primary mode is unattended.

### no-engagement-chrome

No view counts, no likes, no share counts, no streaks, no virality features. The work earns its visit. Even when measurable, these are not measured.

### attribution-baked-in

Source attribution is part of the render, not a footer added at export. Removing attribution requires deliberate effort; including it is the default. (Compare promise: *citation-travels*.)

### open-by-default

No source requiring authentication ships in Phase 1. No API keys, no accounts. If a source becomes essential and requires auth later, that is a deliberate ADR, not a drift. (Compare promise: *open*.)

---

## §map

Five PRDs define OceanCanvas at the feature level. Each makes a specific argument for one experience. Implementation work (RFCs, ADRs, UXS) anchors to PRDs.

| PRD | Title | Primary audiences | Acts on promises | Inherits principles |
|---|---|---|---|---|
| **PRD-001** | Recipe (the authored work) | artist, climate-communicator | *authored*, *grounded*, *accumulation*, *citation-travels* | *aesthetic-traces-to-data*, *determinism*, *recipes-are-durable*, *attribution-baked-in* |
| **PRD-002** | Dashboard | scientist-adjacent, curious-person | *grounded*, *editorial-dignity*, *citation-travels* | *data-is-hero*, *aesthetic-traces-to-data* |
| **PRD-003** | Recipe Editor | artist | *authored*, *grounded* | *aesthetic-traces-to-data*, *data-is-hero* |
| **PRD-004** | Gallery | curious-person, climate-communicator | *accumulation*, *self-curating*, *editorial-dignity* | *data-is-hero*, *no-engagement-chrome*, *daily-clock-is-sacred* |
| **PRD-005** | Video Editor | climate-communicator, artist | *accumulation*, *citation-travels*, *editorial-dignity* | *aesthetic-traces-to-data*, *attribution-baked-in* |

**Numbering** — fresh, replacing the earlier 1–10 list. The pipeline, processing, and rendering items in the original index are not PRDs (no user-value argument to make for them); they live as RFCs and ADRs anchored to OC-04.

**Audio and overlay enrichment** are not separate PRDs. They fold into PRD-005 (Video Editor) as parts of one experience. Their technical implementation gets one or more RFCs.

---

## How PRDs reference this doc

PRDs link into PA sections by anchor. The convention:

```
Primary audiences · curious-person, climate-communicator (PA §audiences)
Acts on promises  · accumulation, self-curating, editorial-dignity (PA §promises)
Inherits          · data-is-hero, no-engagement-chrome, daily-clock-is-sacred (PA §principles)
```

A PRD that references PA can drop its own audience description, its own restatement of principles, and its own argument for why the project's core promises matter. That work happens here, once.

A PRD that does *not* reference any PA section is a smell. It usually means either (a) the feature does not fit the product's promises, in which case it should not be a PRD, or (b) the PRD is restating PA-level reasoning instead of using it.

---

## What this doc is not

| Doc | Mode | Holds |
|---|---|---|
| **OC-01 Vision** | Narrative, inspirational | The "why" at the founding level. Read once. |
| **OC-02 Project Concept** | Narrative, conceptual | What we are building at the idea level. Read once or twice. |
| **OC_PA** (this doc) | Reference, structural | Audiences, promises, principles, PRD map. Linked to. |
| **PRD** | Argument, per-feature | The case for one experience. Read when working on it. |
| **OC_IA** | Reference, structural | Navigation, surface relationships. Linked to from UXS. |
| **UXS** | Contract, per-surface | Static visual contract for one surface. |
| **OC-04 Tech Architecture** | Decision record + map | Technical decisions and open questions. |
| **RFC** | Proposal, per-question | One open technical question. |
| **ADR** | Record, per-decision | One decision, closed. |

PA does not hold per-feature argument, visual contract, technical decisions, open technical questions, vision narrative, or the project concept. If a section here drifts toward any of those, it belongs in the corresponding doc, not here.

---

## Open threads

- **Audiences calibration.** Five audiences distilled from OC-01. *Curious-person* in particular may collapse into *climate-communicator* if the PRDs end up serving them with the same surfaces and the same promises. Revisit after one quarter of usage signal.
- **Promise sequencing.** Promises are rough-grouped by theme rather than ordered by importance. Reorder once the natural reference frequency reveals itself.
- **System-level promises.** Two promises and their twin principles — *open* / *open-by-default* — are system-level commitments that constrain the project's scope rather than per-feature arguments. They will not appear in any individual PRD's anchors but should still gate new PRD candidates: a PRD that would require authentication or break self-hosting must be argued at this level first, not buried in a feature PRD.
- **Principle / promise twins.** *grounded* / *aesthetic-traces-to-data* and *citation-travels* / *attribution-baked-in* are each one observation viewed from two sides (audience-facing vs. builder-facing). Cross-references are intentional. If readers find this confusing in practice, collapse one side.
