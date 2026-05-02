# CLAUDE.md

> Conventions for AI-assisted work on OceanCanvas. Read this first.

OceanCanvas is generative ocean art that the data performs daily. A pipeline runs at 06:00 UTC, fetches today's ocean data, and renders it through authored recipes. The output is a gallery that walks itself forward without curation.

This file is the orientation document for any AI assistant working on the codebase. It is read at the start of every session. The code conventions here are firm; the doc-system conventions match the structure under `docs/`.

---

## Where things live

**Concept package (`docs/concept/`).** OC-00 through OC-05 — the founding narrative documents (`00-package-introduction.md` through `05-design-system.md`). Read once or twice; rarely updated. The `why`.

**Definition tree (`docs/`).**

- `docs/prd/` — Product. `OC_PA.md` is the reference doc (audiences, promises, principles). `PRD-NNN-name.md` files argue for individual experiences in blog-post format. Template at `docs/prd/PRD_TEMPLATE.md`.
- `docs/uxs/` — UX. `OC_IA.md` is the reference doc (surfaces, navigation, shared tokens). `UXS-NNN-name.md` files specify per-surface visual contracts. Template at `docs/uxs/UXS_TEMPLATE.md`.
- `docs/rfc/` — Tech, moving tier. Open technical questions with alternatives and trade-offs. Closes into ADRs.
- `docs/adr/` — Tech, settled tier. `OC_TA.md` is the reference doc (components, contracts, constraints, stack, state map). `ADR-NNN-name.md` files lock individual decisions. Append-only — superseded by new ADRs, never edited in place.

**Code.**

- `pipeline/` — Python 3.12 + Prefect + dlt + xarray. Six tasks: discover, fetch, process, build payload, render, index. CLI via `oceancanvas` console script (typer).
- `gallery/` — React + Vite. deck.gl + MapLibre + Observable Plot. Static build served by Caddy. `gallery/server/` has the Node.js recipe save endpoint.
- `sketches/` — p5.js sketch files (shared.js, field.js, particles.js, scatter.js). Mounted into both pipeline and gallery containers.
- `recipes/` — YAML files; the authored works.
- `data/` — Three-layer store. `data/sources/` (raw), `data/processed/` (browser-friendly), not committed to git.
- `renders/` — Daily PNG outputs per recipe. Not committed to git.
- `docker-compose.yml` — Five containers: pipeline, gallery, prefect-server, postgres (Prefect state DB), recipe-server (Node.js save endpoint).

---

## The locked stack

These are decided. Don't propose alternatives in code review or refactors. If a change feels needed, write an RFC and propose it there — never change the stack silently in a PR.

| Concern | Choice | ADR |
|---|---|---|
| Orchestration | Prefect | ADR-001 |
| REST/JSON ingestion | dlt | ADR-002 |
| NetCDF ingestion | xarray + requests | ADR-003 |
| Data storage | Three-layer file-based | ADR-004 |
| Database | None in v1 (SQLite permitted if manifest grows) | ADR-005 |
| Sketch language | p5.js | ADR-006 |
| Server-side renderer | Puppeteer + headless Chromium | ADR-007 |
| Render payload | Single shared format (preview = pipeline) | ADR-008 |
| Browser spatial rendering | deck.gl + MapLibre GL | ADR-009 |
| Browser charts | Observable Plot | ADR-010 |
| Deployment | Docker Compose | ADR-011 |
| Static file server | Caddy | ADR-012 |
| CI | GitHub Actions, code-only | ADR-013 |
| CI gate | Synthetic-data e2e test | ADR-014 |
| Processed JSON | Multi-band as separate files | ADR-015 |
| Recipe authorship | Single-author in Phase 1 | ADR-016 |
| Editorial layout | One per source | ADR-017 |

Full reference with rationale: `docs/adr/OC_TA.md` §stack.

---

## The non-negotiable constraints

These hold across every PR. Code that violates one of these is broken even if it works.

**File-based storage in v1.** No database. YAML for recipes, JSON for state, PNG for renders. The system is `git clone` + `docker compose up`-able with no service dependencies.

**Deterministic rendering.** Same recipe + same source data + same date = same render. Always. No unset random seeds. No clock-dependent code paths in render logic. Re-running produces byte-identical PNGs.

**Daily cadence is sacred.** The pipeline runs once at 06:00 UTC. Manual renders are the exception. Anything that requires the pipeline to run more often than daily needs an ADR first.

**No-auth sources only in Phase 1.** No source requiring API keys ships in v1. If the next source needs auth, that's an ADR upgrading from `open-by-default`, not a drift slipped into a PR.

**Self-hostable end-to-end.** Anyone with Docker can clone the repo and run the full stack. No cloud-only services in the critical path.

**Shared payload format.** The Recipe Editor's live preview runs the same p5.js sketch with the same payload format that the Puppeteer pipeline renders with. If the editor preview looks right, the pipeline render looks right. Divergence is a bug.

**Attribution baked in.** Source attribution is part of every render. Removing it requires deliberate code change; including it is the default.

Full reference with rationale: `docs/adr/OC_TA.md` §constraints.

---

## Code conventions

### Python (pipeline)

- Python 3.12. Type hints on every function signature.
- Format: `ruff format`. Lint: `ruff check`.
- `pyproject.toml` for dependencies. No `requirements.txt`.
- Prefect task functions are decorated with `@task`; flow functions with `@flow`. Task names match the canonical six: `discover`, `fetch`, `process`, `build_payload`, `render`, `index`.
- File I/O always via `pathlib.Path`, never string concatenation.
- Logging via `oceancanvas.log.get_logger()` — returns Prefect's `get_run_logger()` inside a flow/task context, falls back to stdlib `logging` in tests and standalone scripts. No `print` in pipeline code.
- Tests in `tests/` mirroring the package structure. Pytest. Each pipeline task has a unit test against synthetic data.

### Node.js (renderer)

- Node 20. ES modules (`"type": "module"` in package.json).
- Format: `prettier`. Lint: `eslint`.
- Puppeteer launches headless Chromium with `--no-sandbox` (Docker context is trusted).
- Renderer subprocess pattern: parent Python process spawns Node, streams payload via stdin, receives PNG bytes via stdout, errors via stderr.
- Sketch files live in `sketches/{render_type}.js` at the repo root. One file per render type. Mounted at `/sketches` in Docker.

### React (frontend)

- React 18, Vite, TypeScript.
- Format: `prettier`. Lint: `eslint`.
- State management: nothing global yet. Component state + URL state via React Router. No Redux, no Zustand in Phase 1 — add only when an ADR justifies it.
- Styling: CSS modules. Design tokens from UXS docs as CSS custom properties in a single `tokens.css` file at `gallery/src/tokens.css`.
- Component naming: PascalCase files, kebab-case routes.
- Tests: Vitest + React Testing Library. Visual regression via Playwright (deferred until first surface ships).

### YAML (recipes)

- Schema follows RFC-001 v0.2 — flat, with comment-marker (`# ⊓ creative controls ⊓`) delimiting structural fields above from creative state + derived params below.
- Validation runs in pipeline Task 01 (discover) before any fetching happens.
- Filenames are kebab-case slugs that match the recipe `name`. Slug is filesystem-safe and stable.

### Commits

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Scope optional but encouraged: `feat(pipeline): add discover task for OISST`.
- Body explains the *why*, not the *what*. The diff is the what.
- Reference the ADR/RFC/PRD that the commit serves: `Closes RFC-001 → ADR-NNN` or `Implements PRD-002 §"The experience"`.

### Branches

- Trunk-based: `main` is always deployable.
- Feature work in short-lived branches named `feat/recipe-yaml-parser`, `fix/process-task-shape-mismatch`. Merge via PR, squash on merge.
- No long-lived dev/staging branches in Phase 1.

### Testing strategy

Three tiers, each validating different boundaries:

**Tier 1 — Unit tests** (`pipeline/tests/unit/`, `gallery/src/**/*.test.ts`). Test individual functions in isolation. Mock external dependencies (fetch, subprocess, filesystem). Fastest feedback loop. Run via `uv run pytest` and `npm test`.

**Tier 2 — Cross-validation** (`tests/cross-validation/`). Shared JSON fixtures validated independently by Python and TypeScript. Confirms implementations that must be identical (creative mapping) produce the same outputs.

**Tier 3 — End-to-end** (`e2e/tests/`). Playwright tests against the full Docker Compose stack (`docker-compose.test.yml`). Pipeline runs in test mode on fixture data, gallery serves the output, e2e tests validate the complete pipeline→gallery data flow. Tests assert on data correctness (manifest content, PNG loads, API responses), not just DOM presence.

Key boundary: the e2e tests validate that pipeline output (renders, manifest) is correctly served by Caddy and consumed by the React gallery. Unit tests cannot cover this boundary.

---

## Doc-system rules

The mechanics of how PRDs / RFCs / ADRs / UXSes interact, in operational form.

### When code requires a documentation update

- **New surface or major surface change** → update `docs/uxs/OC_IA.md` first, then add or revise the relevant UXS.
- **New shared design token** → add to `OC_IA.md §shared-tokens`. Don't define it locally in a UXS or hardcode it in a component.
- **New tech decision (single, settled)** → write an ADR. Append-only. Update `OC_TA.md §map` and `OC_TA.md §stack` if relevant.
- **Open technical question with alternatives** → write an RFC. Closes into an ADR when the decision is forced by implementation reality.
- **New audience or new product promise** → update `OC_PA.md`. Existing PRDs that should reference it get cross-linked.
- **New user-facing experience** → write a PRD in blog-post format using the template.

### Cross-doc consistency rule

When you change one doc, ask which other docs read from it. Six places update together when an RFC closes into an ADR:

1. New ADR file in `docs/adr/`
2. RFC status flips to Decided
3. `OC_TA.md §map` RFC table row flips
4. `OC_TA.md §map` ADR table gains the row
5. `OC_TA.md §stack` updates if stack-affecting
6. `rfc/index.md` and `adr/index.md` mirror

Forget any of these and silent drift starts. The fix is cheap when caught early, painful when not.

### What goes where

| Question | Where |
|---|---|
| What user value does this feature serve? | PRD |
| What audiences/promises does this affect? | PA → PRD anchors |
| What's the static visual contract for surface X? | UXS |
| What surfaces exist and how do they connect? | IA |
| What's the open technical question? | RFC |
| What technical decision is locked? | ADR |
| What components, contracts, constraints govern the system? | TA |
| What's the current architecture state board? | TA §map |

If a piece of writing doesn't fit any of those, it probably doesn't belong in `docs/`.

---

## Voice

The documentation is editorial — present-tense, declarative, slightly literary. No SaaS-speak. No "the user shall." No apologetic preamble.

In code comments and commit messages, the voice can be more functional, but the same principles apply: present-tense, specific, declarative. "Discovers latest OISST date via ERDDAP" — not "This function will be responsible for…"

Code identifiers (variables, functions, classes) follow standard language conventions — Pythonic for Python, camelCase for JS, etc. Don't try to make code itself sound editorial.

---

## What to do, what not to do

### Do

- Read `docs/adr/OC_TA.md` and `docs/prd/OC_PA.md` at the start of any non-trivial session. They are the structural foundation.
- Reference the relevant PRD section when implementing a surface ("PRD-002 §The experience" describes the dashboard interaction this commit implements).
- Honour the constraints — file-based storage, determinism, daily cadence, no auth, self-hostable, shared payload, baked attribution.
- Write tests against synthetic data, not live data. The CI gate (ADR-014) requires this.
- Update `docs/` when changing the system's structure, contracts, or surfaces. Same commit if possible.
- Use the templates: `PRD_TEMPLATE.md`, `UXS_TEMPLATE.md`, `RFC_TEMPLATE.md`, `ADR_TEMPLATE.md`.

### Don't

- Don't introduce a new dependency without an ADR. Even small ones. The locked stack is locked for reasons captured in ADRs.
- Don't add a database. ADR-005 says no database in v1 unless the manifest grows enough to need SQLite. "It would be cleaner with Postgres" is not a v1 argument.
- Don't add authentication. ADR-016 + the no-auth constraint together mean Phase 1 is open by default.
- Don't add cloud-only services to the critical path. Cloudflare R2 is permitted as Phase 2 enhancement, optional even when added.
- Don't reproduce content from other docs. Link, don't copy. PA's audiences live in PA — PRDs reference them.
- Don't edit ADRs after acceptance. Append a new ADR that supersedes; mark the old one Superseded with a forward link.
- Don't write a PRD for infrastructure work. Pipelines, data formats, render mechanics — those are RFCs and ADRs. PRDs argue for user-value experiences.
- Don't close an RFC into an ADR before implementation forces the decision. Closing prematurely commits to a schema before the parser meets its first edge case.
- Don't introduce engagement metrics. PA §principles names `no-engagement-chrome`. No view counts, no likes, no streaks, no virality features.
- Don't add behavioural rules to a UXS. Animation timing, debounce, transitions, keyboard sequences — those go in an RFC. UXS specifies static appearance only.

---

## When in doubt

Three default moves when you're unsure how to proceed:

1. **Re-read the PRD or RFC the work serves.** If the work doesn't serve any PRD or RFC, ask whether the work should happen at all in Phase 1.
2. **Check `OC_TA.md §constraints`.** If the work would violate a constraint, stop. The constraint is intentional; it has its own ADR.
3. **Look for a similar existing artifact.** All five PRDs are in template shape. All ADRs follow the same structure. If you're writing something new, the precedent likely exists.

If none of those resolve the question, write an RFC. Open questions are a normal state — captured in writing, they make decisions explicit; left in your head, they leak into code as inconsistency.

---

## Phase 1 scope

Phase 1 ships:

- One pipeline running daily at 06:00 UTC.
- One source live (NOAA OISST sea surface temperature).
- A small number of authored recipes (likely 3–5).
- The four customer-facing surfaces: Dashboard, Recipe Editor, Gallery, Video Editor.
- Self-hosted via Docker Compose.

Phase 1 does not ship:

- Public hosting (Cloudflare R2, custom domain, social share cards). Phase 2.
- Multi-source dashboard beyond SST. Phase 2.
- Multi-author recipes. Deferred indefinitely (ADR-016).
- Authentication, accounts, API keys. Outside Phase 1 scope.
- Real-time alerts, monitoring, watch-lists. Not within the project's frame.

Anything outside Phase 1 scope, when it comes up, becomes a Phase 2 PRD or stays deferred. Don't quietly extend Phase 1.

---

## References

- **Concept package** — OC-00 through OC-05 in `docs/concept/`
- **Reference docs** — `docs/prd/OC_PA.md`, `docs/uxs/OC_IA.md`, `docs/adr/OC_TA.md`
- **Templates** — `PRD_TEMPLATE.md`, `UXS_TEMPLATE.md`, `RFC_TEMPLATE.md`, `ADR_TEMPLATE.md` in their respective folders
- **Implementation kickoff** — `IMPLEMENTATION.md` at the project root
