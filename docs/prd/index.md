# PRD Index

Product Requirements Documents for OceanCanvas. One per customer-facing experience. Derived from OC-02 (Project Concept), anchored to OC_PA (Product Architecture).

## What gets a PRD

A PRD is for work where the **user-value argument** needs to be made — not for every feature, and not for plumbing. Pipeline ingestion, data processing, rendering mechanics, file format schemas: those are RFCs and ADRs anchored to OC-04.

The bar: if the "Why this is a PRD" sentence in the header is hard to write, the work belongs elsewhere.

## Product Architecture

All PRDs anchor to a shared reference document that holds audiences, promises, and principles.

| Doc | Purpose |
|---|---|
| [OC_PA.md](OC_PA.md) | Audiences, promises, principles, PRD map. Every PRD links into this. |

## PRDs

| PRD | Title | Status | Primary audiences |
|---|---|---|---|
| [PRD-001](PRD-001-recipe.md) | Recipe (the authored work) | Draft v0.1 | artist, climate-communicator |
| [PRD-002](PRD-002-dashboard.md) | Dashboard | Draft v0.1 | scientist-adjacent, curious-person |
| [PRD-003](PRD-003-recipe-editor.md) | Recipe Editor | Draft v0.1 | artist |
| [PRD-004](PRD-004-gallery.md) | Gallery | Draft v0.2 | curious-person, climate-communicator |
| [PRD-005](PRD-005-video-editor.md) | Video Editor | Draft v0.1 | climate-communicator, artist |

## Numbering

Fresh 1–5, replacing the earlier 1–10 list. The pipeline, processing, rendering, audio, and overlay items in the original index are not PRDs; they live as RFCs and ADRs.

## Template

New PRDs: copy [`PRD_TEMPLATE.md`](PRD_TEMPLATE.md). Read the "Notes on writing PRDs in this format" section at the bottom before starting.
