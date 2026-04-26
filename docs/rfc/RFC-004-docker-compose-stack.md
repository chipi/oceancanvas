# RFC-004: Docker Compose Stack Specification

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-001-data-ingestion-pipeline.md`
- **Related ADRs**: `docs/adr/ADR-005-docker-compose-deployment.md`, `docs/adr/ADR-006-static-file-serving.md`

## Abstract

This RFC specifies the complete Docker Compose service definitions for OceanCanvas — all three services (pipeline, gallery, prefect-server), their volume mounts, port mappings, networking, and environment variables. The compose file is the single source of truth for how the full stack runs.

## Design & Implementation

### 1. Services

```yaml
services:

  pipeline:
    build:
      context: .
      dockerfile: Dockerfile.pipeline
    volumes:
      - ./recipes:/app/recipes:ro          # read-only — edited on host
      - ./data:/app/data                   # pipeline writes
      - ./renders:/app/renders             # pipeline writes
      - ./sketches:/app/sketches:ro        # sketch templates
    environment:
      - PREFECT_API_URL=http://prefect-server:4200/api
      - PIPELINE_SCHEDULE=0 6 * * *        # 06:00 UTC daily
    depends_on:
      - prefect-server
    restart: unless-stopped

  gallery:
    build:
      context: .
      dockerfile: Dockerfile.gallery
    ports:
      - "3000:3000"
    volumes:
      - ./renders:/srv/renders:ro          # read-only — gallery reads
      - ./data/processed:/srv/data/processed:ro
    restart: unless-stopped

  prefect-server:
    image: prefecthq/prefect:2-python3.12
    command: prefect server start --host 0.0.0.0
    ports:
      - "4200:4200"
    environment:
      - PREFECT_SERVER_DATABASE_CONNECTION_URL=postgresql+asyncpg://prefect:prefect@postgres:5432/prefect
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=prefect
      - POSTGRES_PASSWORD=prefect
      - POSTGRES_DB=prefect
    volumes:
      - prefect-db:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  prefect-db:
```

### 2. Dockerfiles

**Dockerfile.pipeline** installs: Python 3.12, Node.js 20, Chromium (for Puppeteer), all Python deps (prefect, dlt, xarray, requests, pillow, scipy), all Node deps (puppeteer).

**Dockerfile.gallery** builds the React app and serves it via Caddy.

### 3. Volume mount strategy

| Volume | Mount | Mode | Notes |
|---|---|---|---|
| `./recipes` | `/app/recipes` | ro | Edited on host, read by pipeline |
| `./data` | `/app/data` | rw | Pipeline writes; not public |
| `./renders` | `/app/renders`, `/srv/renders` | rw/ro | Pipeline writes, gallery reads |
| `./data/processed` | `/srv/data/processed` | ro | Dashboard reads |
| `prefect-db` | postgres data dir | rw | Prefect state persistence |

### 4. Production differences

In production (Hetzner VPS), the compose file is identical. Additional configuration:
- Caddy configured with `Caddyfile` for HTTPS via Let's Encrypt
- `renders/` may be pushed to Cloudflare R2 instead of served locally (ADR-013)
- Environment variable `ENVIRONMENT=production` enables R2 upload in the pipeline

## Open Questions

1. Should the pipeline and gallery containers share a network or communicate via host volumes only?
2. Should GEBCO (the static bathymetry source) be baked into the pipeline Docker image to avoid a first-run download?

## References

- ADR-005: Docker Compose for deployment
- PRD-001: Data ingestion pipeline
