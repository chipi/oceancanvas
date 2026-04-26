# ADR-010 — Observable Plot for time series

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/web-frontend · §stack

## Context

The Dashboard's editorial spreads include time-series charts: the 41-year SST trend, the 30-year sea-level rise curve, anomaly bar charts by decade, sources-of-rise composition. These need to render with editorial dignity — no chart frames, full-width on dark canvas, designed to be read as magazine graphics rather than analytics.

## Decision

Use Observable Plot for all time-series and analytical charts in the Dashboard.

## Rationale

Observable Plot is Mike Bostock's successor to D3 — a declarative API on top of D3's primitives. It produces SVG output that prints beautifully and adapts to dark backgrounds without fighting the design system. Compared to D3 directly, it gives 90% of the power in 10% of the code.

The chart styling needed for OceanCanvas (no border, dark canvas, large numerals, thin axis labels) is cleanly expressible in Observable Plot. D3 directly would require writing a styling pipeline; Plot lets us focus on the data.

## Alternatives considered

- **D3.js directly** — too low-level. Most of what OceanCanvas needs from D3 is already wrapped by Observable Plot. Reach for raw D3 only if Plot genuinely cannot do something.
- **Chart.js** — consumer-app aesthetics. Hard to defeat the chrome. Cannot meet OceanCanvas's visual quality bar.
- **Plotly.js** — capable but visually busy by default. Heavier than needed.
- **Recharts (React-native)** — convenient with React but limited customisation; the dark editorial look fights against its defaults.

## Consequences

**Positive:**
- Clean declarative API; chart code is short and readable.
- SVG output renders crisp at any zoom and is screenshot-friendly for export.
- Dark-canvas styling works without theming workarounds.

**Negative:**
- Some niche chart types (violin plots, etc.) are not covered. Use Plotly.js as a fallback if needed (sparingly).
- Observable Plot is younger than D3; some features still landing.

## Implementation notes

- Chart components in `gallery/src/charts/`.
- Each editorial spread has its own chart components.
- Dark-canvas defaults applied at module level — individual charts inherit them.
