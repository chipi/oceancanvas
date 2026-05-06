# ADR-029 — Compose sidecar services for recipe save and video export

> **Status** · Accepted
> **Date** · May 2026
> **TA anchor** · components/service-layer · components/web-frontend · stack
> **Related** · [ADR-011](ADR-011-docker-compose.md) (Docker Compose deployment) · [ADR-012](ADR-012-caddy-static-server.md) (Caddy)

## Context

[ADR-011](ADR-011-docker-compose.md) records the original four-service Compose stack: `postgres`, `prefect-server`, `pipeline`, and `gallery`. The Recipe Editor and Video Editor need small, state-changing HTTP endpoints: persisting edited recipe YAML to disk, and invoking the pipeline’s export path to assemble MP4s. Those concerns do not belong inside the static gallery container’s core responsibility (serving the React build and proxied assets).

## Decision

Add two dedicated Node.js 20 sidecar services in `compose/docker-compose.yml`:

- **`recipe-server`** — listens on port 3001; `POST /api/recipes/{slug}` writes YAML under `recipes/`. The `gallery` service’s Caddy reverse-proxies `/api/recipes` to this container.
- **`export-server`** — listens on port 3002; triggers `oceancanvas export-video` (or equivalent) for timelapse export, with access to `renders/` and read-only `audio/`.

Together with the four services above, the **production Compose stack is six services**. ADR-011 remains the record of “Compose is the deployment model”; this ADR records the **service count and sidecar pattern** that evolved after that decision.

## Rationale

- Keeps Caddy’s role clear: static files plus narrow reverse-proxy to known upstreams.
- Sidecars stay tiny (single-purpose scripts under `gallery/server/`), rebuild independently of the pipeline image, and mount only the volumes they need.
- Preserves **ADR-005** (no application database): Postgres remains Prefect-only; recipe state stays file-based YAML on disk.

## Alternatives considered

- **Embed save/export inside the pipeline container** — couples authoring UX to the batch worker image and complicates permissions on `recipes/` and `renders/`.
- **Browser-only writes to disk** — impossible in a static deployment without an unsafe generic upload server.
- **Third-party object store for recipes** — violates file-based v1 storage and self-hostable defaults.

## Consequences

**Positive:**

- Recipe authoring and export work through the same `docker compose up` story as the rest of the stack.
- Clear separation between read-mostly gallery assets and write endpoints.

**Negative:**

- Operators must expose / health-check two extra ports (3001, 3002) on the host when debugging.
- Documentation must always list **six** services, not four.

## Implementation notes

- [`compose/docker-compose.yml`](../../compose/docker-compose.yml) — `recipe-server` and `export-server` service definitions; `gallery` `depends_on` includes `recipe-server`.
- [`gallery/Caddyfile`](../../gallery/Caddyfile) — `/api/recipes` proxy to recipe-server.
- [`gallery/server/save-recipe.mjs`](../../gallery/server/save-recipe.mjs), [`gallery/server/export-video.mjs`](../../gallery/server/export-video.mjs).
