# ADR-011 — Docker Compose deployment

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/service-layer · §stack · §constraints (self-hostable)

## Context

OceanCanvas runs as a service: scheduled pipeline, a static web frontend, the Prefect server. The stack must be the same on the developer's laptop, on a VPS, and on a self-hoster's machine. Multiple options exist (Kubernetes, plain systemd, custom shell scripts), each with different trade-offs.

## Decision

Docker Compose is the deployment model. One `docker-compose.yml` defines the full stack: `pipeline`, `gallery`, `prefect-server` containers. Volumes mount `data/`, `recipes/`, `renders/` from the host. The same compose file runs in development, on VPS, and on self-hosting installations — only the host changes.

## Rationale

- *Self-hostable* — `git clone && docker compose up` is the spell. No service dependencies, no credentials to set up, no orchestrator to install. Anyone with Docker can run the system.
- *Portable* — laptop and VPS run identical stacks. Tested locally is tested in production (in terms of stack composition).
- *Simple* — three containers. No service mesh. No load balancer. Compose is sized exactly for this.

## Alternatives considered

- **Kubernetes** — over-engineered for three containers running on one machine. The operational overhead of Kubernetes is more than the value at this scale. Revisit when (if) OceanCanvas multi-tenants.
- **Plain systemd / docker run scripts** — works, but `docker-compose.yml` is more declarative and self-documenting than a collection of shell scripts.
- **Nomad** — capable but adds an orchestrator most contributors don't know.
- **Fly.io / Railway / managed PaaS** — works for hosted instances but breaks the self-hostable property.

## Consequences

**Positive:**
- Self-hosting documentation collapses to "install Docker, run `docker compose up`."
- Local development matches production behaviour exactly.
- Stack is declarative and version-controlled in the repo.

**Negative:**
- Compose's networking model is simpler than Kubernetes — multi-host scaling would require something else.
- No built-in secret management beyond env files. Acceptable; v1 has no secrets to manage (no auth-required sources).

## Implementation notes

- `docker-compose.yml` in repo root.
- Three services: `pipeline`, `gallery`, `prefect-server`.
- Volumes: `./data`, `./recipes`, `./renders`.
- Production uses the same file with environment-specific overrides via `docker-compose.prod.yml`.
- Nginx (or Caddy directly, see ADR-012) in front of the gallery for HTTPS in production.
