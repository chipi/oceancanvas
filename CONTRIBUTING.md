# Contributing to OceanCanvas

OceanCanvas treats the ocean's data with editorial dignity. Contributing is welcome — the contribution itself should match that dignity. This document explains how.

## What you'd be contributing to

OceanCanvas is a daily generative-art system. A pipeline runs at 06:00 UTC, fetches today's ocean data, and renders it through authored recipes. The output is a self-walking gallery. Phase 1 is single-author and self-hostable; Phase 2 will add public hosting.

Three kinds of contribution land naturally:

1. **Recipes.** A new YAML file in `recipes/` is a new piece. Every author who makes a recipe extends the work. See [`recipes/README.md`](recipes/README.md) for the field-by-field guide.
2. **Code.** Bug fixes, new render types, new audio engines, pipeline robustness, performance, accessibility. The locked stack is in [`OC_TA.md`](docs/adr/OC_TA.md) §stack — don't propose alternatives in a PR; if a stack change is genuinely needed, write an RFC.
3. **Docs.** OceanCanvas's documentation is part of the work, not an afterthought. Tightening the prose, fixing examples, adding a missing reference — equally welcome.

What's *not* welcome at this phase:

- Adding engagement metrics (view counts, likes, streaks). [`OC_PA.md` §principles](docs/prd/OC_PA.md) names `no-engagement-chrome`. Hard rule.
- Cloud-only services in the critical path. The project is self-hostable end-to-end.
- New dependencies without an ADR. Even small ones — see "The doc system" below.
- Authentication / accounts. Phase 1 is open by default.

---

## Before you start

1. **Read** [`README.md`](README.md) and [`docs/concept/`](docs/concept/) (six short documents — about 90 minutes total). They establish the *why*.
2. **Skim** [`OC_TA.md`](docs/adr/OC_TA.md) §constraints — there are seven non-negotiables. Code that violates one is broken even if it works.
3. **Skim** [`CLAUDE.md`](CLAUDE.md) — the project's working conventions. Stack, code style, doc rules. Written for AI-assisted work but reads cleanly for humans.

If you're unsure whether your change fits, open an issue describing what you want to do *before* writing code. The maintainer reads them.

---

## The doc system

This is the part that's most different from other projects, and most important.

OceanCanvas has a tiered documentation system that mirrors how decisions actually move through software:

- **Concept package** (`docs/concept/`, OC-00 through OC-05) — the *why*. Updated rarely.
- **PRDs** (`docs/prd/`) — user-value arguments per surface. Magazine-lede prose. Read before working on a customer-facing change.
- **UXSes** (`docs/uxs/`) — visual contracts per surface. The static appearance is specified here.
- **RFCs** (`docs/rfc/`) — open technical questions with alternatives and trade-offs.
- **ADRs** (`docs/adr/`) — locked technical decisions. Append-only — superseded by new ADRs, never edited in place.

When code requires a doc update, the rule is firm: **update both in the same commit if at all possible.** When an RFC closes into an ADR, six places update together (per [CLAUDE.md § Cross-doc consistency rule](CLAUDE.md)). Forget any of them and silent drift starts.

| If your change is… | …it needs… |
|---|---|
| Bug fix to existing code | No doc update beyond the commit message |
| New customer-facing feature | A PRD (or update to an existing one) before the code |
| New surface or major surface change | UXS update + `OC_IA.md` table update |
| New tech decision | An ADR (append-only). Update `OC_TA.md` §map and §stack if relevant. |
| Open technical question | An RFC. Closes into an ADR when implementation forces the decision. |
| New shared design token | Add to `OC_IA.md` §shared-tokens. Don't define it locally. |

Templates live in each folder (`PRD_TEMPLATE.md`, `UXS_TEMPLATE.md`, `RFC_TEMPLATE.md`, `ADR_TEMPLATE.md`). Read the "Notes on writing…" sections at the bottom before you start.

---

## Code conventions

Quick reference. Full details in [`CLAUDE.md`](CLAUDE.md).

### Python (pipeline)

- Python 3.12; type hints on every function signature
- `ruff format`; `ruff check`
- File I/O via `pathlib.Path`, never string concatenation
- Logging via `oceancanvas.log.get_logger()`, never `print`
- Tests in `pipeline/tests/` mirroring package structure; pytest

### TypeScript / React (gallery)

- React 18 + Vite + TypeScript
- `prettier` + `eslint`
- CSS modules; design tokens from `gallery/src/tokens.css`
- PascalCase component files; kebab-case routes
- Local component state + URL state via React Router. No Redux / Zustand in Phase 1.
- Tests via Vitest + React Testing Library

### Node.js (renderer + servers)

- Node 20; ES modules
- `prettier`; `eslint`

### YAML (recipes)

- Schema per [RFC-001](docs/rfc/RFC-001-recipe-yaml-schema.md) v0.2 — flat with the `# ⊓ creative controls ⊓` marker
- Filenames are kebab-case slugs matching the recipe `name`
- Validation via `recipe-schema.json` runs in pipeline Task 01

### Commit messages

Conventional commits:

- `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Scope encouraged: `feat(pipeline): add discover task for OISST`
- Body explains the *why*, not the *what*. The diff is the what.
- Reference the ADR/RFC/PRD: `Closes RFC-001 → ADR-NNN` or `Implements PRD-002 §"The experience"`

---

## Testing

Three tiers, each validating different boundaries (per [CLAUDE.md § Testing strategy](CLAUDE.md)):

```bash
# Unit
cd pipeline && uv run pytest tests/unit/
cd gallery  && npm test

# Cross-validation (TS↔Py parity for shared logic)
# Run alongside unit tests; both load from tests/cross-validation/*.json

# End-to-end (Docker Compose stack against fixture data)
docker compose -f docker-compose.test.yml up --build
```

Every PR should land green. The CI gate per [ADR-014](docs/adr/ADR-014-synthetic-e2e-gate.md) is the e2e against synthetic data — production data isn't fetched in CI.

---

## Branches and PRs

- Trunk-based: `main` is always deployable.
- Short-lived feature branches: `feat/recipe-yaml-parser`, `fix/process-task-shape-mismatch`. Squash on merge.
- No long-lived `dev` / `staging` branches in Phase 1.
- PRs reference the relevant PRD/RFC/ADR in the body. The PR template asks for it.

---

## Voice

The documentation is editorial — present-tense, declarative, slightly literary. No SaaS-speak. No "the user shall." No apologetic preamble.

In code comments and commit messages the voice can be more functional, but the same principles apply: present-tense, specific, declarative. *Discovers latest OISST date via ERDDAP* — not *This function will be responsible for…*

If a sentence in a doc could appear in any tech company's docs, rewrite it.

---

## Reporting bugs / requesting features

GitHub issues. Templates ask for what you'd expect — what happened, what you expected, the failing command, OS, version. The maintainer reads them.

---

## License

OceanCanvas is [MIT-licensed](LICENSE). By contributing you agree that your contributions are licensed under the same terms.

---

## In doubt

Three default moves when you're unsure how to proceed:

1. **Re-read the PRD or RFC the work serves.** If the work doesn't serve any PRD or RFC, ask whether the work should happen at all in Phase 1.
2. **Check `OC_TA.md` §constraints.** If the work would violate a constraint, stop. The constraint is intentional; it has its own ADR.
3. **Look for a similar existing artifact.** All five PRDs follow the same template; all ADRs the same structure. The precedent likely exists.

If none of those resolve the question, write an RFC. Open questions are a normal state — captured in writing they make decisions explicit; left in your head they leak into code as inconsistency.

Welcome aboard.
