# Compose Files

OceanCanvas keeps all Docker Compose definitions in this folder.

## Files

- `docker-compose.yml` — production/full local stack (Prefect, pipeline, gallery, sidecars)
- `docker-compose.test.yml` — synthetic-data e2e stack (pipeline test mode + gallery + Playwright)
- `docker-compose.dev.yml` — optional dev overrides

## Common Commands

- Start full stack: `docker compose -f compose/docker-compose.yml up -d`
- Stop full stack: `docker compose -f compose/docker-compose.yml down`
- Run e2e stack: `docker compose -f compose/docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from e2e`
- Tear down e2e stack: `docker compose -f compose/docker-compose.test.yml down -v`

## Notes

- Compose paths in these files are relative to this folder, so repo mounts use `../...`.
- The project tracks `.env` in repo root; run compose from root (or use the commands above) so env lookup is consistent.
