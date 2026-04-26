# ADR-017 — One editorial layout per source

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/web-frontend
> **Related PRDs** — PRD-002 Dashboard

## Context

The Dashboard presents OceanCanvas's data sources as editorial reading experiences (PRD-002). Each source — SST, sea level, salinity, sea ice, ocean colour, marine carbon — has its own visual character and its own argument to make. The temptation, common in dashboard design, is to template: define one layout that all sources fill into. Variables differ; the frame stays the same.

OC-05's design system explicitly rejects this approach. Each source warrants its own spread, designed around what makes that data legible and meaningful.

## Decision

Each data source gets its own editorial layout in the Dashboard. Layouts are not template-shared across sources. SST has its layout. Sea level has its own. Salinity has its own. Adding a new source means designing a new layout, not filling a template.

Each source-spread has its own URL — `/dashboard/sst`, `/dashboard/sea-level`, etc. — and its own React components. Shared components (the navigation chrome, citation footer, attribution panel) live in a common layer; the editorial body of each spread does not.

## Rationale

The form of presentation *is* the editorial point (PRD-002). A 41-year SST trend wants a long horizontal time-series. A sea-level rise wants a vertical accumulation chart. A sea-ice cycle wants concentric circles or seasonal arcs. Forcing all three into a shared chart-grid layout flattens what matters about each.

The cost of this approach is real — more design and code per source. The cost is the discipline.

## Alternatives considered

- **Shared template with per-source variables** — one layout, each source plugs values into it. Rejected because it breaks the editorial-dignity promise (PA §promises/editorial-dignity). All sources end up looking the same; the visual character that makes each source legible is lost.
- **Two-tier (shared default + custom overrides)** — sources with no custom layout fall back to a default. Rejected because the "default" becomes the path of least resistance and most sources end up there. The forcing function is what makes the system work.

## Consequences

**Positive:**
- Each spread can do justice to its data.
- The Dashboard reads as a magazine of distinct pieces, not a dashboard of repeated tiles.
- Adding a new source is a deliberate editorial act, not a config change.

**Negative:**
- Higher per-source cost — design time, code, review.
- The set of supported sources grows more slowly. Acceptable; this is the project's pace by intention.

## Implementation notes

- Source layouts in `gallery/src/dashboard/spreads/{source}/`.
- Each spread is a React component with its own data hooks, charts, prose blocks.
- Shared layout primitives (page chrome, navigation, citation footer) in `gallery/src/dashboard/shared/`.
- Adding a new source: design first, then implement; not the other way around.
