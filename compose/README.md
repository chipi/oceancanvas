# Compose Files

OceanCanvas keeps all Docker Compose definitions in this folder.

## Files

- `docker-compose.yml` — production/full local stack (Prefect, pipeline, gallery, sidecars)
- `docker-compose.test.yml` — synthetic-data e2e stack (pipeline test mode + gallery + Playwright); publishes no host ports
- `docker-compose.dev.yml` — optional dev overrides

## Common Commands

- Start full stack: `docker compose -f compose/docker-compose.yml up -d`
- Stop full stack: `docker compose -f compose/docker-compose.yml down`
- Run e2e stack: `make e2e`
- Tear down e2e stack: `docker compose -f compose/docker-compose.test.yml down -v`

## Notes

- Compose paths in these files are relative to this folder, so repo mounts use `../...`.
- Compose's project directory is this folder, so the `.env` it reads for the project name and `${…}` host ports is `compose/.env`, not the repo-root `.env`. The repo-root `.env` (tracked) only reaches the pipeline container through `env_file:`.
- Defaults: project `oceancanvas`, host ports 8080 (gallery), 4200 (Prefect UI), 3001 (recipe save), 3002 (video export). A Model-B checkout gets its own project name and ports from the generated, git-ignored `compose/.env` (see `.config/workspace/README.md`). Override one value from the shell, e.g. `OC_GALLERY_PORT=8090 make up`.
