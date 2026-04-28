# OceanCanvas Documentation

This README explains how OceanCanvas's documentation is structured, why it looks this way, and how to read it depending on what you came here to do. Read it once when you arrive at the project; come back to it when something feels out of place.

---

## The map

OceanCanvas's documentation has two layers — a stable concept package at the project root, and a living definition tree under `docs/`.

```
OceanCanvas docs ecosystem

[Concept package — narrative, read end-to-end]
├── OC-00  Package Introduction
├── OC-01  Vision & Philosophy
├── OC-02  Project Concept
├── OC-03  Data Catalog
├── OC-04  Pipeline Architecture
└── OC-05  Design System & Creative Direction

[Definition tree — reference + per-artifact, read selectively]
docs/
├── README.md   ← you are here
│
├── prd/        ← Product plane
│   ├── OC_PA.md             reference · audiences, promises, principles
│   ├── PRD_TEMPLATE.md
│   ├── index.md
│   └── PRD-001…005.md       per-feature arguments
│
├── uxs/        ← UX plane
│   ├── OC_IA.md             reference · navigation, surface relationships
│   ├── UXS_TEMPLATE.md
│   ├── index.md
│   └── UXS-001…NNN.md       per-surface visual contracts
│
├── rfc/        ← Tech plane · the moving tier (open questions)
│   ├── RFC_TEMPLATE.md
│   ├── index.md
│   └── RFC-001…NNN.md       open technical questions (exploration)
│
└── adr/        ← Tech plane · the settled tier (locked decisions + reference)
    ├── OC_TA.md             reference · components, contracts, constraints, stack, state map
    ├── ADR_TEMPLATE.md
    ├── index.md
    └── ADR-001…NNN.md       closed technical decisions (commitment)
```

The two layers serve different jobs. The **concept package (OC-00 through OC-05)** is the founding intent — what OceanCanvas is, what it does, what data it uses, how it's built, how it looks. Read once or twice, end to end. Updated rarely. The **definition tree** is where the project's current state lives — the per-feature arguments, per-surface contracts, per-decision records. Read selectively, when working on something. Updated continuously.

If you're new to the project, OC-00 is the entry point. If you're picking up a piece of work, the definition tree is where you live.

---

## Two layers, three planes

The definition tree is organised into three parallel planes, one per kind of question the project has to answer.

| Plane | Folder(s) | Answers | Reference doc |
|---|---|---|---|
| **Product** | `docs/prd/` | What changes for the person? | `OC_PA.md` |
| **UX** | `docs/uxs/` | What is the visual contract? | `OC_IA.md` |
| **Tech** | `docs/rfc/` + `docs/adr/` | How does the system work? | `OC_TA.md` (in `adr/`) |

Each plane has the same structure: a **reference doc** that holds what is true across the plane, **templates** for the per-artifact docs, an **index** listing what exists, and the **per-artifact docs themselves**.

One asymmetry is worth naming. The product and UX planes have one artifact type each (PRD, UXS) and one folder each. The tech plane has **two artifact types** — RFCs for exploration, ADRs for committed decisions — and **two folders**, one per type. RFCs close into ADRs once a decision is made. This split exists because technical decisions have a temporal structure that product and UX decisions don't — they're open before they're closed, and the record of *why* a decision was made matters long after the decision itself.

The reference doc for the tech plane (`OC_TA.md`) lives in `adr/`, with the settled tier. TA captures what is true *now*; ADRs capture how it became true. They are both about settlement; they belong together. RFCs reference TA across the folder boundary (`../adr/OC_TA.md`).

---

## Three modes of document

Every doc in the ecosystem is in one of three modes. The mode determines how to read it, how often to update it, and what to expect from it.

**Narrative documents** (OC-01, OC-02, OC-04, OC-05) are read end to end. They use prose, not lists. They establish the *why* and the *what*. They are durable; they are not constantly amended. Treat them as the source-of-truth for intent.

**Reference documents** (PA, IA, TA) are read by linking into specific sections — never end-to-end. They hold what is true *across* many artifacts so individual artifacts don't have to restate it. They are amended whenever the state of the project changes — a new audience emerges, a new surface is added, an RFC closes into an ADR. If a reference document drifts toward narrative, it has stopped being a reference.

**Per-artifact documents** (PRD, UXS, RFC, ADR) are read when you're working on the thing they describe. They are short and focused. They link upward to the reference doc in their plane and outward to related artifacts in other planes.

A common confusion: reading a reference document and expecting to find current state of every artifact (you won't — that's the index), or reading a narrative document and expecting it to read like a reference (it won't — narratives use prose for a reason). Both modes are doing their job.

---

## What gets which kind of doc

The bar for each artifact type is sharp on purpose. The cost of formal documentation is that it has to be maintained; the cost of skipping documentation when it is genuinely needed is that decisions are lost. The bars below try to put each artifact at the level where the first cost is lower than the second.

**A PRD** is for work where the *user-value argument* needs to be made — surfaces, features users encounter directly, experiences that change someone's relationship with the project. If the *Why this is a PRD* sentence in the header is hard to write, it is not a PRD. Pipeline plumbing, data formats, infrastructure: those are not PRDs.

**An RFC** is for an open technical question with plausible alternatives and trade-offs that require deliberation. RFCs explore. They do not specify implementation. If the answer is mostly known going in, the work is not an RFC — it is an ADR being written in the wrong shape. If the work is "set up the thing," it is neither RFC nor ADR — it is a config file and a commit.

**An ADR** is for a single architectural decision, locked, with rationale. ADRs commit. They are short. They are written *after* a decision is made, not as part of making it. ADRs supersede earlier ADRs but are never edited in place.

**A UXS** is for the static visual contract of one surface — tokens, layout, component states, accessibility targets. UXS documents do not hold behaviour, animation timing, or interaction rules; those belong in an RFC for that surface.

The most common documentation error is treating these as interchangeable. A PRD with `FR1.1 / FR1.2` numbered requirements is doing an RFC's job badly. An RFC that specifies which keys to put in a Docker Compose file is doing a config file's job badly. An ADR that lists alternatives that haven't been rejected yet is doing an RFC's job badly. The discipline of separation is what makes the system work.

---

## Reading paths

| You came here to | Read in this order |
|---|---|
| **Understand what OceanCanvas is** | OC-00 → OC-01 → OC-02 |
| **Write a PRD** | OC-01 → OC-02 → `prd/OC_PA.md` → an existing PRD as model |
| **Write an RFC** | OC-04 → `adr/OC_TA.md` → an existing RFC as model |
| **Write an ADR** | `adr/OC_TA.md` → the related RFC (if any) → `adr/ADR_TEMPLATE.md` → an existing ADR as model |
| **Build a frontend surface** | OC-05 → `uxs/OC_IA.md` → the relevant UXS → the related PRD |
| **Build a pipeline component** | OC-03 → OC-04 → `adr/OC_TA.md` → relevant ADRs |
| **Audit the system's current state** | `adr/OC_TA.md` §map → `prd/index.md` → `uxs/index.md` → `rfc/index.md` + `adr/index.md` |
| **Use the project as an AI coding assistant** | `adr/OC_TA.md` → `CLAUDE.md` (when written) → the per-artifact doc for whatever you're touching |
| **Onboard a new contributor** | OC-00 → OC-01 → OC-02 → this README → the relevant plane's reference doc |

---

## A note on voice

OceanCanvas's documentation is editorial. Present-tense, declarative, slightly literary. No SaaS-speak. No *the user shall*. No apologetic preamble. The project itself takes scientific data and treats it with editorial dignity; the documentation extends the same respect to the people building and using the project.

This is not cosmetic. A PRD that reads like a generic spec produces specs. A PRD that reads like the project produces work like the project. The voice is part of what holds the structure together — when a paragraph drifts toward execution-detail-in-prose, it sounds wrong, and that wrongness is a useful signal.

---

## How docs evolve

| Doc type | Cadence | Versioning |
|---|---|---|
| **OC-00 through OC-05** | Rarely amended; major revisions only when intent shifts | v1.0, v1.1 — semantic |
| **PA, IA, TA** | Amended when state changes (new audience, new surface, RFC closes) | v0.1 → v1.0 → ongoing minor revisions |
| **PRD** | Drafted → revised → marked Implemented when shipped | Draft v0.1 → v0.2 → … → Implemented vX.Y |
| **UXS** | Versioned alongside the surface it describes | Tied to UI version |
| **RFC** | Draft → discussion → Decided (closes into ADRs) | Draft → Decided |
| **ADR** | Append-only; never edited after acceptance | Accepted → Superseded by ADR-NNN |

When an RFC closes into ADRs, three things update together: the new ADR file appears in `adr/`, the RFC's status flips to *Decided* in `rfc/index.md`, and TA §map gets both updates. The §map in TA is the canonical state board; the folder indexes mirror their relevant slice.

Open questions surface as **Open threads** at the bottom of PRDs and as **Open** entries in TA §map. They become RFCs (or ADRs, or sometimes nothing) as work picks up.

---

## A short philosophy

Three observations that have shaped how this documentation is structured. They are worth keeping in mind when adding to it.

### Mixing levels in one document creates confusion about what the document is for

Shreyas Doshi names three levels of product work — **impact** (what user truth are we serving), **execution** (how do we build it), and **optics** (how does it look to the rest of the company). All three matter. Most conflict on a project comes from people operating at different levels at the same time without realising it.

When a single document tries to hold reasoning at multiple levels, that conflict happens *inside the document*. A PRD that mixes impact reasoning ("this changes how someone relates to the ocean") with execution reasoning ("FR1.1: the page shall display a 14-day strip") cannot be reviewed cleanly — readers can't tell what kind of question it's trying to answer, and they bring whichever level is their default. The separation across PA / PRD / RFC / ADR is what prevents this. PA holds impact. PRD holds impact-led arguments for one experience. RFC holds execution exploration. ADR holds execution commitment. UXS and visual voice handle optics.

This is why a PRD is not a spec, an RFC is not a task list, and an ADR is not a brainstorm.

### RFC = exploration. ADR = commitment.

The cleanest line in the modern technical-documentation literature. An RFC has alternatives, open questions, and a deliberation period. An ADR has a single decision, locked, with rationale. RFCs close *into* ADRs. The most common mistake is treating an RFC as an implementation spec — writing down what to build before deliberating whether it should be built that way. If the answer is mostly known going in, skip the RFC and write an ADR.

The folder split (`rfc/` and `adr/`) makes this physical. The moving tier and the settled tier live in different places. TA — the reference for what's *true* about the architecture — sits with the settled tier, because that's the tier it summarises.

### Reference documents earn their place by being linked into, not read end-to-end

PA, IA, and TA are reference documents. They are scannable. Each section has a stable anchor that other documents link to. When a PRD says *"audiences: artist, climate-communicator (PA §audiences)"* that is the link doing real work — the PRD has just inherited the audience definitions without restating them.

If a reference document starts to read like an essay, it has stopped being useful. If a per-artifact document starts to restate what its reference doc holds, the same is happening from the other direction. The discipline is to keep each kind of document doing its job and only its job.

---

## A note for AI coding assistants

Anyone using OceanCanvas as a substrate for AI-assisted work should start at `adr/OC_TA.md`. It holds the components, contracts, constraints, and locked stack — the things any code change has to honour — and the state board of what's already decided. The per-artifact docs (PRD, UXS, RFC, ADR) supply the why, the what, and the visual contract for whatever specific surface is being touched.

A `CLAUDE.md` at the repo root, when it exists, will compile the most-needed pieces of TA, IA, and PA into a single AI-reading-optimised file. Until then, TA is the closest thing to that role.

---

## When this README needs updating

This document describes the *shape* of the documentation system, not its contents. Update it when:

- A new plane is added, or a plane is removed.
- A new artifact type is added (e.g., something between PRD and RFC, or a marketing-narrative doc type).
- A folder reorganisation happens (like the `rfc/` ↔ `adr/` split).
- A reading path stops being accurate because doc locations have changed.
- The bar for what gets which kind of doc shifts in practice.

Don't update it when:

- A new PRD or RFC is added (those go in the relevant index).
- An RFC closes into an ADR (that's tracked in TA §map).
- The contents of any artifact change (those have their own version histories).

The README is the floor plan. The plan only changes when the building changes.
