# PRD-002 — Dashboard

> **Status** · Draft v0.1 · April 2026
> **Sources** · OC-02 §Surface 1 · OC-05 §View 1 · §View 2 · §View 3
> **Audiences** · scientist-adjacent, curious-person (PA §audiences)
> **Promises** · *grounded*, *editorial-dignity*, *citation-travels* (PA §promises)
> **Principles** · *data-is-hero*, *aesthetic-traces-to-data* (PA §principles)
> **Why this is a PRD** · The dashboard is where ocean data is *read*. Whether it reads as editorial or as utilitarian is a product decision, not a design tweak.

---

It is a Tuesday morning. You open OceanCanvas. The canvas is dark, almost black. A field of warm and cool tones spreads across it — the North Atlantic, today. In the corner, *14.2°*. Below it, *+1.4°* in coral. There is no panel. There is no toolbar. The data fills the frame.

## The problem

The world has many ways to look at the ocean. Few of them are pleasant to read.

NASA Worldview is precise but built like a research instrument — every layer is a checkbox, every option a dropdown. Earthdata returns NetCDF files. Operational dashboards (CMEMS, Coral Reef Watch) lead with disclaimers and metadata. The visual register is uniformly the same: clinical, busy, full of UI furniture.

The result is that the ocean's data — some of the most consequential measurements humans take — is, in practice, only read by people who already know how to read it. It is not absent from the public sphere; it is unreadable in the public sphere. A climate-communicator looking for an image to use in a piece does not go to NSIDC. They go to a stock-photo site.

OceanCanvas wants the data to be readable as text — as something a person scrolls through with attention, not as something they query with a goal.

## The experience

You scroll into the SST spread. The number *14.2°* is the largest thing on the page. Below it, *+1.4°* in coral; that is the number that means something. To the right, the thermal field of the North Atlantic, full bleed, no frame around it. You move the mouse — the coordinate display updates. You drag the timeline backward through 2024, 2020, 2010. The map redraws to those dates. You see, plainly, that the ocean was cooler then.

You scroll further. The forty-one-year trend chart sits on the dark canvas without a chart border. The 1981–2010 mean is a dashed line. The 2024 dot is labelled. You read the chart the way you read a magazine graphic, not the way you read an analytics tool.

You scroll into the Sea Level spread. The thirty-year curve is the entire hero — full width, two hundred and eighty pixels tall, teal on dark. *+20.4cm* at display scale top-left. *+5.1mm/yr* in coral below it. The curve rises from left to right and you watch thirty years happen.

You select a region. The lat/lon bounds pass through to the recipe editor. You make a piece.

## Why now

The dashboard is the entry point to recipes. Someone who has not first read the data cannot author a piece about it; PRD-001 (Recipe) requires a place where the data has already been understood.

It is also the artefact most likely to be encountered by audiences who never touch the editor — the climate-communicator looking for a visual, the curious-person who clicked through. For a non-trivial fraction of visitors, the dashboard *is* OceanCanvas. The first impression and the depth-of-engagement impression are both set here.

Phase 1 ships SST as the only live source. The dashboard's editorial logic has to be right for SST first; the system extends to other sources without re-arguing the form.

## Success looks like

- Someone with no prior interest in ocean data scrolls through the SST spread for longer than they meant to.
- A climate-communicator screenshots the sea-level curve and uses it in a deck without modification, attribution included.
- A scientist-adjacent reader is not insulted by the simplification — feels the data has been respected even where the chrome has been removed.
- The dashboard is mistaken for a magazine more often than for a tool.

## Out of scope

- Generative renders. Those live in the recipe pipeline; the dashboard shows raw ocean data, not authored work.
- Real-time alerts, watch lists, monitoring. The dashboard is not operational.
- Editorial decisions about which source to feature *today*. The source rail is stable; nothing curates a "front page" data story.
- Analytics on dashboard use. (*no-engagement-chrome* applies here too.)
- Region drawing UX in detail. UXS-002 holds the static visual contract; the related RFC holds the behaviour.

## The sharpest threat

**The dashboard reads as a viewer.**

If first-time visitors experience the dashboard as *yet another way to look at SST data*, it has failed at its actual job. The editorial promise — that this is a reading experience, not a viewing tool — has to land in the first scroll. If the page is interpreted as a layer of UI on top of the data, the entire frame collapses into the existing genre of scientific dashboards.

The risk is highest at the source rail and the timeline scrubber, both the most tool-like elements on the page. They have to feel like they belong to a magazine spread, not a Tableau dashboard. The visual restraint in OC-05 is the primary defence; the behavioural details in the related RFC are the secondary one.

## Open threads

- **RFC — Dashboard interaction.** Hover behaviour, scrubber semantics, region selection mode. The behavioural rules that don't belong in UXS.
- **RFC — Source switching.** Layout preserved on switch, or each source has its own editorial structure with its own URL? Likely the second; confirm.
- **UXS-002 — Dashboard.** Static visual contract.
- **ADR — One editorial layout per source.** OC-05 establishes the principle; confirm at ADR.

## Links

- **Source** — OC-02 §Surface 1 (Dashboard) · OC-05 §View 1 · §View 2 · §View 3
- **PA** — §audiences · §promises · §principles
- **Related PRDs** — PRD-001 Recipe (the dashboard hands off region and source) · PRD-003 Recipe Editor (the surface the region passes to)
