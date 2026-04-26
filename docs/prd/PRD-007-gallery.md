# PRD-007: Gallery

- **Status**: Draft
- **Related RFCs**: none
- **Related ADRs**: `docs/adr/ADR-006-static-file-serving.md`, `docs/adr/ADR-013-cloudflare-r2-image-serving.md`, `docs/adr/ADR-015-editorial-design-philosophy.md`
- **Related UXS**: `docs/uxs/UXS-003-gallery.md`
- **Source**: OC-02 Section 4 (Surface 3), OC-04 Gallery

## Summary

The gallery is the public face of OceanCanvas — a living art gallery that changes every day when the pipeline runs. Not a grid of thumbnails. A curated collection of named art pieces, each updated automatically with fresh ocean data. The gallery never needs to be manually updated; the pipeline runs, manifest.json is rebuilt, and the gallery reflects today's renders.

## Background & Context

The gallery is what the public sees. Everything else — dashboard, recipe editor, video editor — is the creative infrastructure. The gallery is the output. It needs to feel as editorial and intentional as the rest of the product.

## Goals

- Present today's renders as a living art gallery with editorial quality
- Show the temporal depth of each recipe via the 14-day strip
- Enable discovery across all active recipes via the source-filtered grid
- Update automatically every day when the pipeline runs — no manual curation

## Non-Goals

- User accounts or favourites — Phase 1 gallery is read-only
- Public recipe submission — self-hosted only in Phase 1
- Comments or social features — deferred

## User Stories

- *As a visitor, I can open the gallery and immediately see today's ocean rendered as art — without knowing anything about the data behind it.*
- *As a visitor, I can see the 14-day strip and understand how a single recipe evolves over two weeks.*
- *As a visitor, I can click "timelapse ↗" and open the video editor pre-loaded with that recipe.*

## Functional Requirements

### FR1: Hero

- **FR1.1**: The featured recipe's latest render at full bleed — full width of the page
- **FR1.2**: Recipe name, render type, date, and key statistic float over the image
- **FR1.3**: Actions: timelapse ↗ · recipe ↗ · download
- **FR1.4**: Featured recipe configured in manifest.json — defaults to the most recently created recipe

### FR2: 14-day strip

- **FR2.1**: The same recipe's last 14 renders shown as thumbnails below the hero
- **FR2.2**: Each thumbnail is clickable — opens that render full-screen with metadata
- **FR2.3**: Dates shown below each thumbnail

### FR3: All-recipes grid

- **FR3.1**: Every active recipe rendered today, in a 3-column grid
- **FR3.2**: Recipe name and render type shown on hover
- **FR3.3**: Source type filters in the nav (all · SST · salinity · sea level · ice · chlorophyll) filter the grid

### FR4: Data serving

- **FR4.1**: Gallery reads manifest.json once on load to determine all available renders
- **FR4.2**: Individual PNGs requested as the user scrolls — not preloaded
- **FR4.3**: Phase 1: renders served from local `renders/` via Caddy; production: Cloudflare R2

### FR5: Full-screen render view

- **FR5.1**: Clicking any render opens it full-screen with: recipe name, sources, region, date, render parameters, anomaly stats
- **FR5.2**: Timelapse ↗ and recipe editor ↗ links available from full-screen view

## Success Metrics

- Gallery loads and displays today's hero render within 2 seconds
- 14-day strip shows correct renders in correct date order
- Source type filters correctly hide/show recipes

## Dependencies

- PRD-001: Data ingestion pipeline (produces the renders the gallery shows)
- PRD-003: Recipe system (defines recipe names and metadata)

## Release Checklist

- [ ] Hero showing today's featured render correctly
- [ ] 14-day strip showing correct renders
- [ ] All-recipes grid showing all active recipe renders
- [ ] Source type filter working for SST
- [ ] Timelapse ↗ and recipe ↗ links working correctly
- [ ] manifest.json read correctly on load
