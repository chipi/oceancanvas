# PRD-005: Dashboard Data Explorer

- **Status**: Draft
- **Related RFCs**: none (dashboard is primarily a UXS concern — see UXS-001)
- **Related ADRs**: `docs/adr/ADR-006-static-file-serving.md`, `docs/adr/ADR-009-deckgl-maplibre-dashboard.md`, `docs/adr/ADR-010-observable-plot-charts.md`, `docs/adr/ADR-015-editorial-design-philosophy.md`
- **Related UXS**: `docs/uxs/UXS-001-dashboard.md`
- **Source**: OC-02 Section 4 (Surface 1), OC-05 Views 1–3

## Summary

The dashboard is the entry point to OceanCanvas — an editorial data explorer that shows the ocean as it is today. It presents live ocean data from active sources with journalistic authority: full-bleed spatial heatmaps, statistics at display scale, 41-year historical context, and editorial spreads per source. The dashboard is where the user understands the ocean before creating a recipe.

## Background & Context

The dashboard exists to make data exploration beautiful and accessible. It is not a monitoring tool — it does not alert, track, or report. It is a contemplative tool: you look at the ocean today, you see it in historical context, you understand what creative material it offers. The editorial spread for each source bridges data understanding and artistic inspiration.

## Goals

- Show today's ocean data for all active sources as a full-bleed spatial heatmap
- Enable 41-year historical exploration via a timeline scrubber
- Present each source with an editorial spread that reads like a magazine page
- Enable region selection that passes lat/lon bounds directly to the recipe editor

## Non-Goals

- Alerts, monitoring, or operational data products — the dashboard is exploratory, not operational
- User accounts or saved views — the dashboard is stateless in Phase 1
- All 15 sources active in Phase 1 — only SST (OISST) active; source switching UI present but other sources disabled

## User Stories

- *As a user, I can open the dashboard and immediately see today's North Atlantic sea surface temperature rendered as a full-bleed heatmap.*
- *As a user, I can scrub through 41 years of SST data to understand how the ocean has changed.*
- *As a user, I can draw a bounding box on the map and open the recipe editor with my selected region pre-loaded.*
- *As a user, I can read the SST editorial spread and understand what creative potential this source offers.*

## Functional Requirements

### FR1: Main view

- **FR1.1**: Full-bleed spatial heatmap of today's data for the active source, rendered via deck.gl BitmapLayer from `data/processed/{source}/{date}.png`
- **FR1.2**: Source rail along the top switches the active dataset (Phase 1: SST only active)
- **FR1.3**: Hover over the map reveals lat/lon coordinates and the exact data value, loaded from `data/processed/{source}/{date}.json`
- **FR1.4**: Stats overlay shows region mean, region max, and anomaly floating over the map

### FR2: Timeline scrubber

- **FR2.1**: Full-width scrubber below the map spanning the source's available history (OISST: 1981–today)
- **FR2.2**: Clicking or dragging the scrubber loads that date's processed data — map and stats update
- **FR2.3**: Mini time series chart shows regional mean per month for the full record, read from `data/processed/{source}/timeseries.json`

### FR3: Editorial spreads

- **FR3.1**: Each source has a dedicated editorial spread accessible from the source rail
- **FR3.2**: SST editorial spread: thermal heatmap hero, 14.2°C at display scale (72px), +1.4° anomaly, 41-year trend chart, art potential section
- **FR3.3**: Sea level editorial spread: 30-year rise curve as full-width hero, +20.4cm total rise, acceleration chart, sources of rise breakdown
- **FR3.4**: Each spread reads like a magazine page — no chart borders, numbers at display scale, editorial voice in copy

### FR4: Region selector

- **FR4.1**: "Select region" mode lets the user draw a bounding box on the map
- **FR4.2**: The lat/lon bounds of the selected region pass directly to the recipe editor as URL params
- **FR4.3**: Transition to the recipe editor is immediate — the same region is visible in the live preview

### FR5: Data serving

- **FR5.1**: All data served as static files from `data/processed/` — no API server
- **FR5.2**: PNG tile loads first (fast path); JSON array loads asynchronously for hover
- **FR5.3**: Meta sidecar loads first for stats panel; full array loads after

## Success Metrics

- Dashboard heatmap visible within 1 second of page load
- Hover value lookup returns correct result for any point on the map
- Timeline scrubber responds within 500ms of click

## Dependencies

- PRD-001: Data ingestion pipeline (produces the processed data the dashboard reads)
- PRD-002: Data processing step (defines the format of processed files)

## Release Checklist

- [ ] SST heatmap loading correctly from data/processed/
- [ ] Hover showing correct values from JSON array
- [ ] Timeline scrubber working for full 1981–today range
- [ ] SST editorial spread complete with all chart elements
- [ ] Region selector passing lat/lon to recipe editor correctly
