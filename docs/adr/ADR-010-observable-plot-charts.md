# ADR-010: Observable Plot for Time Series and Analytical Charts

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-005-dashboard-data-explorer.md`

## Context & Problem Statement

The dashboard editorial spreads require time series charts (41-year SST anomaly trend, 30-year sea level rise curve), bar charts (10-year anomaly bars, acceleration chart), and area fills. These must match the editorial design — no chart borders, floating on dark canvas, data-first presentation.

## Decision

Use Observable Plot for all time series, trend charts, anomaly bars, and analytical charts in the dashboard.

## Rationale

Observable Plot is Mike Bostock's successor to D3 for analytical visualisation. It provides 90% of D3's power in 10% of the code via a clean declarative API. SVG output prints and scales cleanly. The chart design philosophy (minimal chrome, data-forward) matches OceanCanvas's editorial approach — Plot charts look like editorial infographics by default, not SaaS dashboard widgets.

## Alternatives Considered

1. **Raw D3.js**
   - **Pros**: Maximum control, identical capability
   - **Cons**: Significantly more code for the same output. Observable Plot is built on D3 — reach for raw D3 only if Plot genuinely cannot do something specific.
   - **Why Rejected**: Observable Plot covers all required chart types with less code.

2. **Chart.js**
   - **Why Rejected**: Consumer-app aesthetics that conflict with OceanCanvas's editorial design system.

3. **Recharts / Victory**
   - **Why Rejected**: React-specific wrappers with default aesthetics requiring significant override effort.

## Consequences

**Positive:**
- Declarative API reduces chart code significantly
- SVG output — charts scale at all resolutions and are accessible
- Natural editorial aesthetic alignment

## Implementation Notes

Observable Plot renders into a `useRef` element. Chart data from `data/processed/{source}/timeseries.json` (regional mean per month for the full record).
