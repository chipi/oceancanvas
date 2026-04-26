# ADR-005: Docker Compose for Deployment

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`

## Context & Problem Statement

OceanCanvas runs on the developer's hardware for development and on a VPS for production. It needs to run identically in both contexts. Self-hosters need to run the full stack with minimal setup — the self-hosting promise is: clone, edit recipes, `docker compose up`.

## Decision

Docker Compose for all deployment contexts. The same `docker-compose.yml` runs on laptop (dev) and VPS (production). Three services: `pipeline` (Python + Node.js + Chromium), `gallery` (Caddy serving React), `prefect-server` (Prefect Server + Postgres).

## Rationale

Docker Compose provides a single-command full-stack startup that works identically on any host with Docker installed. The compose file is committed to the repo — self-hosters clone, edit recipes, and run. No cloud lock-in, no managed service dependency, no per-environment configuration divergence.

## Alternatives Considered

1. **Kubernetes**
   - **Why Rejected**: Significant operational overhead for a 3-service stack. OceanCanvas needs none of what Kubernetes provides at v1.

2. **Systemd units on bare metal**
   - **Pros**: Minimal overhead, integrates with OS service management
   - **Cons**: Not portable — different setup on macOS vs Linux. Self-hosters on different distros need different instructions.
   - **Why Rejected**: Docker Compose is simpler and works across all platforms.

## Consequences

**Positive:**
- `docker compose up` starts the full stack on any host
- Development and production are identical — no environment divergence
- Self-hosting is one command after cloning

**Negative:**
- Docker required on the host machine
- Chromium inside the pipeline container adds ~400MB to the image

## Implementation Notes

`docker-compose.yml` at repo root. Volumes: `recipes/` (edited on host, read by pipeline), `data/` (pipeline writes, not public), `renders/` (pipeline writes, gallery reads). Production target: Hetzner CAX21 (4 vCPU ARM, 8GB RAM, ~€6/month).
