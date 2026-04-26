# PRD-004 — Gallery

> **Status** · Draft v0.2 · April 2026 (supersedes earlier v0.1 numbered PRD-007)
> **Sources** · OC-02 §Surface 3 · OC-05 §View 1 · OC-04 §Gallery
> **Audiences** · curious-person, climate-communicator (PA §audiences)
> **Promises** · *accumulation*, *self-curating*, *editorial-dignity* (PA §promises)
> **Principles** · *data-is-hero*, *no-engagement-chrome*, *daily-clock-is-sacred* (PA §principles)
> **Why this is a PRD** · The gallery is the public face of the work and the closing surface of the creative loop. Whether the work *feels alive* is a product decision that has to be made before the surface is built.

---

Open OceanCanvas tomorrow morning. The hero render has changed — yesterday's North Atlantic is now today's. The fourteen-day strip below it has shifted by one frame. The grid of recipes underneath shows the ocean as it looked while you slept. Nothing was published. Nothing was curated. The pipeline ran at 06:00 UTC, the manifest rebuilt itself, and the gallery walked itself one day forward.

## The problem

Generative-art projects almost always die at the gallery stage. The art gets made, the artist posts a few pieces, and then the work is asked to fight for its life in the same feeds and storefronts as everything else. The output is mistaken for content. The archive becomes a chore to maintain.

OceanCanvas's pipeline produces one render per recipe per day, every day, for as long as a recipe is active. A recipe that has been running for a year is three hundred and sixty-five frames. The cost of curating that by hand kills the project at month three. The cost of not curating it leaves the work invisible.

What is missing is a presentation surface where accumulation is the point — where three hundred and sixty-five frames is not a backlog but the piece.

## The experience

It is morning. The gallery is the first tab. The hero fills the page — today's *North Atlantic Drift*, a thermal field rendered six hours ago. The recipe name and date float over the image without a card around them. The number *14.6°* in the corner is not a label, it is the value.

You scroll. The fourteen-day strip lays out the same recipe's last two weeks like a film of frames. You see a front passing through on the eleventh. You drift down to the grid. *Amazon Plume*, *Labrador Ice*, *Gulf Stream Front* — different palettes, different logics, all rendered today. The amber, the violet, the teal arrange themselves into something that looks composed without anyone having composed it.

You click into a recipe. The render goes full screen. From here, a quiet *timelapse ↗* takes you into the video editor with frames already loaded; *recipe ↗* drops you into the editor with this piece's parameters. There is no dashboard, no panel of analytics, no engagement metric. The page is the work.

## Why now

Phase 1 ships three recipes. Without a gallery, the only way to see them is the filesystem, which is to say there is no way. The dashboard answers *what is the ocean doing today?* — the gallery answers *what has it looked like, through OceanCanvas's eyes?* Without that surface the creative loop does not close: there is no place where accumulation becomes visible and nothing prompts the loop back into new recipes.

The gallery is also the URL that gets shared when OceanCanvas eventually goes public. Editorial quality cannot be retrofitted later — the visual contract has to be right from day one, even if the hosting story is local-only at first.

## Success looks like

- A recipe that has been running for thirty days reads as a month of the ocean rather than thirty separate files.
- A recipe that has been running for a year shows the seasonal cycle at a glance.
- A first-time visitor assumes a person curated the page that morning. Nobody did.
- No one notices the page changed overnight, because nothing announces it. It just is.

## Out of scope

- Public hosting. Phase 1 is local-only. Cloudflare R2, custom domains, social share cards — Phase 2.
- Recipe management. Renaming, archiving, duplicating, version history — that work lives in the recipe editor.
- Long-archive browsing. The fourteen-day strip is the only archival surface in Phase 1. A full archive view arrives when there is enough history to need one.
- Recipe creation. The gallery is a viewing surface. New work begins in the editor.
- Engagement analytics. (*no-engagement-chrome*.) Not in Phase 1, possibly not ever.

## The sharpest threat

**Accumulation does not become beautiful at scale.**

The promise that three hundred and sixty-five frames is the piece — not a backlog — depends on something that has not been tested yet: that a year of daily renders, viewed in aggregate, actually reads as one work. If the visual character of a recipe is not consistent enough across a year of varying ocean conditions, the archive will look like a folder, not a film.

This is the assumption underneath the entire project. If it fails for OceanCanvas, it fails everywhere — the gallery, the video editor, the long-term value of recipes themselves. Phase 1 cannot prove this directly because there is no year-old archive yet; the signal has to come from the fourteen-day strip, which is the smallest scale at which *accumulation as work* is visible.

## Open threads

- **RFC — `manifest.json` schema.** Written by pipeline Task 06, consumed by gallery.
- **RFC — Featured-recipe selection.** Where it lives, who sets it, how it changes.
- **ADR — Phase 1 static serving.** Caddy + filesystem; Cloudflare R2 deferred to Phase 2.
- **UXS-004 — Gallery.** Static visual contract: tokens, hero layout, grid responsiveness, full-screen view.

## Links

- **Source** — OC-02 §Surface 3 · OC-05 §View 1 · OC-04 §Gallery
- **PA** — §audiences · §promises · §principles
- **Related PRDs** — PRD-001 Recipe (the works displayed) · PRD-003 Recipe Editor (where new pieces are made) · PRD-005 Video Editor (the timelapse hand-off)
