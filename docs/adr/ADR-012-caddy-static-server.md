# ADR-012 — Caddy as static file server

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/service-layer · §stack

## Context

The web frontend (Dashboard, Recipe Editor, Gallery, Video Editor) is a static React build. It needs serving over HTTP, with HTTPS in production. The pipeline produces files (renders, processed data) that the frontend reads as static assets.

We need a static file server that handles HTTPS automatically in production, is light enough for a single container, and configurable enough to serve the right paths.

## Decision

Use Caddy as the static file server inside the `gallery` container. Caddy serves the built React app, the `renders/` directory, and the `data/processed/` directory. In production, Caddy handles HTTPS automatically via Let's Encrypt.

## Rationale

- *Automatic HTTPS* — Caddy provisions and renews Let's Encrypt certificates with one config line. For self-hosters running on a VPS, HTTPS works out of the box.
- *Simple config* — Caddy's Caddyfile syntax is minimal. A complete config for OceanCanvas is around 20 lines.
- *Single binary* — Caddy is one Go binary. The container is tiny.
- *Static-file-friendly* — Caddy's defaults around caching, compression, and CORS are sensible for a static-asset workload.

## Alternatives considered

- **Nginx** — capable, but the config language is more complex than needed and HTTPS provisioning requires separate certbot integration. Caddy collapses both into one tool.
- **Traefik** — designed primarily for service routing in container orchestrators. Overshoots the simple static-serving use case.
- **A custom Express/Koa server** — more code than necessary for static serving.

## Consequences

**Positive:**
- HTTPS works automatically in production without separate certbot setup.
- Self-hosters get HTTPS with one line of Caddyfile.
- Single binary, small image, minimal attack surface.

**Negative:**
- Less ubiquitous than nginx — some operators are less familiar. Caddyfile syntax is simple enough that this is a small cost.

## Implementation notes

- `gallery/Caddyfile` defines the routing.
- Routes:
  - `/` → built React app from `gallery/dist/`
  - `/renders/*` → `renders/` directory
  - `/data/processed/*` → `data/processed/` directory
  - `/manifest.json` → repo root manifest
- HTTPS in production requires a public domain and ports 80/443 open.
